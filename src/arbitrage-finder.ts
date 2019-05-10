import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import config from './utils/config'
import log from './loggers/winston'
import { OpportunityMap, OrderBookRecord, Market, OrderSide } from './types'
import EventEmmiter from 'events'
import OBEmitter from './connectors/ws-connector'
import StatsLogger from './models/stats'

export default class ArbitrageFinder extends EventEmmiter {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  public opportunityMap: OpportunityMap = {}
  private obEmitter: any = null
  private marketIds: string[] = []

  constructor () {
    super()
  }

  public async init (allMarkets: Market[]): Promise<void> {
    this.obEmitter = OBEmitter
    const markets = Graph.getMarketsPotentiallyParticipatingInTriangle(allMarkets)

    this.graph = new Graph(this.exchange, markets)
    this.marketIds = markets.map(market => market.symbol)

    for (const market of this.marketIds) {
      try {
        this.obEmitter.market(market)
      } catch (e) {
        console.log(e)
      }
    }

    const stats = new StatsLogger(this.graph, this.opportunityMap)
    stats.init()
  }

  public loadListeners (): void {
    const marketIds = Object.keys(this.obEmitter.markets)
    log.info('Adding orderbook emitter listeners')

    marketIds.forEach((marketId: string) => {
      this.obEmitter.market(marketId).on('bidUpdate', (market: any) => this.handleOrderBookUpdate(marketId, 'bid', market))
      this.obEmitter.market(marketId).on('askUpdate', (market: any) => this.handleOrderBookUpdate(marketId, 'ask', market))
    })
  }

  public removeListeners (): void {
    const marketIds = Object.keys(this.obEmitter.markets)
    log.info('Removing all orderBookEmitter listeners')

    marketIds.forEach((marketId: string) => this.obEmitter.market(marketId).removeAllListeners())
  }

  public handleOrderBookUpdate (marketId: string, side: OrderSide, market: any): void {
    const plurarize = (str: string) => str + 's'
    const ob = market[plurarize(side)].top(1)[0]

    if (ob === undefined) {
      log.warn(`Orderbook of market ${marketId} is still undefined. Listener called without reason.`)
      return
    }

    const { rate, quantity } = ob
    const [asset, currency] = marketId.split('/')

    const record: OrderBookRecord = {
      asset: asset,
      currency: currency,
      side: side,
      price: rate,
      volume: quantity
    }

    if (this.graph.updateFromOBTRecord(record)) {
      const opportunities = this.extractOpportunitiesFromGraph()
      this.updateOpportunities(opportunities)
    }
  }

  public run (): void {
    this.loadListeners()
  }

  public async linkOpportunities (opportunities: OpportunityMap): Promise<void> {
    this.opportunityMap = opportunities
  }

  public static opportunityDiff (A: OpportunityMap, B: OpportunityMap): OpportunityMap {
    return _.pick(A, _.difference(_.keys(A), _.keys(B)))
  }

  public emitMulti (eventName: string, params: Array<any>): void {
    for (let param of params) {
      this.emit(eventName, param)
    }
  }

  public updateOpportunities (newOpportunities: OpportunityMap): void {
    // Delete non existing opportunities
    const deletedOpportunities = ArbitrageFinder.opportunityDiff(this.opportunityMap, newOpportunities)
    Object.keys(deletedOpportunities).forEach(id => delete this.opportunityMap[id])

    // Create new opportunities
    const freshOpportunities = ArbitrageFinder.opportunityDiff(newOpportunities, this.opportunityMap)
    Object.assign(this.opportunityMap, freshOpportunities)

    // Emit events
    this.emitMulti('OpportunityAdded', Object.keys(freshOpportunities))
    this.emitMulti('OpportunityClosed', Object.values(deletedOpportunities))
  }

  private extractOpportunitiesFromGraph (): OpportunityMap {
    let opportunities: OpportunityMap = {}

    const triangles = this.graph.getNonEmptyTriangles()

    for (const triangle of triangles) {
      const opportunity = new Opportunity(this.exchange, triangle)
      opportunity.calculateArbitrage()

      if (opportunity.arbitrage.greaterThan(config.threshold)) {
        opportunities[opportunity.id] = opportunity
      }
    }

    return opportunities
  }
}
