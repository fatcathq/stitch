import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import { calculateArbitrage } from './utils/helpers'
import config from  './utils/config'
import EventEmitter from 'events'
import { opportunityExists } from './utils/helpers'

import logOpportunities from './loggers'
import log from './loggers/winston'

export default class ArbitrageFinder extends EventEmitter {
  public readonly exchange = config.exchange
  private graph: Graph = new Graph()
  private currentOpportunities: Map<string, Opportunity>
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
    while (true) {
      await this.updatePrices()

      const opportunities = this.extractOpportunitiesFromGraph()

      this.updateOpportunities(opportunities)
    }
  }

  async updateOpportunities(opportunities: Opportunity[]) {
    opportunities.forEach((opportunity: Opportunity) => {
      if (!this.currentOpportunities.has(opportunity.id)) {
        this.emit('OpportunityFound', opportunity)
        this.currentOpportunities.set(opportunity.id, opportunity) 
        return
      }

      if (this.currentOpportunities.get(opportunity.id)!.arbitrage !== opportunity.arbitrage) {
        log.info(`Opportunity: ${opportunity.id} changed arbitrage from ${this.currentOpportunities.get(opportunity.id)!.arbitrage} to ${opportunity.arbitrage}`)
        this.emit('OpportunityUpdated', opportunity)
      }
    })

    this.currentOpportunities.forEach((opportunity: Opportunity, id: string, map: Map<string, Opportunity>) => {
      if (!opportunityExists(opportunity, opportunities)) {
        this.emit('OpportunityDeleted', opportunity)
        map.delete(id)
      }
    })
  }

  async logOpportunities(): Promise<void> {
    let opportunityArr: Opportunity[] = []

    this.currentOpportunities.forEach((p: Opportunity) => {
      opportunityArr.push(p)
    })

    await logOpportunities(opportunityArr)
  }

  private async updatePrices() {
    let tickers: any = []

    try {
      tickers = await this.api.fetchTickers()
    } catch (e) {
      log.error(`Could not fetch tickers. Problem: ${e.message}`)
    }

    this.graph.update(tickers)
  }

  private extractOpportunitiesFromGraph (): Opportunity[] {
    let opportunities: Opportunity[] = []

    const triangles = this.graph.getTriangles()

    for (const triangle of triangles) {
      const arbitrage = calculateArbitrage(triangle)

      if (arbitrage >= config.threshold) {
        opportunities.push(new Opportunity(this.exchange, triangle, arbitrage))
      }
    }

    return opportunities
  }
}
