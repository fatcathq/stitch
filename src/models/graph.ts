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

  constructor (exchange: string = '', markets: any = []) {
    super({ directed: true })
    this.exchange = exchange

    _.forEach(markets, (market: any): void => {
      if (!marketIsValid(market.symbol) || `${market.base}/${market.quote}` !== market.symbol) {
        log.warn(`Invalid market: ${market.symbol}`)
        return
      }

      let minVolume: number

      /*
       * TODO: Fix json + typescript problems
       *
      if (exchange in minTradeVolumes && minTradeVolumes[exchange][market.base]) {
        minVolume = minTradeVolumes[exchange]
      }
      else {
      */
      minVolume = market.limits.amount.min
      /*
      }
      */

      this.setEdge(market.base, market.quote,
        new EdgeDriver(market.base, market.quote, [new Decimal(market.taker), 'after'], new Decimal(minVolume), [market.precision.amount, market.precision.price])
      )

      // TODO: Fix min volume
      this.setEdge(market.quote, market.base,
        new VirtualEdgeDriver(market.quote, market.base, [new Decimal(market.taker), 'before'], new Decimal(0), [market.precision.price, market.precision.amount])
      )
    })
  }

  public update (tickers: []): void {
    _.mapValues(tickers, (market: Market): void => {
      if (!marketIsValid(market.symbol) || market.bid === 0 || market.ask === 0) {
        // log.warn(`Invalid market: ${market.symbol}`)
        return
      }

      let asset: string
      let currency: string
      [asset, currency] = market.symbol.split('/')

      try {
        this.edge(asset, currency).setRealPrice(new Decimal(market.bid))
        this.edge(currency, asset).setRealPrice(new Decimal(market.ask))

        if ((this.edge(currency, asset)).minVolume.equals(0)) {
          this.edge(currency, asset).minVolume = this.edge(asset, currency).minVolume.mul(market.ask)
        }
      } catch (e) {
        log.warn(`Market is not initialized, so cannot update price from tickers`, market.symbol, e.message)
      }
    })
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

        if (edge.getRealPrice() === new Decimal(record.price) && edge.getRealVolume === new Decimal(record.volume)) {
          log.info(`[GRAPH] Edge was not updated since websocket update didn't affect the orderbook top`)
          return false
        }

        edge.setRealPrice(new Decimal(record.price))
        edge.setRealVolume(new Decimal(record.volume))
        edge.minVolume = edge.minVolume.mul(record.price)

        return true

      case 'sell':
        if (!this.hasEdge(record.currency, record.asset)) {
          log.error(`[GRAPH] VirtualEdge ${record.currency}->${record.asset} does not exist on graph`)
          return false
        }

        edge = this.edge(record.currency, record.asset)

        if (edge.getRealPrice() === new Decimal(record.price) && edge.getRealVolume === new Decimal(record.volume)) {
          log.info(`[GRAPH] Edge was not updated since websocket update didn't affect the orderbook top`)
          return false
        }

        edge.setRealPrice(new Decimal(record.price))
        edge.setRealVolume(new Decimal(record.volume))

        return true
    }

    return false
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
