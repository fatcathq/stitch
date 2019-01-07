import Api from '../src/connectors/api'
import * as _ from 'lodash'

const BittrexOrderBook = require('bittrex-orderbook')
const api = new Api()

const getMarkets = async () => {
  const marketData = await api.fetchMarkets()

  return marketData.map((res: any) => res.id)
}

const loadOBemitter = (bit: any, marketName: string) => {
  bit.market(marketName)
}

const createAllmarketEmitters = async () => {
  const emitter = new BittrexOrderBook()
  const markets = await getMarkets()

  for (const market of markets) {
    loadOBemitter(emitter, market)
  }

  return emitter
}

const addOBTLogger = async (marketName: string, freqMap: any, marketEmitter: any) => {
  marketEmitter.on('bidUpdate', (market: any) => {
    console.log(`${marketName} bids`, market.bids.top(1)[0], `. Times called ${freqMap[marketName][0]++}`)
  })

  marketEmitter.on('askUpdate', (market: any) => {
    console.log(`${marketName} asks`, market.asks.top(1)[0], `. Times called ${freqMap[marketName][1]++}`)
  })
}

const main = async () => {
  const emitter = await createAllmarketEmitters()
  let freqMap = _.zipObject(Object.keys(emitter.markets), _.times(Object.keys(emitter.markets).length, _.constant([0, 0])))

  for (let marketName in emitter.markets) {
    addOBTLogger(marketName, freqMap, emitter.markets[marketName])
  }
}

main()
