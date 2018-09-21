import { Market, Triangle, Edge } from './types'
import { Graph } from 'graphlib'
import * as _ from 'lodash'
import { Edge as EdgeDriver, VirtualEdge as VirtualEdgeDriver } from './edge'
import { marketIsValid, triangleExists } from './helpers'

export default class extends Graph {
  static constructGraphFromTickers (tickers: Market[], fee: number): any {
    let graph = new this({ directed: true })

    _.mapValues(tickers, (market: Market): void => {
      let asset: string
      let currency: string
      [asset, currency] = market.symbol.split('/')

      if (!marketIsValid(market)) {
        return
      }

      graph.setEdge(asset, currency, new EdgeDriver(asset, currency, fee, market.bid))
      graph.setEdge(currency, asset, new VirtualEdgeDriver(currency, asset, fee, market.ask))
    })

    return graph
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
