const BittrexOrderBook = require('bittrex-orderbook')
import log from '../loggers/winston'

// TODO: Consider changing that for security reasons
require('events').EventEmitter.defaultMaxListeners = 300

export default class extends BittrexOrderBook {
  public async loadMarkets (marketIds: any): Promise<void> {
    log.info('Loading emmiter for all markets given')
    for (const market of marketIds) {
      await this.market(market)
    }
  }
}
