import * as _ from 'lodash'
import Graph from './models/graph'
import OpportunitySet, { Opportunity as ExploitableOpportunity } from './models/opportunity'
import config from  './utils/config'
import Notifier from './utils/notifier'
import log from './loggers/winston'
import { OpportunitySets } from './types'
import { opportunityExists, sortByProfitability } from './utils/helpers'

export default class ArbitrageFinder {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private opportunitySets: OpportunitySets = {}
  private running = true
  /*
   * Peace mode: Finder updates from tickers, creates, updates and emits opportunities
   * War mode: Finder updates from orderBooks only the given opportunities
   */
  private mode: 'peace' | 'war' = 'peace'
  private watchOpportunity: ExploitableOpportunity | null = null
  private api: any

  constructor (api: any) {
    this.api = api
  }

  public linkOpportunities(opportunities: OpportunitySets) {
    this.opportunitySets = opportunities
  }

  async init (): Promise<void> {
    this.graph = new Graph(this.exchange, await this.api.loadMarkets())

    await this.registerListeners()
  }

  private async registerListeners () {
    Notifier.on('War', async (opportunity) => {
      log.info(`[ARBITRAGE_FINDER] War mode. Finding prices and volumes only for opportunity: ${opportunity.getNodes()}`)
      this.mode = 'war'
      this.watchOpportunity = opportunity
    })

    Notifier.on('Peace', async () => {
      log.info('[ARBITRAGE_FINDER] Peace mode again. Finding opportunities from tickers.')
      this.mode = 'peace'
      this.watchOpportunity = null
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
        this.watchOpportunity
        // Null check is not required here
        // this.watchOpportunity!.updateFromAPI(this.api)
      }
    }
  }

  async updateOpportunities(newOpportunities: OpportunitySet[]) {
    sortByProfitability(newOpportunities)

    // Delete non existing opportunities
    for (const id in this.opportunitySets) {
      const existingOpportunity = this.opportunitySets[id]

      if (!opportunityExists(existingOpportunity, newOpportunities)) {
        Notifier.emit('OpportunityClosed', existingOpportunity, existingOpportunity.getDuration())

        delete this.opportunitySets[id]
      }
    }
    for (const newOpportunity of newOpportunities) {
      if (config.fetchVolumes) {
        await newOpportunity.updateFromAPI(this.api)
      }

      if (this.opportunitySets[newOpportunity.id] === undefined) {
        this.opportunitySets[newOpportunity.id] = newOpportunity

        Notifier.emit('OpportunityAdded', newOpportunity.id)
        return
      }

      const prevArbitrage = this.opportunitySets[newOpportunity.id].arbitrage

      // Find opportunities which already exist but arbitrage percentage changed and update them
      if (prevArbitrage !== newOpportunity.arbitrage) {
        this.opportunitySets[newOpportunity.id] = newOpportunity

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
