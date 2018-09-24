import Opportunity from '../models/opportunity'
import config from '../utils/config'
import { send as sendToSlack } from '../connectors/slack'

export function logOpportunities (opportunities: Opportunity[]): void {
  for (const p of opportunities) {
    const triangle = p.triangle
    const [n1, n2, n3] = triangle.map(e => e.source)
    const [e1, e2, e3] = triangle.map(e => e.getWeight())
    let message: string

    if (config.log.slack.extended) {
      message = `Arbitrage on exchange: *${p.exchange}* on triangle: *${n1} => ${n2} => ${n3} => ${n1}*
                Having *1 ${n1}* you buy *${e1} ${n2}*.
                With *${e1} ${n2}* you buy *${e1 * e2} ${n3}*.
                With *${e1 * e2} ${n3}* you buy *${e1 * e2 * e3} ${n1}*.
                gains: ${(p.arbitrage - 1) * 100} %`
    } else {
      message = `Arbitrage on *${p.exchange}*. Triangle: *${n1}, ${n2}, ${n3}*. Profit: *${(p.arbitrage - 1) * 100} %*`
    }

    sendToSlack(message)
  }
}
