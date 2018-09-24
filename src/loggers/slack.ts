import client from '../connectors/slack'
import Opportunity from '../models/opportunity'
import { LoggerInterface } from './'

export class SlackLogger implements LoggerInterface {
  public createOpportunity(opportunity: Opportunity): void {
    const [n1, n2, n3] = opportunity.triangle.map(e => e.source)

    client(`New arbitrage opportunity on *${opportunity.exchange}*. Triangle: *${n1}, ${n2}, ${n3}*. Profit: *${(opportunity.arbitrage - 1) * 100} %*`)
  }
}
