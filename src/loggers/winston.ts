import client from '../connectors/winston'
import OpportunitySet from '../models/opportunity'
import { LoggerInterface } from './'

export class WinstonLogger implements LoggerInterface {
  public createOpportunity(opportunity: OpportunitySet): void {
    
    const [n1, n2, n3] = opportunity.getOne().triangle.map(e => e.source)

    client.info(`[OPPORTUNITY_OPEN ${opportunity.exchange}]: *${n1}, ${n2}, ${n3}*. Profit: *${(opportunity.arbitrage - 1) * 100} %*`)
  }

  public updateOpportunity(opportunity: OpportunitySet, prevArb: number): void {
    const [n1, n2, n3] = opportunity.getOne().triangle.map(e => e.source)

    client.info(`[OPPORTUNITY_UPDATE ${opportunity.exchange}]: Triangle *${n1}, ${n2}, ${n3}*. Changed arbitrage from ${prevArb} to ${opportunity.arbitrage}`)
  }

  public closeOpportunity(opportunity: OpportunitySet, duration: number): void {
    const [n1, n2, n3] = opportunity.getOne().triangle.map(e => e.source)

    client.info(`[OPPORTUNITY_CLOSE ${opportunity.exchange}]: *${n1}, ${n2}, ${n3}*. Duration of opportunity: ${duration} ms`)
  }
}

export default client
