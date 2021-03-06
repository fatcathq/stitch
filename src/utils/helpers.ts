import { Triangle, Currency } from '../types'
import * as _ from 'lodash'
import Opportunity from '../models/opportunity'
import Decimal from 'decimal.js'
import axios from 'axios'

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
  return /([A-Za-z0-9]{2,10}\/[A-Za-z0-9]{2,10})/.test(marketName)
}

export function numberIsDeformed (balance: number): boolean {
  return /e/.test(String(balance))
}

export function sortByProfitability (opportunities: Opportunity[]): Opportunity[] {
  return opportunities.sort((a, b) => b.arbitrage.minus(a.arbitrage).toNumber())
}

export async function sleep (ms: number): Promise<any> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getRotated (array: any[], count: number): any[] {
  // save references to array functions to make lookup faster
  let len = array.length >>> 0 // convert to uint
  count = count >> 0 // convert to int

  // convert count to value in range [0, len)
  count = ((count % len) + len) % len

  // use splice.call() instead of this.splice() to make function generic
  Array.prototype.push.apply(array, Array.prototype.splice.call(array, 0, count))

  return array
}

export function financial (num: number | string | Decimal, precision: number): Decimal {
  const n = new Decimal(num)

  return new Decimal(n.toFixed(precision))
}

export async function getRates (units: Currency[], target: string): Promise<{[key: string]: Number}> {
  const BASE_URL = 'https://min-api.cryptocompare.com/data/price'
  const url = `${BASE_URL}?fsym=${target}&tsyms=${units.join(',')}`

  return axios.get(url).then(r => r.data)
}
