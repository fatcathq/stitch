import { Triangle, Volume, Currency } from '../types'
import * as _ from 'lodash'
import Opportunity from '../models/opportunity'
import Decimal from 'decimal.js'

const DECIMAL_POINT_PRECISION = 6

export function triangleEquals (triangleA: Triangle, triangleB: Triangle): boolean {
  const nodesA = triangleA.map(a => a.source)
  const nodesB = triangleB.map(a => a.source)

  return _.isEmpty(_.difference(nodesA, nodesB))
}

export function triangleExists (candidate: Triangle, triangles: Triangle[]): boolean {
  for (let triangle of triangles) {
    if (triangleEquals(candidate, triangle)) {
      return true
    }
  }
  return false
}

export function opportunityExists (candidate: Opportunity, opportunities: Opportunity[]): boolean {
  for (const p of opportunities) {
    if (_.isEqual(p.getNodes(), candidate.getNodes())) {
      return true
    }
  }

  return false
}

export function marketIsValid (marketName: string): boolean {
  return /([A-Za-z ]{2,5}\/[A-Za-z ]{2,5})/.test(marketName)
}

export function numberIsDeformed(balance: number): boolean {
  return /e/.test(String(balance))
}

export function sortByProfitability(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.sort((a, b) => b.arbitrage - a.arbitrage)
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve,ms))
}

export function getRotated (array: any[], count: number) {
  // save references to array functions to make lookup faster
  var len = array.length >>> 0, // convert to uint
      count = count >> 0; // convert to int

  // convert count to value in range [0, len)
  count = ((count % len) + len) % len;

  // use splice.call() instead of this.splice() to make function generic
  Array.prototype.push.apply(array, Array.prototype.splice.call(array, 0, count));

  return array
}

export function financial(num: number | string | Decimal, precision = DECIMAL_POINT_PRECISION): Decimal {
  const n = new Decimal(num)

  return new Decimal(n.toFixed(precision))
}

export function smartCompare(a: Volume, b: Volume, unit: Currency) {
  switch (unit) {
    case 'BTC':
      return financial(a, 7) === financial(b, 7)
    break
    case 'ETH':
      return financial(a, 6) === financial(b, 6)
    break
    case 'BTC':
      return financial(a, 6) === financial(b, 6)
    break
    default:
      return financial(a, 5) === financial(b, 5)
    break
  }
}
