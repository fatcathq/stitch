import ArbitrageFinder from './arbitrage-finder'
import EventEmmiter from 'events'
import { OpportunityMap } from './types'
import Engine from './engine'
import Opportunity from './models/opportunity'
import Api from './connectors/api'
import log from './loggers/winston'
import Logger from './loggers/index'

export default class StitchController extends EventEmmiter {
  private api: any
  private opportunities: OpportunityMap
  private finder: ArbitrageFinder
  private engine: Engine

  constructor () {
    super()

    this.api = new Api()
    this.opportunities = {} as OpportunityMap

    this.finder = new ArbitrageFinder(this.api)
    this.finder.linkOpportunities(this.opportunities)

    this.engine = new Engine(this.api)

    const logger = new Logger(this.finder)
    logger.linkOpportunities(this.opportunities)
  }

  async init() {
    await this.engine.init()
    await this.finder.init()

    this.registerListeners()
  }

  registerListeners() {
    this.finder.on('OpportunityAdded', async (id: number) => {
      if (this.opportunities[id] === undefined) {
        log.error(`[CONTROLLER] Opportunity with id: ${id} should exist on opportunity Map`)
      }

      await this.handleOpportunityAdded(this.opportunities[id])
    })
  }

  private async  handleOpportunityAdded (opportunity: Opportunity) {
    if (this.engine.isLocked()) {
      log.info(`[CONTROLLER] Engine is locked. Skipping opportunity ${opportunity.getNodes()}`)
      return
    }

    const currency = this.engine.hasExploitableCurrency(opportunity)
    if (currency === undefined) {
      log.info(`[CONTROLLER] Opportunity ${opportunity.getNodes()} is NOT exploitable`)
      return
    }

    this.finder.pause()
    log.info(`[CONTROLLER] Opportunity ${opportunity.getNodes()} is exploitable`)
    await this.engine.exploit(opportunity, currency)
  }

  async run() {
    log.info(`[CONTROLLER] Starting finder`)
    await this.finder!.run()
  }
}
