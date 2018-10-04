import {Edge as EdgeDriver} from './edge'
import db from '../connectors/db'
import log from '../loggers/winston'
import { getRotated } from '../utils/helpers'
import { Node, Triangle, OrderDetails } from '../types'

// TODO: Rename it to OpportunityWrapper or OpportunityContainer?
export default class OpportunitySet {
  public id: string
  public arbitrage: number
  public exchange: string
  public created: Date = new Date()
  public mutatedOpportunities: Opportunity[] = []
  public nodes: Set<Node> = new Set()

  constructor(exchange: string, triangle: EdgeDriver[]) {
    this.nodes = new Set(triangle.map(e => e.source))
    this.exchange = exchange  

    this.generateMutations(triangle)
    this.arbitrage = this.calculateArbitrage(triangle)
    this.id = this.generateIndex(triangle)
  }

  public getOne(): Opportunity {
    return this.mutatedOpportunities[0]
  }

  public calculateArbitrage (triangle: Triangle): number {
    return triangle.reduce((acc, edge) => acc * (1 - edge.fee) * edge.getWeight(), 1)
  }

  public getDuration() {
    return (new Date()).getTime() - this.created.getTime()
  }

  private generateIndex(triangle: Triangle) {
    return triangle.map(e => e.source).sort().join('')
  }

  async updateFromAPI(api: any) {
    log.info(`Updating from API opportunity: ${[...this.nodes.values()]}`)

    try {
      // No worries, caching will do it's job
      await Promise.all(this.mutatedOpportunities.map((opportunity: Opportunity) => opportunity.updateFromAPI(api)))
    } catch (e) {
      log.warn(`Could not update volumes. ${e.message}`)
    }
  }

  public generateMutations (triangle: Triangle) {
    for (let i = 0; i < triangle.length; ++i)  {
      this.mutatedOpportunities.push(new Opportunity(this.exchange, getRotated(triangle, i)))
    }
  }

  public getOpportunityByStartingCurrency (currency: Node): Opportunity | undefined {
    for (const opportunity of this.mutatedOpportunities) {
      if (opportunity.getInitialCurrency() == currency) {
        return opportunity
      }
    }
  }
}

export class Opportunity {
  public exchange: string
  public arbitrage: number
  public created: Date
  public minVolume: number = 0
  public maxVolume: number = Infinity
  public triangle: EdgeDriver[] = []

  constructor(exchange: string, triangle: EdgeDriver[], created = new Date()) {
    this.created = created
    this.exchange = exchange,  
    this.triangle = triangle
    this.arbitrage = this.generateArbitrage()
    this.minVolume = this.getMinVolume()
  }

  public async exploit(api: any, startingBalance: number) {
    if (this.maxVolume === Infinity) {
      log.error(`[EXPLOIT] Max Volume is not defined. Exploit of triangle ${this.getNodes()} cancelled`)
    }

    let volumeIt = startingBalance

    log.info(`[EXPLOIT] Starting Volume ${startingBalance} ${this.getReferenceUnit()}`)
    log.info(`[EXPLOIT] ${this.getNodes()}. Expecting to gain ${(this.arbitrage - 1) * startingBalance} ${this.getReferenceUnit()}`)

    for (const edge of this.triangle) {
      log.info(`[EXPLOIT] Proceeding to edge traversal of: ${edge.source} -> ${edge.target}`)
      const details = {
        volume: volumeIt,
        api: api,
        mock: true
      } as OrderDetails

      await edge.traverse(details)

      log.info(`[EXPLOIT] Edge ${edge.source} -> ${edge.target} traversed`)

      volumeIt *= (1 - edge.fee) * edge.getPrice()
    }
  }

  public getReferenceUnit() {
    return this.triangle[0].source
  }

  public getNodes(triangle: Triangle = this.triangle) {
    return triangle.map(a => a.source)
  }

  public async save() {
    const res = await db('opportunities').insert({
      created_at: this.created,
      closed_at: new Date(),
      min_trade_volume: this.minVolume,
      max_trade_volume: this.maxVolume === Infinity ? null : this.maxVolume,
      exchange: this.exchange,
      cycle: this.triangle.map((edge: EdgeDriver) => edge.source),
      arbitrage: this.arbitrage,
    }).returning('id')

    return this.triangle.map((edge: EdgeDriver) => edge.save(res[0]))
  }

  public generateArbitrage (): number {
    return this.triangle.reduce((acc, edge) => acc * (1 - edge.fee) * edge.getWeight(), 1)
  }

  async updateFromAPI(api: any): Promise<void> {
    try {
      await Promise.all(this.triangle.map((edge: EdgeDriver) => edge.updateFromAPI(api)))

      this.maxVolume = this.getMaxVolume()
      this.generateArbitrage()
    } catch (e) {
      log.warn(`Could not update volumes. ${e.message}`)
    }
  }

  public getMaxVolume (): number {
    let volumeIt = this.triangle[0].volume

    for (const edge of this.triangle) {
      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt *= edge.getPrice()
    }

    return volumeIt
  }

  private getMinVolume(): number {
    let volumeIt = this.triangle[0].minVolume

    for (const edge of this.triangle) {
      if (volumeIt < edge.minVolume) {
        volumeIt = edge.minVolume
      }

      volumeIt *= edge.getPrice()
    }

    return volumeIt
  }

  public getInitialCurrency (): Node {
    return this.triangle[0].source
  }
}
