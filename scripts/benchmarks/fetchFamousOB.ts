import benchmark from './base'
import * as dotenv from 'dotenv'

(async () => {
  const ENV_CONFIG = './.env'
  dotenv.config({path: ENV_CONFIG})

  const {EXCHANGE, SAMPLES, API_KEY, API_SECRET} = process.env

  if (!EXCHANGE || !SAMPLES || !API_KEY || !API_SECRET) {
    console.log('Env vars are missing from .env')
    return
  }

  await benchmark({
    exchange: EXCHANGE,
    method: 'fetchOrderBook',
    args: ['ETH/BTC'],
    samples: Number(SAMPLES),
    api: {
      key: API_KEY,
      secret: API_SECRET
    }
  })
})()
