import {Edge as EdgeDriver} from './edge'
import db from '../connectors/db'
import log from '../loggers/winston'
import { getRotated } from '../utils/helpers'
import { Currency, Triangle, OrderDetails, Volume } from '../types'
import { OrderFillTimeoutError, TraversalAPIError } from '../errors/edgeErrors'

const NEUTRAL_COINS = ['ETH', 'BTC', 'EUR', 'USD']
const DECIMAL_POINT_PRECISION = 6

// TODO: Rename it to OpportunityWrapper or OpportunityContainer?
export default class {
  public id: string
  public arbitrage: number
  public exchange: string
  public maxVolume: Volume = Infinity
  public minVolume: Volume
  public created: Date = new Date()
  private triangle: Triangle
  private refUnit: string

  constructor (exchange: string, triangle: EdgeDriver[]) {
    this.exchange = exchange
    this.triangle = triangle

    this.refUnit = triangle[0].source
    this.arbitrage = this.calculateArbitrage(triangle)
    this.id = this.generateIndex(triangle)

    this.minVolume = this.getMinVolume()
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
    const index = this.triangle.findIndex((edge: EdgeDriver) => edge.source === currency)

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
    await Promise.all(this.triangle.map((edge: EdgeDriver) => edge.updateFromAPI(api)))

    this.maxVolume = this.getMaxVolume()
  }

  public async exploit(api: any, currency: Currency, startingBalance: number, mock = true): Promise<boolean> {
    this.changeStartingPoint(currency)

    if (this.maxVolume === Infinity) {
      log.error(`[EXPLOIT] Max Volume is not defined. Exploit of triangle ${this.getNodes()} cancelled`)
      return false
    }

    let volumeIt = startingBalance

    log.info(`[EXPLOIT] Starting Volume ${startingBalance} ${this.getReferenceUnit()}`)
    log.info(`[EXPLOIT] ${this.getNodes()}. Expecting to gain ${(this.arbitrage - 1) * startingBalance} ${this.getReferenceUnit()}`)

    for (const edge of this.triangle) {
      log.info(`[EXPLOIT] Proceeding to edge traversal of: ${edge.source} -> ${edge.target}`)
      const details = {
        volume: volumeIt,
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

      volumeIt *= (1 - edge.fee) * edge.getPrice()
    }

    return true
  }

  /**
   * BackToSafety function returns all volume that was traded to a neutral coin, by making market orders
   */
  private backToSafety(api: any, currency: Currency, volume: Volume) {
    log.info(`[OPPORTUNITY_FALLBACK] Starting back to safety fallback`)

    this.changeStartingPoint(currency)

    let volumeIt = volume

    for (const edge of this.triangle) {
      log.info(`[OPPORTUNITY_FALLBACK], Testing edge ${edge.stringified}`)

      if (edge.source in NEUTRAL_COINS) {
        log.info(`[OPPORTUNITY_FALLBACK] Back to neutral currency: ${edge.source}`)
        return
      }

      log.info(`[OPPORTUNITY_FALLBACK] Creating market order to leave from non neutral currency: ${edge.source}`)

      const details = {
        type: 'market',
        volume: volumeIt,
        api: api,
      } as OrderDetails

      edge.traverse(details)

      volumeIt *= (1 - edge.fee) * edge.getPrice()
    }
  }

  public async save() {
    const res = await db('opportunities').insert({
      created_at: this.created,
      closed_at: new Date(),
      min_trade_volume: this.getMinVolume(),
      max_trade_volume: this.maxVolume === Infinity ? null : this.maxVolume,
      exchange: this.exchange,
      cycle: this.triangle.map((edge: EdgeDriver) => edge.source),
      arbitrage: this.arbitrage,
    }).returning('id')

    return this.triangle.map((edge: EdgeDriver) => edge.save(res[0]))
  }

  private getMaxVolume (): number {
    let volumeIt = this.triangle[0].volume

    for (const edge of this.triangle) {
      if (edge.volume === Infinity) {
        return Infinity
      }

      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt *= edge.getPrice() * (1 - edge.fee)
    }

    return parseFloat(volumeIt.toFixed(DECIMAL_POINT_PRECISION))
  }

  private getMinVolume(): number {
    let volumeIt = this.triangle[0].minVolume

    for (const edge of this.triangle) {
      if (volumeIt < edge.minVolume) {
        volumeIt = edge.minVolume
      }

      volumeIt *= edge.getPrice() * (1 - edge.fee)
    }

    return parseFloat(volumeIt.toFixed(DECIMAL_POINT_PRECISION))
  }

  private calculateArbitrage (triangle: Triangle): number {
    return triangle.reduce((acc, edge) => acc * (1 - edge.fee) * edge.getPrice(), 1)
  }

  private generateIndex(triangle: Triangle) {
    return triangle.map(e => e.source).sort().join('')
  }
}
