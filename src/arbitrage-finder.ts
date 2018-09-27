import * as _ from 'lodash'
import Graph from './models/graph'
import AbstractOpportunity from './models/opportunity'
import config from  './utils/config'
import EventEmitter from 'events'
import log from './loggers/winston'
import { Opportunities } from './types'
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

  async updateOpportunities(newOpportunities: AbstractOpportunity[]) {
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

        if (config.fetchVolumes) {
          await this.opportunities[newOpportunity.id].updateFromAPI(this.api)
        }

        this.emit('OpportunityAdded', newOpportunity.id)
        return
      }

      const prevArbitrage = this.opportunities[newOpportunity.id].arbitrage

      // Find opportunities which already exist but arbitrage percentage changed and update them
      if (prevArbitrage !== newOpportunity.arbitrage) {
        this.opportunities[newOpportunity.id].arbitrage = newOpportunity.arbitrage

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

  private extractOpportunitiesFromGraph (): AbstractOpportunity[] {
    let opportunities: AbstractOpportunity[] = []

    const triangles = this.graph.getTriangles()

    for (const triangle of triangles) {
      const opportunity = new AbstractOpportunity(this.exchange, triangle)

      if (opportunity.arbitrage > config.threshold) {
        opportunities.push(opportunity)
      }
    }

    return opportunities
  }
}
