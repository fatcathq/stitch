import AbstractOpportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public closeOpportunity(opportunity: AbstractOpportunity): void {
    try {
      opportunity.getOne().save()
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }
}
