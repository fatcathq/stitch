import * as dotenv from 'dotenv'
import { CCXTCreds } from './base'

export default function getEnvOpts (): { exchange: string, creds: CCXTCreds, samples: number } {
  const ENV_CONFIG = './.env'
  dotenv.config({ path: ENV_CONFIG })

  const { EXCHANGE, SAMPLES, API_KEY, API_SECRET } = process.env

  if (!EXCHANGE || !SAMPLES || !API_KEY) {
    throw Error('Env vars are missing from .env')
  }

  const opts: CCXTCreds = { apiKey: API_KEY }
  if (API_SECRET) {
    opts.secret = API_SECRET
  }

  return {
    creds: opts,
    exchange: EXCHANGE,
    samples: Number(SAMPLES)
  }
}
