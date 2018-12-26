const BittrexOrderBook = require('bittrex-orderbook')

// TODO: Consider changing that for security reasons
require('events').EventEmitter.defaultMaxListeners = 300

const loadOBEmmiter = (bit: any, marketName: string) => {
  bit.market(marketName)
}

export default async (markets: any) => {
  const emmiter = new BittrexOrderBook()

  for (const market of markets) {
    loadOBEmmiter(emmiter, market)
  }

  return emmiter
}
