import { Market, Currency } from '../types'
import * as _ from 'lodash'
import { getRates } from './helpers'
import Decimal from 'decimal.js'

export default async (markets: any): Promise<Market[]> => {
  const minVolumes = await calculateMinBaseVolumes(markets)
  const parsedMarkets: Market[] = []

  _.forEach((market: any) => {
    parsedMarkets.push({
      symbol: market.symbol,
      base: market.base,
      quote: market.quote,
      fee: new Decimal(market.taker),
      minBaseVolume: new Decimal(minVolumes[market.base]),
      precisions: {
        base: market.precision.amount,
        quote: market.precision.price
      }
    })
  })

  return parsedMarkets
}

// Considering 10USD is min trade volume.
// TODO: Move that logic somewhere else
const calculateMinBaseVolumes = async (markets: any) => {
  const cryptos = getCurrencies(markets, ['USD'])
  const rates = await getRates(cryptos, 'USD')

  return _.mapValues(rates, (rate: any) => rate * 10)
}

const getCurrencies = (markets: any, except: Currency[]): Currency[] => {
  let cryptos = new Set()

  _.forEach(markets, (market: any) => cryptos.add(market.base))

  except.forEach((currency: Currency) => cryptos.delete(currency))

  return Array.from(cryptos)
}
