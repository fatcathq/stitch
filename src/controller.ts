import ArbitrageFinder from './arbitrage-finder'
import EventEmmiter from 'events'
import { OpportunityMap } from './types'
import Engine from './engine'
import Opportunity from './models/opportunity'
import Api from './connectors/api'
import log from './loggers/winston'
import Logger from './loggers/index'
import config from './utils/config'
import parseMarkets from './utils/marketParse'

const UNLOCK_ENGINE_INTERVAL = 3000

export default class StitchController extends EventEmmiter {
  private api: any
  private opportunities: OpportunityMap
  private finder: ArbitrageFinder
  private engine: Engine

  constructor () {
    super()

    this.api = new Api()
    this.opportunities = {} as OpportunityMap

    this.finder = new ArbitrageFinder()
    this.finder.linkOpportunities(this.opportunities)

    this.engine = new Engine(this.api)
    if (config.activeTrading) {
      setTimeout(() => {
        log.info(`[UNLOCKING_ENGINE] Unlocking engine after ${UNLOCK_ENGINE_INTERVAL} ms`)
        this.engine.unlock()
      } , UNLOCK_ENGINE_INTERVAL)
    }

    const logger = new Logger(this.finder)
    logger.linkOpportunities(this.opportunities)
  }

  async init (): Promise<void> {
    const markets = await parseMarkets(await this.api.loadMarkets())
    console.log(markets)

    await this.engine.init(markets)
    await this.finder.init(markets)

    this.registerListeners()
  }

  registerListeners (): void {
    this.finder.on('OpportunityAdded', async (id: number) => {
      if (!(id in this.opportunities)) {
        log.error(`[CONTROLLER] Opportunity with id: ${id} should exist on opportunity Map`)
        return
      }

      await this.handleOpportunityAdded(this.opportunities[id])
    })
  }

  private async handleOpportunityAdded (opportunity: Opportunity): Promise<void> {
    const currency = this.engine.hasExploitableCurrency(opportunity)
    if (currency === undefined) {
      log.info(`[CONTROLLER] Opportunity ${opportunity.getNodes()} is NOT exploitable`)
      return
    }

    log.info(`[CONTROLLER] Opportunity ${opportunity.getNodes()} is exploitable`)
    await this.engine.exploit(opportunity, currency)
  }

  async run (): Promise<void> {
    log.info(`[CONTROLLER] Starting finder`)
    await this.finder.run()
  }
}
