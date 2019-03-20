import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public closeOpportunity (opportunity: Opportunity, duration: number): void {
    try {
      opportunity.save(duration)
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }
}
