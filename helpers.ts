import { Triangle, Market, Opportunity } from './types'
import * as _ from 'lodash'
import { Edge as EdgeDriver } from './edge'

function triangleEquals (triangleA: Triangle, triangleB: Triangle): boolean {
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

export function marketIsValid (market: Market): boolean {
  // Filter for inconsistent results. Happens mainly in binance
  return !/e/.test(String(market.bid))
    && !/e/.test(String(market.ask))
    && /([A-Z]{2,5}\/[A-Z]{2,5})/.test(market.symbol)
    && market.bid !== 0
    && market.ask !== 0
}

//Calculate arbitrage by getting the product of the (after fee) edge weights  
export function calculateArbitrage (triangle: Triangle, fee: number): number {
  return triangle.map((e: EdgeDriver) => e.getWeight()).reduce((acc, v) => acc * (1 - fee) * v, 1)
}

// TODO: Change that to Bellman Ford (?)
export function getMinVolume (triangle: Triangle): number {
  let volumeIt = triangle[0].volume

  for (const edge of triangle) {
    if (volumeIt > edge.volume) {
      volumeIt = edge.volume
    }

    volumeIt *= edge.price
  }

  return volumeIt
}

export function numberIsDeformed(balance: number): boolean {
  return /e/.test(String(balance))
}

export function sortByProfitability(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.sort((a, b) => b.arbitrage - a.arbitrage)
}
