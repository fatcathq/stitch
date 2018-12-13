import Decimal from 'decimal.js'
import { Edge } from './edge'
import db from '../connectors/db'
import log from '../loggers/winston'
import { getRotated } from '../utils/helpers'
import { Currency, Triangle, OrderDetails, Volume } from '../types'
// import { OrderFillTimeoutError, TraversalAPIError } from '../errors/edgeErrors'

const NEUTRAL_COINS = ['ETH', 'BTC', 'EUR', 'USD', 'CAD']

export default class {
  public id: string
  public arbitrage!: Decimal
  public maxVolume: Volume = new Decimal(Infinity)
  public minVolume: Volume
  public exchange: string
  public created: Date = new Date()
  private triangle: Triangle
  private refUnit: string

  constructor (exchange: string, triangle: Edge[]) {
    this.exchange = exchange
    this.triangle = triangle

    this.refUnit = triangle[0].source
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

    for (const edge of this.triangle) {
      await edge.updateFromAPI(api)
    }

    this.maxVolume = this.getMaxVolume()

  }

  public async calculateArbitrage () {
    let volume = new Decimal(1)

    for (const edge of this.triangle) {
      volume = await edge.traverse({
        type: 'limit',
        volume: volume,
        api: {},
        mock: true,
        sustainLogs: true
      })
    }

    this.arbitrage = volume

    return volume
  }

  public async exploit(api: any, currency: Currency, startingBalance: Decimal, mock = true): Promise<boolean> {
    this.changeStartingPoint(currency)

    if (this.maxVolume.equals(Infinity)) {
      log.error(`[EXPLOIT] Max Volume is not defined. Exploit of triangle ${this.getNodes()} cancelled`)
      return false
    }

    this.logOpportunityExploitInfo(startingBalance)
    let volumeIt = startingBalance

    for (const edge of this.triangle) {
      log.info(`[EXPLOIT] Proceeding to edge traversal of: ${edge.source} -> ${edge.target}`)

      try {
        volumeIt = await edge.traverse({
          type: 'limit',
          volume: volumeIt,
          api: api,
          mock: mock
        })
      } catch (e) {
        return false
      }

      log.info(`[EXPLOIT] Edge ${edge.source} -> ${edge.target} traversed`)
    }

    return true
  }

  /**
   * BackToSafety function returns all volume that was traded to a neutral coin, by making market orders
   */
  public async backToSafety(api: any, currency: Currency, volume: Decimal) {
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
        volume: volumeIt,
        api: api,
      } as OrderDetails

      volumeIt = await edge.traverse(details)
    }

    log.info(`[OPPORTUNITY_FALLBACK] Opportunity fallback finished`)
  }

  public async save() {
    const res = await db('opportunities').insert({
      exchange: this.exchange,
      created_at: this.created,
      closed_at: new Date(),
      min_trade_volume: this.getMinVolume().toNumber(),
      max_trade_volume: this.maxVolume.eq(Infinity) ? null : this.maxVolume.toNumber(),
      cycle: this.getNodes(),
      arbitrage: this.arbitrage.toNumber(),
    }).returning('id')

    return this.triangle.map((edge: Edge) => edge.save(res[0]))
  }

  // TODO: Calculate without including fees
  public getMaxVolume (): Decimal {
    let volumeIt = this.triangle[0].getVolumeAsDecimal()

    for (const edge of this.triangle) {
      if (!edge.volume.isFinite()) {
        return new Decimal(Infinity)
      }

      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt = volumeIt.mul(edge.getPriceAsDecimal()).mul((new Decimal(1).minus(edge.fee)))
    }

    return volumeIt
  }

  // TODO: Calculate without including fees
  public getMinVolume(): Decimal {
    let volumeIt = new Decimal(this.triangle[0].minVolume)

    for (const edge of this.triangle) {
      if (edge.minVolume.equals(0)) {
        return new Decimal(0)
      }

      if (volumeIt.lessThan(edge.minVolume)) {
        volumeIt = new Decimal(edge.minVolume)
      }

      volumeIt = volumeIt.mul(edge.getPriceAsDecimal()).mul((new Decimal(1).minus(edge.fee)))
    }

    return volumeIt
  }

  private logOpportunityExploitInfo (startingBalance: Decimal) {
    log.info(`[EXPLOIT] Starting Volume ${startingBalance} ${this.getReferenceUnit()}`)
    log.info(`[EXPLOIT] ${this.getNodes()}. Expecting to gain ${this.arbitrage.minus(1).toNumber()} ${this.getReferenceUnit()}`)
  }

  private generateIndex(triangle: Triangle) {
    return triangle.map(e => e.source).sort().join('')
  }
}
