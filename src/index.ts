import ArbitrageFinder from './arbitrage-finder'
import config from  './utils/config'
import Logger from './loggers'
import log from './loggers/winston'
import Api from './connectors/api'
import Engine from './engine'

async function main (): Promise<void> {
  log.info(`Analyzing triangular arbitrage for exchange: *${config.exchange}*, with threshold: *${config.threshold}*`)

  const api = new Api()
  const opportunities = {}

  const finder = new ArbitrageFinder(api)
  finder.linkOpportunities(opportunities)
  await finder.init()

  const engine = new Engine(api, finder)
  engine.linkOpportunities(opportunities)
  await engine.init()

  const logger = new Logger(finder)
  logger.linkOpportunities(opportunities)

  await finder.run()
}

main().catch(
  (e) => log.error(`[TOP_LEVEL_ERROR]: ${e.message}`)
)
