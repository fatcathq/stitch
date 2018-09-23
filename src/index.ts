const ccxt = require('ccxt')

import * as _ from 'lodash'
import Graph from './models/graph'
import Opportunity from './models/opportunity'
import { calculateArbitrage } from './utils/helpers'
import config from  './utils/config'

// TODO: Merge this loggers
import { logOpportunities as slackLog } from './loggers/slack'
import { logOpportunities as dbLog } from './loggers/db'
import log from './loggers/winston'

async function main (): Promise<void> {
  log.info(`Analyzing triangular arbitrage for exchange: *${config.exchange}*, with threshold: *${config.threshold}*`)

  const api = new (ccxt as any)[config.exchange]()
  const graph = new Graph(config.exchange, await api.loadMarkets())

  recursiveMain(api, graph)
}

async function recursiveMain (api: any, graph: Graph): Promise<void> {
  let tickers: any

  try {
    tickers = await api.fetchTickers()
  } catch (e) {
    log.error(`Could not fetch tickers. Problem: ${e.message}`)
  }

  graph.update(tickers)
  const opportunities = getOpportunities(graph)
  await dbLog(opportunities)
  await slackLog(opportunities)

  if (config.repeat.should) {
    setTimeout(() => {
      recursiveMain(api, graph)
    }, config.repeat.interval)
  }
}

function getOpportunities (graph: Graph): Opportunity[] {
  let opportunities: Opportunity[] = []

  const triangles = graph.getTriangles()

  for (const triangle of triangles) {
    const arbitrage = calculateArbitrage(triangle, config.fee)

    if (arbitrage >= config.threshold) {
      opportunities.push(new Opportunity(graph.exchange, triangle, arbitrage))
    }
  }

  return opportunities
}

main().catch((e) => log.error(`[TOP_LEVEL_ERROR]: ${e.message}`))
