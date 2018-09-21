const ccxt = require('ccxt')

import * as _ from 'lodash'
import Graph from './graph'
import { Opportunity } from './types'
import { slackLogOpportunities } from './loggers/slack'
import log from './loggers/winston'
import { calculateArbitrage } from './helpers'
import config from  './config'

async function main (): Promise<void> {
  log.info(`Analyzing triangular arbitrage for exchange: *${config.exchange}*, with threshold: *${config.threshold}*`)

  const api = new (ccxt as any)[config.exchange]()

  recursiveMain(api)
}

async function recursiveMain (api: any): Promise<void> {
  let tickers: any

  try {
    tickers = await api.fetchTickers()
  } catch (e) {
    log.error(`Could not fetch tickers. Problem: ${e.message}`)
  }

  const graph = Graph.constructGraphFromTickers(tickers, config.fee)
  const opportunities = getOpportunities(graph)
  slackLogOpportunities(opportunities)

  if (config.repeat.should) {
    setTimeout(() => {
      recursiveMain(api)
    }, config.repeat.interval)
  }
}

function getOpportunities (graph: Graph): Opportunity[] {
  let opportunities: Opportunity[] = []

  const triangles = graph.getTriangles()

  for (const triangle of triangles) {
    const arbitrage = calculateArbitrage(triangle, config.fee)

    if (arbitrage >= config.threshold) {
      opportunities.push({
        arbitrage: arbitrage,
        triangle: triangle
      })
    }
  }

  return opportunities
}

main().catch((e) => log.error(`[TOP_LEVEL_ERROR]: ${e.message}`))
