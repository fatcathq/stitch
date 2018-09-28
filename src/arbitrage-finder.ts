import * as _ from 'lodash'
import Graph from './models/graph'
import OpportunitySet from './models/opportunity'
import config from  './utils/config'
import Notifier from './utils/notifier'
import log from './loggers/winston'
import { OpportunitySets } from './types'
import { opportunityExists } from './utils/helpers'

export default class ArbitrageFinder {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private opportunitySets: OpportunitySets = {}
  private running = true
  private api: any

  constructor (api: any) {
    this.api = api
  }

  public linkOpportunities(opportunities: OpportunitySets) {
    this.opportunitySets = opportunities
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

  async updateOpportunities(newOpportunities: OpportunitySet[]) {
    // Delete non existing opportunities
    for (const id in this.opportunitySets) {
      const existingOpportunity = this.opportunitySets[id]

      if (!opportunityExists(existingOpportunity, newOpportunities)) {
        Notifier.emit('OpportunityClosed', existingOpportunity, existingOpportunity.getDuration())

        delete this.opportunitySets[id]
      }
    }

    for (const newOpportunity of newOpportunities) {
      if (this.opportunitySets[newOpportunity.id] === undefined) {
        this.opportunitySets[newOpportunity.id] = newOpportunity

        if (config.fetchVolumes) {
          await this.opportunitySets[newOpportunity.id].updateFromAPI(this.api)
        }

        Notifier.emit('OpportunityAdded', newOpportunity.id)
        return
      }

      const prevArbitrage = this.opportunitySets[newOpportunity.id].arbitrage

      // Find opportunities which already exist but arbitrage percentage changed and update them
      if (prevArbitrage !== newOpportunity.arbitrage) {
        this.opportunitySets[newOpportunity.id].arbitrage = newOpportunity.arbitrage

        Notifier.emit('OpportunityUpdated', newOpportunity.id, prevArbitrage)
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

  private extractOpportunitiesFromGraph (): OpportunitySet[] {
    let opportunities: OpportunitySet[] = []

    const triangles = this.graph.getTriangles()

    for (const triangle of triangles) {
      const opportunity = new OpportunitySet(this.exchange, triangle)

      if (opportunity.arbitrage > config.threshold) {
        opportunities.push(opportunity)
      }
    }

    return opportunities
  }
}
