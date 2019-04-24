import benchmark from './base'
import getEnvOpts from './config'

(async () => {
  const opts = getEnvOpts()

  await benchmark({
    exchange: opts.exchange,
    method: 'fetchOrderBook',
    args: ['ETH/BTC'],
    samples: opts.samples,
    api: opts.creds
  })
})()
