const ccxt = require('ccxt')
const mem = require('mem')
const fetch = require('fetch-ponyfill')().fetch
import log from '../loggers/winston'
const RateLimiter = require('stopcock')

import config from  '../utils/config'

export default class instance extends ccxt[config.exchange] {
  constructor() {
    super({ apiKey: config.api.key, secret: config.api.secret, timeout: 100000000 })

    this.fetchImplementation = new RateLimiter(this.fetchWithCache, { limit: 1, interval: 1000, bucketSize: 1 })
  }

  private _fetchOrderBook = mem(super.fetchOrderBook, { maxAge: config.cacheTime })

  public async fetchOrderBook (market: string, limit: number) {
    return this._fetchOrderBook(market, limit)
  }

  public emptyCache () {
    log.info(`[CACHE] Emptying queue`)
    this.fetchImplementation = new RateLimiter(this.fetchWithCache, { limit: 1, interval: 2000, bucketSize: 1 })
  }

  private async fetchWithCache (url: string, ...args: any[]) {
    const now = Date.now()
    const res = await fetch(url, ...args)

    log.info(`[REQUEST] ${url}, duration: ${Date.now() - now} ms`)

    return res
  }
}
