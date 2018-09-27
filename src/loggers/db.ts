import OpportunitySet from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public closeOpportunity(opportunity: OpportunitySet): void {
    try {
      opportunity.getOne().save()
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }
}
