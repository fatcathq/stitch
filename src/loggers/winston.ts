import client from '../connectors/winston'
import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class WinstonLogger implements LoggerInterface {
  public createOpportunity(opportunity: Opportunity) {
    const [n1, n2, n3] = opportunity.triangle.map(e => e.source)

    client.info(`[OPPORTUNITY_OPEN ${opportunity.exchange}]: *${n1}, ${n2}, ${n3}*. Profit: *${(opportunity.arbitrage - 1) * 100} %*`)
  }

  public updateOpportunity(opportunity: Opportunity, prevArb: number): void {
    const [n1, n2, n3] = opportunity.triangle.map(e => e.source)

    client.info(`[OPPORTUNITY_UPDATE ${opportunity.exchange}]: *${n1}, ${n2}, ${n3}*. Changed arbitrage from ${prevArb} to ${opportunity.arbitrage}`)
  }
}

export default client
