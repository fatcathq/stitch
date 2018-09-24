import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public createOpportunity(opportunity: Opportunity): void {
    opportunity.save()
  }
}
