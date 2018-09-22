import { Market, Triangle, Edge } from './types'
const Graph = require('graphlib').Graph
import log from './loggers/winston'
import * as _ from 'lodash'
import { Edge as EdgeDriver, VirtualEdge as VirtualEdgeDriver } from './edge'
import { marketIsValid, triangleExists } from './helpers'

export default class extends Graph {
  constructor (markets: any) {
    super({ directed: true })

    _.forEach(markets, (market: any): void => {
      if (!marketIsValid(market.symbol) || `${market.base}/${market.quote}` !== market.symbol) {
        log.warn(`Invalid market: ${market.symbol}`)
        return
      }

      this.setEdge(market.base, market.quote, new EdgeDriver(market.base, market.quote, market.taker, market.limits.amount.min))

      // TODO: Fix min volume
      this.setEdge(market.quote, market.base, new VirtualEdgeDriver(market.quote, market.base, market.taker, 0))
    })
  }

  public update (tickers: []): void {
    _.mapValues(tickers, (market: Market): void => {
      if (!marketIsValid(market.symbol) || market.bid === 0 || market.ask === 0) {
        log.warn(`Invalid market: ${market.symbol}`)
        return
      }

      let asset: string
      let currency: string
      [asset, currency] = market.symbol.split('/')

      try {
        this.edge(asset, currency).setPrice(market.bid)
        this.edge(currency, asset).setPrice(market.ask)
      }
      catch (e) {
        log.warn(`Market is not initialized, so cannot update price from tickers`, market.symbol)
      }
    })
  }

  /*
   *  Triangles implemented using this paper: http://theory.stanford.edu/~tim/s14/l/l1.pdf
   */
  public getTriangles (): Triangle[] {
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
}
