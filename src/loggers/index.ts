import OpportunitySet from '../models/opportunity'
import config from '../utils/config'
import { OpportunitySets } from '../types'
import Notifier from '../utils/notifier'

import { SlackLogger } from './slack'
import { DatabaseLogger } from './db'
import { WinstonLogger } from './winston'

export default class {
  private opportunities: OpportunitySets = {}
  private dbLogging: boolean = config.log.db.enabled
  private slackLogging: boolean = config.log.slack.enabled
  private loggers: Map<string, any> = new Map()

  constructor () {
    this.registerLoggers()
    this.registerListeners()
  }

  private createOpportunity(opportunity: OpportunitySet) {
    this.loggers.forEach((logger) => {
      if (typeof logger.createOpportunity == 'function') {
        logger.createOpportunity(opportunity)
      }
    })
  }

  public linkOpportunities (opportunities: OpportunitySets) {
    this.opportunities = opportunities
  }

  private updateOpportunity(opportunity: OpportunitySet, prevArb: number) {
    this.loggers.forEach((logger) => {
      if (typeof logger.updateOpportunity == 'function') {
        logger.updateOpportunity(opportunity, prevArb)
      }
    })
  }

  private closeOpportunity(opportunity: OpportunitySet, duration: number) {
    this.loggers.forEach((logger) => {
      if (typeof logger.closeOpportunity == 'function') {
        logger.closeOpportunity(opportunity, duration)
      }
    })
  }

  private registerListeners (): void {
    Notifier.on('OpportunityAdded', (id: string) => {
      this.createOpportunity(this.opportunities[id])
    })

    Notifier.on('OpportunityUpdated', (id: string, prevArb: number) => {
      this.updateOpportunity(this.opportunities[id], prevArb)
    })

    Notifier.on('OpportunityClosed', (opportunity: OpportunitySet, duration: number) => {
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
  createOpportunity?:  (opportunity: OpportunitySet) => void
  updateOpportunity?: (opportunity: OpportunitySet, prevArb: number) => void
  closeOpportunity?: (opportunity: OpportunitySet, duration: number) => void
}
