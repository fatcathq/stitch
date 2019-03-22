import config from './utils/config'
import Controller from './controller'
import log from './loggers/winston'
// import Engine from './engine'

async function main (): Promise<void> {
  log.info(`Analyzing triangular arbitrage for exchange: *${config.exchange}*, with threshold: *${config.threshold}*`)

  const controller = new Controller()
  await controller.init()
  await controller.run()
}

main().catch(
  (e) => console.log(e)
)
