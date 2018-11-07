import client from '../connectors/winston'
import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class WinstonLogger implements LoggerInterface {
  public createOpportunity(opportunity: Opportunity): void {
    const [n1, n2, n3] = opportunity.getNodes()

    client.info(`[OPPORTUNITY_OPEN ${opportunity.exchange}]: *${n1}, ${n2}, ${n3}*. Profit: *${(opportunity.arbitrage.minus(1).toNumber()) * 100} %*`)
  }

  public updateOpportunity(opportunity: Opportunity, prevArb: number): void {
    const [n1, n2, n3] = opportunity.getNodes()

    client.info(`[OPPORTUNITY_UPDATE ${opportunity.exchange}]: Triangle *${n1}, ${n2}, ${n3}*. Changed arbitrage from ${prevArb} to ${opportunity.arbitrage.toNumber()}`)
  }

  public closeOpportunity(opportunity: Opportunity, duration: number): void {
    const [n1, n2, n3] = opportunity.getNodes()

    client.info(`[OPPORTUNITY_CLOSE ${opportunity.exchange}]: *${n1}, ${n2}, ${n3}*. Duration of opportunity: ${duration} ms`)
  }
}

export default client
