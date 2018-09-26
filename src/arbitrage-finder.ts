import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import config from  './utils/config'
import EventEmitter from 'events'
import log from './loggers/winston'
import { Triangle } from './types'
import { opportunityExists } from './utils/helpers'

export default class ArbitrageFinder extends EventEmitter {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private opportunities: Map<string, Opportunity> = new Map()
  private running = true
  private api: any

  constructor (api: any) {
    super()

    this.api = api
  }

  public linkOpportunities(opportunities: Map<string, Opportunity>) {
    this.opportunities = opportunities
  }

  async init (): Promise<void> {
    this.graph = new Graph(this.exchange, await this.api.loadMarkets())
  }

  async run(): Promise<void> {
    while (this.running) {
      await this.updatePrices()

      const opportunities = this.extractOpportunitiesFromGraph()

      this.updateOpportunities(opportunities)
    }
  }

  async updateOpportunities(opportunities: Opportunity[]) {
    // Delete non existing opportunities
    this.opportunities.forEach((opportunity: Opportunity, id: string, map: Map<string, Opportunity>) => {
      if (!opportunityExists(opportunity, opportunities)) {
        this.emit('OpportunityClosed', opportunity, opportunity.getDuration())
        map.delete(id)
      }
    })

    opportunities.forEach(async (opportunity: Opportunity) => {
      if (!this.opportunities.has(opportunity.id)) {
        this.emit('OpportunityFound', opportunity)

        this.opportunities.set(opportunity.id, opportunity)
        return
      }

      const prevArbitrage = this.opportunities.get(opportunity.id)!.arbitrage

      // Find opportunities which already exist but arbitrage percentage changed and update them
      if (prevArbitrage !== opportunity.arbitrage) {
        this.opportunities.get(opportunity.id)!.arbitrage = opportunity.arbitrage

        if (config.fetchVolumes) {
          await opportunity.updateFromAPI(this.api)
        }

        this.emit('OpportunityUpdated', opportunity, prevArbitrage)
      }
    })
  }

  private async updatePrices() {
    let tickers: any = []

    try {
      tickers = await this.api.fetchTickers()
    } catch (e) {
      log.error(`Could not fetch tickers. Problem: ${e.message}`)
      return
    }

    this.graph.update(tickers)
  }

  private extractOpportunitiesFromGraph (): Opportunity[] {
    let opportunities: Opportunity[] = []

    const triangles = this.graph.getTriangles()

    for (const triangle of triangles) {
      const arbitrage = this.calculateArbitrage(triangle)

      if (arbitrage >= config.threshold) {
        opportunities.push(new Opportunity(this.exchange, triangle, arbitrage))
      }
    }

    return opportunities
  }

  private calculateArbitrage (triangle: Triangle): number {
    return triangle.reduce((acc, edge) => acc * (1 - edge.fee) * edge.getWeight(), 1)
  }
}
