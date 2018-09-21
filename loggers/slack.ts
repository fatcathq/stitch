import { Opportunity } from '../types'
import log from './winston'
import axios from 'axios'
import config from '../config'

export function slackLogOpportunities (opportunities: Opportunity[]): void {
  for (const p of opportunities) {
    const { arbitrage } = p
    const triangle = p.triangle
    const [n1, n2, n3] = triangle.map(e => e.source)
    const [e1, e2, e3] = triangle.map(e => e.getWeight())
    let message: string

    if (config.log.slack.extended) {
      message = `Arbitrage on exchange: *${config.exchange}* on triangle: *${n1} => ${n2} => ${n3} => ${n1}*
                Having *1 ${n1}* you buy *${e1} ${n2}*.
                With *${e1} ${n2}* you buy *${e1 * e2} ${n3}*.
                With *${e1 * e2} ${n3}* you buy *${e1 * e2 * e3} ${n1}*.
                gains: ${(arbitrage - 1) * 100} %`
    } else {
      message = `Arbitrage on *${config.exchange}*. Triangle: *${n1}, ${n2}, ${n3}*. Profit: *${(arbitrage - 1) * 100} %*`
    }

    sendToSlack(message)
  }
}

async function sendToSlack (message: string): Promise<void> {
  if (!config.log.slack.should) {
    log.info(message)
    return
  }

  const opts: any = {
    text: message,
    channel: 'cycles-monitor'
  }

  await axios.post(config.log.slack.webhook, opts)
}
