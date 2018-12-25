import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public closeOpportunity (opportunity: Opportunity): void {
    try {
      // tslint:disable-next-line
      opportunity.save()
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }
}
