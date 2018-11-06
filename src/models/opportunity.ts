import Decimal from 'decimal.js'
import { Edge } from './edge'
import db from '../connectors/db'
import log from '../loggers/winston'
import { getRotated, financial } from '../utils/helpers'
import { Currency, Triangle, OrderDetails, Volume, Iterator } from '../types'
import { OrderFillTimeoutError, TraversalAPIError } from '../errors/edgeErrors'
import { bitfinex as DefaultIterator } from '../utils/iterators'

const NEUTRAL_COINS = ['ETH', 'BTC', 'EUR', 'USD', 'CAD']

export default class {
  public id: string
  public arbitrage: number
  public maxVolume: Volume = Infinity
  public minVolume: Volume
  public exchange: string
  public iterator: Iterator = function() {return new Decimal(0)}
  public created: Date = new Date()
  private triangle: Triangle
  private refUnit: string

  constructor (exchange: string, triangle: Edge[]) {
    this.exchange = exchange
    this.triangle = triangle

    this.refUnit = triangle[0].source
    this.arbitrage = this.calculateArbitrage(triangle)
    this.id = this.generateIndex(triangle)
    this.setIterator(DefaultIterator)

    this.minVolume = this.getMinVolume()
  }

  public setIterator(it: Iterator) {
    this.iterator = it

    this.getMinVolume()
    // this.getMaxVolume()
  }

  public contains (unit: Currency) {
    return this.getNodes().includes(unit)
  }

  public getReferenceUnit() {
    return this.refUnit
  }

  public getDuration() {
    return (new Date()).getTime() - this.created.getTime()
  }

  public getNodes () {
    return this.triangle.map(e => e.source)
  }

  public changeStartingPoint (currency: Currency) {
    const index = this.triangle.findIndex((edge: Edge) => edge.source === currency)

    if (!this.contains(currency)) {
      throw new Error('Invalid reference unit')
    }

    getRotated(this.triangle, index)

    if (this.triangle[0].source !== currency) {
      throw new Error(`Triangle rotation didn't work as expected`)
    }

    this.refUnit = currency
    this.maxVolume = this.getMaxVolume()
    this.minVolume = this.getMinVolume()

    log.info(`Changed reference unit to ${currency}. MinVolume: ${this.minVolume}, MaxVolume: ${this.maxVolume}`)
  }

  public async updateFromAPI(api: any) {
    log.info(`Updating from API opportunity: ${this.getNodes()}`)

    // No worries, caching will do it's job
    await Promise.all(this.triangle.map((edge: Edge) => edge.updateFromAPI(api)))

    this.maxVolume = this.getMaxVolume()
  }

  public async exploit(api: any, currency: Currency, startingBalance: number, mock = true): Promise<boolean> {
    this.changeStartingPoint(currency)

    if (this.maxVolume === Infinity) {
      log.error(`[EXPLOIT] Max Volume is not defined. Exploit of triangle ${this.getNodes()} cancelled`)
      return false
    }

    let volumeIt = new Decimal(startingBalance)

    log.info(`[EXPLOIT] Starting Volume ${volumeIt} ${this.getReferenceUnit()}`)
    log.info(`[EXPLOIT] ${this.getNodes()}. Expecting to gain ${financial((this.arbitrage - 1) * startingBalance, this.triangle[0].sourcePrecision)} ${this.getReferenceUnit()}`)

    for (const edge of this.triangle) {
      log.info(`[EXPLOIT] Proceeding to edge traversal of: ${edge.source} -> ${edge.target}`)

      let type: 'limit' | 'market' = 'limit'

      /*
      if (edge.source in NEUTRAL_COINS) {
        type = 'limit'
        log.info(`Edge source: ${edge.source} in neutral coins. Proceeding to limit order`)
      }
      else {
        type = 'market'
        log.info(`Edge source: ${edge.source} not in neutral coins. Proceeding to market order`)
      }
      */

      const details = {
        type: type,
        volume: volumeIt.toNumber(),
        api: api,
        mock: mock
      } as OrderDetails

      let traversed

      try {
        traversed = await edge.traverse(details)
      } catch (e) {
        if (e instanceof OrderFillTimeoutError || e instanceof TraversalAPIError) {
          await this.backToSafety(api, e.edge.source, volumeIt)
          return false
        }
      }

      if (!traversed) {
        log.error(`[OPPORTUNITY] Cannot exploit opportunity ${this.getNodes()}. Edge traversal failed for ${edge.stringified}`)
        return false
      }

      log.info(`[EXPLOIT] Edge ${edge.source} -> ${edge.target} traversed`)

      volumeIt = this.iterator(volumeIt, edge)
    }

    return true
  }

  /**
   * BackToSafety function returns all volume that was traded to a neutral coin, by making market orders
   */
  private backToSafety(api: any, currency: Currency, volume: Decimal) {
    log.info(`[OPPORTUNITY_FALLBACK] Starting back to safety fallback`)

    this.changeStartingPoint(currency)

    let volumeIt = new Decimal(volume)

    for (const edge of this.triangle) {
      log.info(`[OPPORTUNITY_FALLBACK], Testing edge ${edge.stringified}`)

      if (edge.source in NEUTRAL_COINS) {
        log.info(`[OPPORTUNITY_FALLBACK] Back to neutral currency: ${edge.source}`)
        return
      }

      log.info(`[OPPORTUNITY_FALLBACK] Creating market order to leave from non neutral currency: ${edge.source}`)

      const details = {
        type: 'market',
        volume: volumeIt.toNumber(),
        api: api,
      } as OrderDetails

      edge.traverse(details)

      volumeIt = volumeIt.mul(edge.getPriceAsDecimal()).mul(1 - edge.fee)
    }
  }

  public async save() {
    const res = await db('opportunities').insert({
      created_at: this.created,
      closed_at: new Date(),
      min_trade_volume: this.getMinVolume(),
      max_trade_volume: this.maxVolume === Infinity ? null : this.maxVolume,
      cycle: this.triangle.map((edge: Edge) => edge.source),
      arbitrage: this.arbitrage,
    }).returning('id')

    return this.triangle.map((edge: Edge) => edge.save(res[0]))
  }

  // TODO: Calculate without including fees
  public getMaxVolume (): number {
    let volumeIt = this.triangle[0].getVolumeAsDecimal()

    for (const edge of this.triangle) {
      if (!edge.volume.isFinite()) {
        return Infinity
      }

      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt = this.iterator(volumeIt, edge)
    }

    return volumeIt.toNumber()
  }

  // TODO: Calculate without including fees
  public getMinVolume(): number {
    let volumeIt = new Decimal(this.triangle[0].minVolume)
    let fees = []

    for (const edge of this.triangle) {
      if (edge.minVolume === 0) {
        return 0
      }

      if (volumeIt.toNumber() < edge.minVolume) {
        volumeIt = new Decimal(edge.minVolume)
      }

      volumeIt = this.iterator(volumeIt, edge)
      fees.push(edge.fee)
    }

    const reversedFees = fees.reduce((acc, fee) => {
      return new Decimal(acc).mul(new Decimal(fee).pow(-1)).toNumber()
    }, 1)

    return volumeIt.mul(reversedFees).toNumber()
  }

  private calculateArbitrage (triangle: Triangle): number {
    return triangle.reduce((acc, edge) => acc * (1 - edge.fee) * edge.getPrice(), 1)
  }

  private generateIndex(triangle: Triangle) {
    return triangle.map(e => e.source).sort().join('')
  }
}
