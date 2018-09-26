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
  private currentOpportunities: Map<string, Opportunity>
  private running = true
  private api: any

  constructor (api: any) {
    super()
    
    this.currentOpportunities = new Map()
    this.api = api
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
    opportunities.forEach((opportunity: Opportunity) => {
      if (!this.currentOpportunities.has(opportunity.id)) {
        this.emit('OpportunityFound', opportunity)

        if (config.fetchVolumes) {
          opportunity.updateFromAPI(this.api)
        }

        this.currentOpportunities.set(opportunity.id, opportunity) 
        return
      }

      const prevArbitrage = this.currentOpportunities.get(opportunity.id)!.arbitrage

      // Find opportunities which already exist but arbitrage percentage changed and update them
      if (prevArbitrage !== opportunity.arbitrage) {
        this.currentOpportunities.get(opportunity.id)!.arbitrage = opportunity.arbitrage

        this.emit('OpportunityUpdated', opportunity, prevArbitrage)
      }
    })

    // Delete non existing opportunities
    this.currentOpportunities.forEach((opportunity: Opportunity, id: string, map: Map<string, Opportunity>) => {
      if (!opportunityExists(opportunity, opportunities)) {
        this.emit('OpportunityClosed', opportunity, opportunity.getDuration())
        map.delete(id)
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
