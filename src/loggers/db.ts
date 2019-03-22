import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class DatabaseLogger implements LoggerInterface {
  public async closeOpportunity (opportunity: Opportunity, duration: number): Promise<void> {
    try {
      void opportunity.save(duration)
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }
}
