const ccxt = require('ccxt')
const mem = require('mem')

import config from  '../utils/config'

export default class instance extends ccxt[config.exchange] {
  constructor() {
    super({ apiKey: config.api.key, secret: config.api.secret })
  }

  private _fetchOrderBook = mem(super.fetchOrderBook, { maxAge: config.cacheTime})

  public async fetchOrderBook (market: string, limit: number) {
    return this._fetchOrderBook(market, limit)
  }
}
