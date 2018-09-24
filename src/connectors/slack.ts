import config from '../utils/config'
import axios from 'axios'

export async function send (message: string): Promise<void> {
  const opts: any = {
    text: message,
    channel: 'cycles-monitor'
  }

  await axios.post(config.log.slack.webhook, opts)
}
