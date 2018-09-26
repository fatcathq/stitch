// import log from '../loggers/winston'

type timestampedOB = {
  ob: any,
  ts: number
}

export default class Cache {
  private orderBookPool: Map<string, timestampedOB> = new Map()

  public hasFreshOrderBook (market: string, ts = 500): boolean {
    // log.info(`orderBookHasMarket = ${this.orderBookPool.has(market)} for market ${market}`)
    if (this.orderBookPool.has(market)) {
      if (Date.now() - this.orderBookPool.get(market)!.ts < ts) {
        return true 
      }
    }

    return false
  }

  public getOrderBook(market: string): any {
    return this.orderBookPool.get(market)!.ob
  }

  public updateOrderBook(market: string, ob: any) {
    // log.info(`OrderBook updated for market ${market}`)
    this.orderBookPool.set(market, { ob: ob, ts: Date.now() })
    // log.info(`OrderBookPool now is`, this.orderBookPool.keys())
  }
}
