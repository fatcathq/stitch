const ccxt = require('ccxt')
const mem = require('mem')
const fetch = require('fetch-ponyfill')().fetch
import log from '../loggers/winston'

import config from  '../utils/config'

export default class instance extends ccxt[config.exchange] {
  constructor() {
    super({ apiKey: config.api.key, secret: config.api.secret, enableRateLimit: true })
    this.fetchImplementation = (url: string, ...args: any[]) => {
      log.info(`[REQUEST] ${url}`)
      if (args[0].body !== undefined) {
        log.info(`[REQUEST] Body: ${args[0].body}`)
      }
      return fetch(url, ...args)
    }
  }

  private _fetchOrderBook = mem(super.fetchOrderBook, { maxAge: config.cacheTime})

  public async fetchOrderBook (market: string, limit: number) {
    return this._fetchOrderBook(market, limit)
  }
}
