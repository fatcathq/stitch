import Opportunity from '../models/opportunity'
import config from '../utils/config'
import ArbitrageFinder from '../arbitrage-finder'

import { SlackLogger } from './slack'
import { DatabaseLogger } from './db'
import log, { WinstonLogger } from './winston'

export default class {
  private dbLogging: boolean = config.log.db.enabled
  private slackLogging: boolean = config.log.slack.enabled
  private loggers: Map<string, any> = new Map()

  constructor (finder: ArbitrageFinder) {
    this.registerLoggers()

    this.registerListeners(finder)
  }

  private createOpportunity(opportunity: Opportunity) {
    this.loggers.forEach((logger, source: string) => {
      try {
        logger.createOpportunity(opportunity)
      } catch (e) {
        log.warn(`Can't log createOpportunity for logger ${source}. Function doesn't exist.`)
      }

    })
  }

  private updateOpportunity(opportunity: Opportunity, prevArb: number) {
    this.loggers.forEach((logger, source: string) => {
      try {
        logger.updateOpportunity(opportunity, prevArb)
      } catch (e) {
        log.warn(`Can't log updateOpportunity for logger ${source}. Function doesn't exist.`)
      }
    })
  }

  private registerListeners (finder: ArbitrageFinder): void {
    finder.on('OpportunityFound', (opportunity: Opportunity) => {
      this.createOpportunity(opportunity)
    })

    finder.on('OpportunityUpdated', (opportunity: Opportunity, prevArb: number) => {
      this.updateOpportunity(opportunity, prevArb)
    })
  }

  private registerLoggers() {
    if (this.dbLogging) {
      this.loggers.set('db', new DatabaseLogger())
    }

    if (this.slackLogging) {
      this.loggers.set('slack', new SlackLogger())
    }

    this.loggers.set('winston', new WinstonLogger())
  }
}

export interface LoggerInterface {
  createOpportunity:  (opportunity: Opportunity) => void
  updateOpportunity?: (opportunity: Opportunity, prevArb: number) => void
  deleteOpportunity?: (opportunity: Opportunity) => void
}
