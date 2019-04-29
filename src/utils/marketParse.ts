import { Market, Currency } from '../types'
import * as _ from 'lodash'
import { getRates } from './helpers'
import Decimal from 'decimal.js'

export default (markets: any): Market[] => {
  const parsedMarkets: Market[] = []

  _.forEach(markets, (market: any) => {
    parsedMarkets.push({
      symbol: market.symbol,
      base: market.base,
      quote: market.quote,
      fee: new Decimal(market.taker),
      minBaseVolume: new Decimal(market.info.base_min_size),
      precisions: {
        base: market.precision.amount,
        quote: market.precision.price
      }
    })
  })

  return parsedMarkets
}

export async function calculateMinBaseVolumes (markets: any): Promise<{[key: string]: Number}> {
  const cryptos = getCurrencies(markets, ['USD'])
  const rates = await getRates(cryptos, 'USD')

  return _.mapValues(rates, (rate: any) => rate * 10)
}

export function getCurrencies (markets: any, except: Currency[]): Currency[] {
  let cryptos = new Set()

  _.forEach(markets, (market: any) => cryptos.add(market.base))

  except.forEach((currency: Currency) => cryptos.delete(currency))

  return Array.from(cryptos)
}
