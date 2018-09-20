import { Opportunity } from './types'
import axios from 'axios'

const WEBHOOK_URL = 'https://hooks.slack.com/services/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'

export function log (opportunities: Opportunity[], extended = false): void {
  for (const p of opportunities) {
    const { exchange, arbitrage } = p
    const triangle = p.triangle
    const [n1, n2, n3] = triangle.map(e => e.source)
    const [e1, e2, e3] = triangle.map(e => e.getWeight())
    let message: string

    if (extended) {
      message = `Arbitrage on exchange: *${exchange}* on triangle: *${n1} => ${n2} => ${n3} => ${n1}*
                Having *1 ${n1}* you buy *${e1} ${n2}*.
                With *${e1} ${n2}* you buy *${e1 * e2} ${n3}*.
                With *${e1 * e2} ${n3}* you buy *${e1 * e2 * e3} ${n1}*.
                gains: ${(arbitrage - 1) * 100} %`
    } else {
      message = `Arbitrage on *${exchange}*. Triangle: *${n1}, ${n2}, ${n3}*. Profit: *${(arbitrage - 1) * 100} %*`
    }

    sendToSlack(message)
  }
}

export async function sendToSlack (message: string, mock: boolean = true): Promise<void> {
  if (mock) {
    console.log(message)
    return
  }

  const opts: any = {
    text: message,
    username: 'Triangular Arbitrage Finder',
    icon_emoji: ':dark_sunglasses:',
    channel: 'trading-report-test'
  }

  await axios.post(WEBHOOK_URL, opts)
}
