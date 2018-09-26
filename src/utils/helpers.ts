import { Triangle } from '../types'
import * as _ from 'lodash'
import AbstractOpportunity from '../models/opportunity'

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

export function opportunityExists (candidate: AbstractOpportunity, opportunities: AbstractOpportunity[]): boolean {
  for (const p of opportunities) {
    if (_.isEqual(p.nodes, candidate.nodes)) {
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

export function sortByProfitability(opportunities: AbstractOpportunity[]): AbstractOpportunity[] {
  return opportunities.sort((a, b) => b.arbitrage - a.arbitrage)
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve,ms))
}

export function getRotated(array: any[], times: number = 1) {
  return array.slice(array.length - times).concat(array.slice(0, array.length - times))
}
