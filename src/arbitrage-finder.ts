import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import config from './utils/config'
import log from './loggers/winston'
import { OpportunityMap, OrderBookRecord } from './types'
import EventEmmiter from 'events'
import OBEmitter from './connectors/bittrex-ws'

export default class ArbitrageFinder extends EventEmmiter {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  public opportunityMap: OpportunityMap = {}
  private api: any
  private running = true
  private obEmitter: any = null

  constructor (api: any) {
    super()

    this.api = api
  }

  async init (markets: any): Promise<void> {
    this.obEmitter = new OBEmitter()
    this.graph = new Graph(this.exchange, markets)

    const marketIds = Object.keys(markets).map(market => markets[market].id)
    this.obEmitter.loadMarkets(marketIds)

    this.run()
  }

  public loadListeners (): void {
    for (const marketId in this.obEmitter.markets) {
      this.obEmitter.markets[marketId].on('bidUpdate', async (market: any) => {
        const { rate, quantity } = market.bids.top(1)[0]
        const [currency, asset] = marketId.split('-')

        const record: OrderBookRecord = {
          asset: asset,
          currency: currency,
          type: 'buy',
          price: rate,
          volume: quantity
        }

        if (this.graph.updateFromOBTRecord(record)) {
          const opportunities = await this.extractOpportunitiesFromGraph()
          this.updateOpportunities(opportunities)
        }
      })

      this.obEmitter.markets[marketId].on('askUpdate', async (market: any) => {
        const { rate, quantity } = market.asks.top(1)[0]
        const [currency, asset] = marketId.split('-')

        const record: OrderBookRecord = {
          asset: asset,
          currency: currency,
          type: 'sell',
          price: rate,
          volume: quantity
        }

        if (this.graph.updateFromOBTRecord(record)) {
          const opportunities = await this.extractOpportunitiesFromGraph()
          this.updateOpportunities(opportunities)
        }
      })
    }
  }

  public run (): void {
    this.running = true
    this.loadListeners()
  }

  public async linkOpportunities (opportunities: OpportunityMap): Promise<void> {
    this.opportunityMap = opportunities
  }

  public pause (): void {
    this.running = false
  }

  public updateOpportunities (newOpportunities: OpportunityMap): void {
    // TODO: Fix sorting
    // sortByProfitability(newOpportunities)

    // Delete non existing opportunities
    for (const id in this.opportunityMap) {
      if (id in newOpportunities) {
        continue
      }

      this.emit('OpportunityClosed', this.opportunityMap[id], this.opportunityMap[id].getDuration())

      delete this.opportunityMap[id]
    }

    for (const id in newOpportunities) {
      if (!this.running) {
        log.info(`[FINDER] No new opportunities will be updated/emmited`)
        continue
      }

      // New opportunity found
      if (!(id in this.opportunityMap)) {
        this.opportunityMap[id] = newOpportunities[id]

        this.emit('OpportunityAdded', id)
      }
    }
  }

  /*
  private async updatePrices (): Promise<void> {
    let tickers: any = []

    try {
      tickers = await this.api.fetchTickers()
    } catch (e) {
      log.error(`[FINDER] Could not fetch tickers. Problem: ${e.message}`)
      return
    }

    this.graph.update(tickers)
  }
  */

  private async extractOpportunitiesFromGraph (): Promise<OpportunityMap> {
    let opportunities: OpportunityMap = {}

    const triangles = this.graph.getNonEmptyTriangles()

    for (const triangle of triangles) {
      const opportunity = new Opportunity(this.exchange, triangle)
      await opportunity.calculateArbitrage()

      if (opportunity.arbitrage.greaterThan(config.threshold)) {
        opportunities[opportunity.id] = opportunity
      }
    }

    return opportunities
  }
}
