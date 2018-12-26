import Api from './connectors/api'
import * as _ from 'lodash'

const BittrexOrderBook = require('bittrex-orderbook')
require('events').EventEmitter.defaultMaxListeners = 300

const api = new Api()

const getMarkets = async () => {
  const marketData = await api.fetchMarkets()

  return marketData.map((res: any) => res.id)
}

const loadOBEmmiter = (bit: any, marketName: string) => {
  bit.market(marketName)
}

const createAllMarketEmmiters = async () => {
  const emmiter = new BittrexOrderBook()
  const markets = await getMarkets()

  for (const market of markets) {
    loadOBEmmiter(emmiter, market)
  }

  return emmiter
}

const addOBTLogger = async (marketName: string, marketEmmiter: any) => {
  marketEmmiter.on('askUpdate', (market: any) => {
    console.log(`${marketName} asks`, market.bids.top(1)[0])
  })

  marketEmmiter.on('bidUpdate', (market: any) => {
    console.log(`${marketName} bids`, market.bids.top(1)[0])
  })
}

const main = async () => {
  const emmiter = await createAllMarketEmmiters()

  for (let marketName in emmiter.markets) {
    addOBTLogger(marketName, emmiter.markets[marketName])
  }
}

main()
