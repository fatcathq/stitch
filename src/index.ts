const ccxt = require('ccxt')

import ArbitrageFinder from './arbitrage-finder'
import config from  './utils/config'
import Logger from './loggers'
import log from './loggers/winston'

async function main (): Promise<void> {
  log.info(`Analyzing triangular arbitrage for exchange: *${config.exchange}*, with threshold: *${config.threshold}*`)

  const api = new (ccxt as any)[config.exchange]()

  const finder = new ArbitrageFinder(api)

  await finder.init()

  new Logger(finder)
  
  await finder.run()
}

main().catch(
  (e) => log.error(`[TOP_LEVEL_ERROR]: ${e.message}`)
)
