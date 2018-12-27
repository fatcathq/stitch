import Api from '../src/connectors/api'
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

const addOBTLogger = async (marketName: string, freqMap: any, marketEmmiter: any) => {
  marketEmmiter.on('bidUpdate', (market: any) => {
    console.log(`${marketName} bids`, market.bids.top(1)[0], `. Times called ${freqMap[marketName][0]++}`)
  })

  marketEmmiter.on('askUpdate', (market: any) => {
    console.log(`${marketName} asks`, market.asks.top(1)[0], `. Times called ${freqMap[marketName][1]++}`)
  })
}

const main = async () => {
  const emmiter = await createAllMarketEmmiters()
  let freqMap = _.zipObject(Object.keys(emmiter.markets), _.times(Object.keys(emmiter.markets).length, _.constant([0, 0])))

  for (let marketName in emmiter.markets) {
    addOBTLogger(marketName, freqMap, emmiter.markets[marketName])
  }
}

main()
