import benchmark, { CCXTCreds } from './base'
import * as dotenv from 'dotenv'

(async () => {
  const ENV_CONFIG = './.env'
  dotenv.config({ path: ENV_CONFIG })

  const { EXCHANGE, SAMPLES, API_KEY, API_SECRET } = process.env

  if (!EXCHANGE || !SAMPLES || !API_KEY) {
    console.log('Env vars are missing from .env')
    return
  }

  const opts: CCXTCreds = { key: API_KEY }
  if (API_SECRET) {
    opts.secret = API_SECRET
  }

  await benchmark({
    exchange: EXCHANGE,
    method: 'fetchBalance',
    samples: Number(SAMPLES),
    api: opts
  })
})()
