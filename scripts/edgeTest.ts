// Bitfinex
import Api from '../src/connectors/api'
import { Edge, VirtualEdge } from '../src/models/edge'
import Balance from '../src/models/balance'
import { OrderDetails, Currency } from '../src/types'

async function testEdge (asset: Currency, currency: Currency, isVirtual: boolean = false, fee: number = 0.002, minVolume: number = 0) {
  const api = new Api()

  const balance = new Balance(api)
  await balance.init()

  const prev_balance_asset = balance.get(asset)
  const prev_balance_currency = balance.get(currency)

  let edge
  if (isVirtual) {
    edge = new VirtualEdge(asset, currency, fee, minVolume)
  }
  else {
    edge = new Edge(asset, currency, fee, minVolume)
  }

  await edge.updateFromAPI(api)

  console.log(`[TEST] We should get volume = ${prev_balance_asset} * price = ${edge.getPrice()} * (1 - fee = ${fee})= ${prev_balance_asset * edge.getPrice() * (1 - fee)} ${currency}`)

  const details = {
    volume: prev_balance_asset,
    api: api,
    mock: false
  } as OrderDetails

  await edge.traverse(details)

  await balance.update()

  const new_balance_asset = balance.get(asset)
  const new_balance_currency = balance.get(currency)

  console.log(`[TEST] Got ${new_balance_currency} - ${prev_balance_currency !== undefined ? prev_balance_asset : 0} ${currency}`)
  console.log(`[TEST] Left ${new_balance_asset !== undefined ? new_balance_asset : 0} ${asset} in the asset unit`)
}

async function testTraverseCycle (from: Currency, to: Currency) {
  await testEdge(from, to)
  await testEdge(to, from, true)
}

testTraverseCycle('LTC', 'BTC')
