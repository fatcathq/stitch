// Bitfinex
import Api from '../src/connectors/api'
import { Edge, VirtualEdge } from '../src/models/edge'
import Balance from '../src/models/balance'
import Engine from '../src/engine'
import { OrderDetails, Currency } from '../src/types'
import Decimal from 'decimal.js'

async function testEdge (
  asset: Currency,
  currency: Currency,
  isVirtual: boolean = false,
  fee = new Decimal(0.0025),
  minVolume = new Decimal(0)
): void {
  const api = new Api()
  const balance = new Balance(api)
  const precisions = Engine.marketsToPrecisions(await api.loadMarkets())
  await balance.init(precisions)

  let preTradeBalanceAsset = balance.get(asset)
  let forTradeVolume = preTradeBalanceAsset

  let edge
  if (isVirtual) {
    edge = new VirtualEdge(asset, currency, [fee, 'before'], minVolume, [precisions[asset], precisions[currency]])
  } else {
    edge = new Edge(asset, currency, [fee, 'after'], minVolume, [precisions[currency], precisions[asset]])
  }

  await edge.updateFromAPI(api)

  console.log(`[TEST] We should get Volume * Price * (1 - fee) =>`)
  console.log(`[TEST] => ${preTradeBalanceAsset} * ${edge.getPrice()} * ${fee.toNumber()} = ${forTradeVolume.mul(edge.getPrice()).mul(new Decimal(1).minus(fee))} ${currency}`)

  const details = {
    volume: forTradeVolume,
    api: api,
    mock: false
  } as OrderDetails

  console.log(`Traversal, ${await edge.traverse(details)}`)

  await balance.update()

  console.log('Real balance', balance.getAsNumber(currency))

  console.log(`[TEST] Left ${balance.getAsNumber(asset)} ${asset} in the asset unit`)
}

async function testTraverseCycle (from: Currency, to: Currency): Promise<void> {
  await testEdge(from, to, true)
}

testTraverseCycle('ETH', 'XLM')
