const BittrexOrderBook = require('bittrex-orderbook')
import log from '../loggers/winston'

// TODO: Consider changing that for security reasons

export default class extends BittrexOrderBook {
  public loadMarkets (marketIds: any): void {
    log.info('Loading emmiter for all markets given')
    for (const market of marketIds) {
      this.market(market)
    }
  }
}
