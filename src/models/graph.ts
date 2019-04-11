const Graph = require('graphlib').Graph
// import * as minTradeVolumes from '../../data/min_volumes.json'
import Decimal from 'decimal.js'
import { Market, Triangle, Edge, OrderBookRecord } from '../types'
import log from '../loggers/winston'
import * as _ from 'lodash'
import { Edge as EdgeDriver, VirtualEdge as VirtualEdgeDriver } from './edge'
import { marketIsValid, triangleExists } from '../utils/helpers'

export default class extends Graph {
  public exchange: string
  public triangles: Triangle[]

  constructor (exchange: string = '', markets: Market[] = []) {
    super({ directed: true })
    this.exchange = exchange
    this.initializeFromMarkets(markets)

    this.triangles = this.getTriangles()
  }

  private initializeFromMarkets (markets: Market[]): void {
    _.forEach(markets, (market: any): void => {
      if (!marketIsValid(market.symbol) || `${market.base}/${market.quote}` !== market.symbol) {
        log.warn(`Invalid market: ${market.symbol}`)
        return
      }

      this.setEdge(market.base, market.quote,
        new EdgeDriver(market.base, market.quote, [market.fee, 'after'], market.minBaseVolume, [market.precisions.base, market.precisions.quote])
      )

      // TODO: Fix min volume
      this.setEdge(market.quote, market.base,
        new VirtualEdgeDriver(market.quote, market.base, [market.fee, 'before'], new Decimal(0), [market.precisions.quote, market.precisions.base])
      )
    })

    log.info(`Created graph with ${this.nodes().length} nodes`)
  }

  public updateFromOBTRecord (record: OrderBookRecord): boolean {
    let edge

    switch (record.type) {
      case 'buy':
        if (!this.hasEdge(record.asset, record.currency)) {
          log.error(`[GRAPH] Edge ${record.asset}->${record.currency} does not exist on graph`)
          return false
        }

        edge = this.edge(record.asset, record.currency)

        if (edge.getRealPrice().equals(record.price) && edge.getRealVolume().equals(record.volume)) {
          // log.info(`[GRAPH] Edge was not updated since websocket update didn't affect the orderbook top`)
          edge.updateLastUpdatedTs()

          return false
        }

        edge.setRealPrice(new Decimal(record.price))
        edge.setRealVolume(new Decimal(record.volume))

        return true

      case 'sell':
        if (!this.hasEdge(record.currency, record.asset)) {
          log.error(`[GRAPH] VirtualEdge ${record.currency}->${record.asset} does not exist on graph`)
          return false
        }

        const nonVirtualEdge = this.edge(record.asset, record.currency)
        edge = this.edge(record.currency, record.asset)

        if (edge.getRealPrice().equals(record.price) && edge.getRealVolume().equals(record.volume)) {
          // log.info(`[GRAPH] VirtualEdge was not updated since websocket update didn't affect the orderbook top`)
          edge.updateLastUpdatedTs()

          return false
        }

        edge.setRealPrice(new Decimal(record.price))
        edge.setRealVolume(new Decimal(record.volume))
        edge.setMinVolume(nonVirtualEdge.minVolume.mul(record.price))

        return true
    }

    return false
  }

  public getNonEmptyTriangles (forceUpdate = false): Triangle[] {
    const triangles = this.getTriangles(forceUpdate)

    return triangles.filter((triangle: Triangle) => {
      return triangle.every(edge => {
        return !edge.hasEmptyValues()
      })
    })
  }

  /*
   *  Triangles implemented using this paper: http://theory.stanford.edu/~tim/s14/l/l1.pdf
   */
  public getTriangles (forceUpdate = false): Triangle[] {
    if (this.triangles && !forceUpdate) {
      return this.triangles
    }

    let triangles: Triangle[] = []

    for (const n1 of this.nodes()) {
      const out = this.outEdges(n1) as Edge[]

      out.map((edge1) => {
        const n2 = edge1.w
        out.map((edge2) => {
          const n3 = edge2.w

          if (this.edge(n2, n3) === undefined) {
            return
          }

          const triangle = [
            this.edge(n1,n2),
            this.edge(n2,n3),
            this.edge(n3,n1)
          ] as Triangle

          if (!triangleExists(triangle, triangles)) {
            triangles.push(triangle)
          }
        })
      })
    }

    return triangles
  }

  public static getMarketsPotentiallyParticipatingInTriangle (markets: Market[]): any {
    const g = new Graph()
    _.forEach(markets, (market: Market): void => {
      g.setEdge(market.base, market.quote)
      g.setEdge(market.quote, market.base)
    })

    const participatingNodes = g.nodes().filter((n: any) => {
      return g.outEdges(n).length > 1
    })

    const pairInParticipatingNodes = (v: any) => {
      return participatingNodes.includes(v.base) && participatingNodes.includes(v.quote)
    }

    return _.pickBy(markets, pairInParticipatingNodes)
  }
}
