import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import config from  './utils/config'
import Notifier from './utils/notifier'
import log from './loggers/winston'
import { OpportunityMap } from './types'

export default class ArbitrageFinder {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private opportunityMap: OpportunityMap = {}
  private running = true
  /*
   * Peace mode: Finder updates from tickers, creates, updates and emits opportunities
   * War mode: Finder updates from orderBooks only the given opportunities
   */
  private mode: 'peace' | 'war' = 'peace'
  private api: any

  constructor (api: any) {
    this.api = api
  }

  public linkOpportunities(opportunities: OpportunityMap) {
    this.opportunityMap = opportunities
  }

  async init (): Promise<void> {
    this.graph = new Graph(this.exchange, await this.api.loadMarkets())

    await this.registerListeners()
  }

  private async registerListeners () {
    Notifier.on('War', async (opportunity) => {
      log.info(`[ARBITRAGE_FINDER] War mode. Finding prices and volumes only for opportunity: ${opportunity.getNodes()}`)
      this.mode = 'war'
    })

    Notifier.on('Peace', async () => {
      log.info('[ARBITRAGE_FINDER] Peace mode again. Finding opportunities from tickers.')
      this.mode = 'peace'
    })
  }

  async run(): Promise<void> {
    while (this.running) {
      if (this.mode === 'peace') {
        await this.updatePrices()

        const opportunities = this.extractOpportunitiesFromGraph()

        this.updateOpportunities(opportunities)
      }
      else if (this.mode === 'war') {
        // Null check is not required here
        // this.watchOpportunity!.updateFromAPI(this.api)
      }
    }
  }

  async updateOpportunities(newOpportunities: OpportunityMap) {
    //TODO: Fix sorting
    // sortByProfitability(newOpportunities)

    // Delete non existing opportunities
    for (const id in this.opportunityMap) {
      if (id in newOpportunities) {
        return
      }

      Notifier.emit('OpportunityClosed', this.opportunityMap[id], this.opportunityMap[id].getDuration())

      delete this.opportunityMap[id]
    }

    for (const id in newOpportunities) {
      // New opportunity found
      if (this.opportunityMap[id] === undefined) {
        this.opportunityMap[id] = newOpportunities[id]

        if (config.fetchVolumes) {
          await this.opportunityMap[id].updateFromAPI(this.api)
        }

        Notifier.emit('OpportunityAdded', id)
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

  private extractOpportunitiesFromGraph (): OpportunityMap {
    let opportunities: OpportunityMap = {}

    const triangles = this.graph.getTriangles()

    for (const triangle of triangles) {
      const opportunity = new Opportunity(this.exchange, triangle)

      if (opportunity.arbitrage > config.threshold) {
        opportunities[opportunity.id] = opportunity
      }
    }

    return opportunities
  }
}
