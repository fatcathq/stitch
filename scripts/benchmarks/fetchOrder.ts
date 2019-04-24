import benchmark from './base'
import getEnvOpts from './config'

(async () => {
  const opts = getEnvOpts()
  const orderId = '03acc531-781f-485d-8e16-d2ed2c71a106'

  await benchmark({
    exchange: opts.exchange,
    method: 'fetchOrder',
    args: [orderId],
    samples: opts.samples,
    api: opts.creds
  })
})()
