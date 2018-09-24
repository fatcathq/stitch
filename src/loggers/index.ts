import Opportunity from '../models/opportunity'
import config from '../utils/config'

//TODO: ;Rewrite logging architecture
import { logOpportunities as slackLog } from './slack'
import { logOpportunities as dbLog } from './db'
import { logOpportunities as consoleLog } from './winston'

export default async function logOpportunities(opportunities: Opportunity[]) {
  if (config.log.db.enabled) {
    dbLog(opportunities) 
  }

  if (config.log.slack.enabled) {
    await slackLog(opportunities) 
  }

  consoleLog(opportunities) 
}
