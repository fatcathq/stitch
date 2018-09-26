import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import config from  './utils/config'
import EventEmitter from 'events'
import log from './loggers/winston'
import { Triangle, Opportunities } from './types'
import { opportunityExists } from './utils/helpers'

export default class ArbitrageFinder extends EventEmitter {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private opportunities: Opportunities = {}
  private running = true
  private api: any

  constructor (api: any) {
    super()

    this.api = api
  }

  public linkOpportunities(opportunities: Opportunities) {
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

  async updateOpportunities(newOpportunities: Opportunity[]) {
    // Delete non existing opportunities
    for (const id in this.opportunities) {
      const existingOpportunity = this.opportunities[id]

      if (!opportunityExists(existingOpportunity, newOpportunities)) {
        this.emit('OpportunityClosed', existingOpportunity, existingOpportunity.getDuration())

        delete this.opportunities[id]
      }
    }

    for (const newOpportunity of newOpportunities) {
      if (this.opportunities[newOpportunity.id] === undefined) {
        this.opportunities[newOpportunity.id] = newOpportunity

        this.emit('OpportunityAdded', newOpportunity.id)
        return
      }

      const prevArbitrage = this.opportunities[newOpportunity.id].arbitrage

      // Find opportunities which already exist but arbitrage percentage changed and update them
      if (prevArbitrage !== newOpportunity.arbitrage) {
        this.opportunities[newOpportunity.id].arbitrage = newOpportunity.arbitrage

        if (config.fetchVolumes) {
          await newOpportunity.updateFromAPI(this.api)
        }

        this.emit('OpportunityUpdated', newOpportunity.id, prevArbitrage)
      }
    }
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
