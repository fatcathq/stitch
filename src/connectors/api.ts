const ccxt = require('ccxt')

import log from '../loggers/winston'
import config from  '../utils/config'
import { sleep } from  '../utils/helpers'
import Cache from '../utils/api-cache'

export default class instance extends ccxt[config.exchange] {
  public cache: Cache = new Cache();
  public toBeUpdated: Set<string> = new Set()

  constructor() {
    super({ enableRateLimit: true })
  }

  public async fetchOrderBook (market: string, limit: number) {
    // Wait if fetchOrderBook for this market is running
    while (this.toBeUpdated.has(market)) {
      await sleep(50)
      continue
    }

    if (this.cache.hasFreshOrderBook(market, config.cacheTime)) {
      log.info(`Using cached orderBook of market ${market}.`)
      return this.cache.getOrderBook(market)
    }
    else {
      this.toBeUpdated.add(market)

      log.info(`No cached orderbook for market ${market}. Requesting from api`)
      const orderBook = await super.fetchOrderBook(market, limit)
      this.cache.updateOrderBook(market, orderBook)

      this.toBeUpdated.delete(market)

      return orderBook
    }
  }
}
