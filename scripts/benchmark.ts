// Bitfinex
import Api from '../src/connectors/api'
import { Edge, VirtualEdge } from '../src/models/edge'
import Balance from '../src/models/balance'
import { Currency } from '../src/types'
import Decimal from 'decimal.js'

async function testEdge (
  asset: Currency,
  currency: Currency,
  isVirtual = false,
  fee = new Decimal(0.0025),
  minVolume = new Decimal(0)
): Promise<void> {
  const api = new Api()
  const balance = new Balance(api)

  await balance.update()

  let preTradeBalanceAsset = balance.get(asset)
  let forTradeVolume = preTradeBalanceAsset

  let edge
  if (isVirtual) {
    edge = new VirtualEdge(asset, currency, [fee, 'before'], minVolume, [8, 8])
  } else {
    edge = new Edge(asset, currency, [fee, 'after'], minVolume, [8, 8])
  }

  await edge.updateFromAPI(api)

  await edge.traverse({
    type: 'limit',
    volume: forTradeVolume,
    api: api,
    mock: false
  })

  await balance.update()
}

async function testTraverseCycle (from: Currency, to: Currency): Promise<void> {
  await testEdge(from, to, true)
  await testEdge(to, from, false)
}

testTraverseCycle('BTC', 'XLM')
