import benchmark from './base'
import getEnvOpts from './config'

(async () => {
  const opts = getEnvOpts()

  await benchmark({
    exchange: opts.exchange,
    method: 'fetchBalance',
    samples: opts.samples,
    api: opts.creds
  })
})()
