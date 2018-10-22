// Bitfinex
import Api from '../src/connectors/api'
import { Edge, VirtualEdge } from '../src/models/edge'
import Balance from '../src/models/balance'
import Engine from '../src/engine'
import { OrderDetails, Currency } from '../src/types'
import { financial } from '../src/utils/helpers'

async function testEdge (asset: Currency, currency: Currency, isVirtual: boolean = false, fee: number = 0.0020, minVolume: number = 0) {
  const api = new Api()
  const balance = new Balance(api)
  const precisions = Engine.marketsToPrecisions(await api.loadMarkets())
  await balance.init(precisions)

  let preTradeBalanceAsset = balance.get(asset)
  let forTradeVolume = preTradeBalanceAsset

  let edge
  if (isVirtual) {
    edge = new VirtualEdge(asset, currency, fee, minVolume, [precisions[asset], precisions[currency]])
  }
  else {
    edge = new Edge(asset, currency, fee, minVolume, [precisions[currency], precisions[asset]])
  }

  await edge.updateFromAPI(api)

  console.log(`[TEST] We should get Volume * Price * (1 - fee) =>`)
  console.log(`[TEST] => ${preTradeBalanceAsset} * ${edge.getPrice()} * ${1 - fee} = ${forTradeVolume * edge.getPrice() * (1 - fee)} ${currency}`)

  const details = {
    volume: forTradeVolume,
    api: api,
    mock: false
  } as OrderDetails

  await edge.traverse(details)
  const afterTradeBalanceEstimation = preTradeBalanceAsset * edge.getPrice() * (1 - fee)

  await balance.update()

  //console.log('After trade balance from api:', afterTradeBalanceAPI)
  console.log('After trade balance from estimation:', financial(afterTradeBalanceEstimation, precisions[currency]))
  console.log('Real balance', balance.get(currency))

  console.log(`[TEST] Left ${balance.get(asset)} ${asset} in the asset unit`)
}

async function testTraverseCycle (from: Currency, to: Currency) {
  await testEdge(from, to, true)
}

testTraverseCycle('BTC', 'ZEC')
