import client from '../connectors/slack'
import OpportunitySet from '../models/opportunity'
import { LoggerInterface } from './'

export class SlackLogger implements LoggerInterface {
  /*
  public createOpportunity(opportunity: Opportunity): void {
    const [n1, n2, n3] = opportunity.triangle.map(e => e.source)

    client(`New arbitrage opportunity on *${opportunity.exchange}*: Triangle: *${n1}, ${n2}, ${n3}*. Profit: *${(opportunity.arbitrage - 1) * 100} %*`)
  }

  public updateOpportunity(opportunity: Opportunity, prevArb: number): void {
    const [n1, n2, n3] = opportunity.triangle.map(e => e.source)

    client(`[OPPORTUNITY_UPDATE ${opportunity.exchange}]: Triangle *${n1}, ${n2}, ${n3}*. Changed arbitrage from ${prevArb} to ${opportunity.arbitrage}`)
  }
  */

  public closeOpportunity (opportunity: OpportunitySet, duration: number): void {
    const [n1, n2, n3] = opportunity.getNodes()
    // tslint:disable-next-line
    let str = `Opportunity closed on *${opportunity.exchange}*: Triangle *${n1}, ${n2}, ${n3}*. Duration of existence: ${duration} ms. Profit: ${(opportunity.arbitrage.minus(1)).toNumber() * 100} %`

    for (const edge of opportunity.triangle) {
      str += `\n${edge.toString()} last updated before *${Date.now() - edge.lastUpdatedTs} ms*. Volume: *${edge.volume} ${edge.source}*`
    }

    void client(str)
  }
}
