import config from '../utils/config'
import log from '../loggers/winston'
import axios from 'axios'

export async function send (message: string): Promise<void> {
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
