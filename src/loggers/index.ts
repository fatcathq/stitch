import Opportunity from '../models/opportunity'
import config from '../utils/config'
import ArbitrageFinder from '../arbitrage-finder'

import { SlackLogger } from './slack'
import { DatabaseLogger } from './db'
import { WinstonLogger } from './winston'

export default class {
  private dbLogging: boolean = config.log.db.enabled
  private slackLogging: boolean = config.log.slack.enabled
  private loggers: Map<string, any> = new Map()

  constructor (finder: ArbitrageFinder) {
    this.registerLoggers()

    this.registerListeners(finder)
  }

  private createOpportunity(opportunity: Opportunity) {
    this.loggers.forEach((logger) => {
      if (typeof logger.createOpportunity == 'function') {
        logger.createOpportunity(opportunity)
      }
    })
  }

  private updateOpportunity(opportunity: Opportunity, prevArb: number) {
    this.loggers.forEach((logger) => {
      if (typeof logger.updateOpportunity == 'function') {
        logger.updateOpportunity(opportunity, prevArb)
      }
    })
  }

  private closeOpportunity(opportunity: Opportunity, duration: number) {
    this.loggers.forEach((logger) => {
      if (typeof logger.closeOpportunity == 'function') {
        logger.closeOpportunity(opportunity, duration)
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

    finder.on('OpportunityClosed', (opportunity: Opportunity, duration: number) => {
      this.closeOpportunity(opportunity, duration)
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
  createOpportunity?:  (opportunity: Opportunity) => void
  updateOpportunity?: (opportunity: Opportunity, prevArb: number) => void
  closeOpportunity?: (opportunity: Opportunity, duration: number) => void
}
