import Decimal from 'decimal.js'
import { Edge } from './edge'
import db from '../connectors/db'
import log from '../loggers/winston'
import { getRotated } from '../utils/helpers'
import { Currency, Triangle, Volume } from '../types'

export default class {
  public id: string
  public arbitrage!: Decimal
  public maxVolume: Volume = new Decimal(Infinity)
  public minVolume: Volume
  public exchange: string
  public created: Date = new Date()
  public triangle: Triangle
  private refUnit: string

  constructor (exchange: string, triangle: Edge[]) {
    this.exchange = exchange
    this.triangle = triangle

    this.refUnit = triangle[0].source
    this.id = this.generateIndex(triangle)

    this.minVolume = this.getMinVolume()
  }

  public contains (unit: Currency): boolean {
    return this.getNodes().includes(unit)
  }

  public getReferenceUnit (): string {
    return this.refUnit
  }

  public getDuration (): number {
    return (new Date()).getTime() - this.created.getTime()
  }

  public getNodes (): string[] {
    return this.triangle.map(e => e.source)
  }

  public changeStartingPoint (currency: Currency): void {
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

  public async updateFromAPI (api: any): Promise<void> {
    log.info(`Updating from API opportunity: ${this.getNodes()}`)

    for (const edge of this.triangle) {
      await edge.updateFromAPI(api)
    }

    this.maxVolume = this.getMaxVolume()
  }

  public calculateArbitrage (store = true): Volume {
    const arbitrage = this.triangle.reduce((acc, edge) => {
      const afterFeeWeight = new Decimal(1).minus(edge.fee)
      return new Decimal(acc).mul(afterFeeWeight).mul(edge.getPrice()).toNumber()
    }, 1)

    this.arbitrage = store ? new Decimal(arbitrage) : this.arbitrage

    return this.arbitrage
  }

  public async exploit (api: any, currency: Currency, startingBalance: Decimal, mock = true): Promise<boolean> {
    this.changeStartingPoint(currency)

    if (this.maxVolume.equals(Infinity)) {
      log.error(`[EXPLOIT] Max Volume is not defined. Exploit of triangle ${this.getNodes()} cancelled`)
      return false
    }

    this.logOpportunityExploitInfo(startingBalance)
    let volumeIt = startingBalance

    for (const edge of this.triangle) {
      log.info(`[EXPLOIT] Proceeding to edge traversal of: ${edge.source} -> ${edge.target}`)
      edge.fullPrintEdge()

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

  public async save (duration: number): Promise<void> {
    db('opportunities').insert({
      exchange: this.exchange,
      duration: duration,
      min_trade_volume: this.getMinVolume().toNumber(),
      max_trade_volume: this.getMaxVolume().toNumber(),
      cycle: JSON.stringify(this.getNodes()),
      arbitrage: this.arbitrage.toNumber()
    }).returning('id').then(async (res) => {
      let order = 1
      for (const edge of this.triangle) {
        await edge.save(res[0], order)
        ++order
      }
    })
  }

  // TODO: Calculate without including fees
  public getMaxVolume (): Decimal {
    let volumeIt = this.triangle[0].getVolume()

    for (const edge of this.triangle) {
      if (!edge.volume.isFinite()) {
        return new Decimal(Infinity)
      }

      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt = volumeIt.mul(edge.getPrice()).mul((new Decimal(1).minus(edge.fee)))
    }

    return volumeIt
  }

  // TODO: Calculate without including fees
  public getMinVolume (): Decimal {
    let volumeIt = new Decimal(this.triangle[0].minVolume)

    for (const edge of this.triangle) {
      if (edge.minVolume.equals(0)) {
        return new Decimal(0)
      }

      if (volumeIt.lessThan(edge.minVolume)) {
        volumeIt = new Decimal(edge.minVolume)
      }

      volumeIt = volumeIt.mul(edge.getPrice()).mul((new Decimal(1).minus(edge.fee)))
    }

    return volumeIt
  }

  private logOpportunityExploitInfo (startingBalance: Decimal): void {
    log.info(`[EXPLOIT] Starting Volume ${startingBalance} ${this.getReferenceUnit()}`)
    log.info(`[EXPLOIT] ${this.getNodes()}. Expecting to gain ${startingBalance.mul(this.arbitrage.minus(1))} ${this.getReferenceUnit()}`)
  }

  private generateIndex (triangle: Triangle): string {
    return triangle.map(e => e.source).sort().join('')
  }
}
