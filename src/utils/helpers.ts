import { Triangle } from '../types'
import * as _ from 'lodash'
import Opportunity from '../models/opportunity'

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
    if (triangleEquals(p.triangle, candidate.triangle)) {
      return true
    }
  }

  return false
}

export function marketIsValid (marketName: string): boolean {
  return /([A-Z]{2,5}\/[A-Z]{2,5})/.test(marketName)
}

export function numberIsDeformed(balance: number): boolean {
  return /e/.test(String(balance))
}

export function sortByProfitability(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.sort((a, b) => b.arbitrage - a.arbitrage)
}
