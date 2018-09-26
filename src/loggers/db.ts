import AbstractOpportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public closeOpportunity(opportunity: AbstractOpportunity): void {
    opportunity.getOne().save()
  }
}
