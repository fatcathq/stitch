const ccxt = require('ccxt')

import log from '../loggers/winston'
import config from  '../utils/config'
import Cache from '../utils/api-cache'

export default class instance extends ccxt[config.exchange] {
  public cache: Cache = new Cache();

  constructor() {
    super({ enableRateLimit: true })
  }

  public async fetchOrderBook (market: string, limit: number) {
    if (this.cache.hasFreshOrderBook(market, config.cacheTime)) {
      log.info(`Using cached orderBook of market ${market}.`)
      return this.cache.getOrderBook(market)
    }
    else {
      log.info(`No cached orderbook for market ${market}. Requesting from api`)
      const orderBook = await super.fetchOrderBook(market, limit)
      this.cache.updateOrderBook(market, orderBook)

      return orderBook
    }
  }
}
