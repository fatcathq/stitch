import * as _ from 'lodash'
import Graph from './graph'
const ccxt = require('ccxt')
import { Opportunity } from './types'
import { sendToSlack, log } from './logger'
import { calculateArbitrage } from './helpers'

const FEE: number = 0.002
const THRESHOLD = 1
const EXCHANGE = 'bitfinex'

//Zero if should not repeat, otherwise interval in ms
const INTERVAL = 0

async function main (): Promise<void> {
  sendToSlack(`Analyzing triangular arbitrage for exchange: *${EXCHANGE}*, with threshold: *${THRESHOLD}*`)

  const api = new (ccxt as any)[EXCHANGE]()

  recursiveMain(api)
}

async function recursiveMain (api: any): Promise<void> {
  let tickers: any

  try {
    tickers = await api.fetchTickers()
  } catch (e) {
    console.log(`Could not fetch tickers. Problem: ${e.message}`)
  }

  const graph = Graph.constructGraphFromTickers(tickers, FEE)
  const opportunities = getOpportunities(EXCHANGE, graph)
  log(opportunities)

  if (INTERVAL > 0) {
    setTimeout(() => {
      recursiveMain(api)
    }, INTERVAL)
  }
}

function getOpportunities (exchange: string, graph: Graph): Opportunity[] {
  let opportunities: Opportunity[] = []

  const triangles = graph.getTriangles()

  for (const triangle of triangles) {
    const arbitrage = calculateArbitrage(triangle)

    if (arbitrage >= THRESHOLD) {
      opportunities.push({
        exchange: exchange,
        arbitrage: arbitrage,
        triangle: triangle
      })
    }
  }

  return opportunities
}

main()
