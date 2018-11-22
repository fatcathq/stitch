import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import config from  './utils/config'
import log from './loggers/winston'
import { OpportunityMap } from './types'
import EventEmmiter from 'events'

export default class ArbitrageFinder extends EventEmmiter {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private opportunityMap: OpportunityMap = {}
  private api: any
  private running = true

  constructor (api: any) {
    super()

    this.api = api
  }

  async init (markets: any): Promise<void> {
    this.graph = new Graph(this.exchange, markets)
  }

  async run (): Promise<void> {
    while (this.running) {
      await this.updatePrices()

      const opportunities = this.extractOpportunitiesFromGraph()

      this.updateOpportunities(opportunities)
    }
  }

  public async linkOpportunities (opportunities: OpportunityMap) {
    this.opportunityMap = opportunities
  }

  public pause () {
    this.running = false
  }

  async updateOpportunities(newOpportunities: OpportunityMap) {
    //TODO: Fix sorting
    // sortByProfitability(newOpportunities)

    // Delete non existing opportunities
    for (const id in this.opportunityMap) {
      if (id in newOpportunities) {
        return
      }

      this.emit('OpportunityClosed', this.opportunityMap[id], this.opportunityMap[id].getDuration())

      delete this.opportunityMap[id]
    }

    for (const id in newOpportunities) {
      if (!this.running) {
        log.info(`[FINDER] No new opportunities will be updated/emmited`)
        return
      }
      // New opportunity found
      if (this.opportunityMap[id] === undefined) {
        this.opportunityMap[id] = newOpportunities[id]

        if (config.fetchVolumes) {
          await this.opportunityMap[id].updateFromAPI(this.api)
        }

        this.emit('OpportunityAdded', id)
      }
    }
  }

  private async updatePrices() {
    let tickers: any = []

    try {
      tickers = await this.api.fetchTickers()
    } catch (e) {
      log.error(`[FINDER] Could not fetch tickers. Problem: ${e.message}`)
      return
    }

    this.graph.update(tickers)
  }

  private extractOpportunitiesFromGraph (): OpportunityMap {
    let opportunities: OpportunityMap = {}

    const triangles = this.graph.getTriangles()

    for (const triangle of triangles) {
      const opportunity = new Opportunity(this.exchange, triangle)

      if (opportunity.arbitrage.greaterThan(config.threshold)) {
        opportunities[opportunity.id] = opportunity
      }
    }

    return opportunities
  }
}
