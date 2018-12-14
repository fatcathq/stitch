const _ = require('lodash')
const plotly = require('plotly')('dionyziz', 'aO4adNhLrXSjWXpjYHoJ')
const ss = require('simple-statistics')
const pb = require('progress')
const ccxt = require('ccxt')

type BenchmarkConfig = {
  exchange: string,
  method: string,
  args?: any[]
  samples: number,
  api: {
    key: string,
    secret: string
  }
}

const initCCXT = (exchange: string, creds: {key: string, secret: string}) => {
  return new ccxt[exchange]({
    apiKey: creds.key,
    secret: creds.secret,
  })
}

const benchmarkCCXTRequest = async (ccxtInstance: any, method: string, args: any[]) => {
  const t = Date.now()
  try {
    await ccxtInstance[method](...args)
  }
  catch (e) {
    console.log(e)
  }

  return Date.now() - t
}

export default async (config: BenchmarkConfig) => {
  console.log(`Benchmarking ${config.exchange}.${config.method} with ${config.samples} samples`)
  const NBINSX = config.samples / 2
  const bar = new pb(':bar :percent (:eta seconds remaining)', { total: config.samples, width: 100 })
  const ccxt = initCCXT(config.exchange, config.api)

  let samples = []

  for (let i = 0; i < config.samples; ++i) {
    const args = config.args ? config.args : []
    const dt = await benchmarkCCXTRequest(ccxt, config.method, args)

    samples.push(dt)
    bar.tick()
  }

  console.log('n = ', config.samples)
  console.log('min: ', _.min(samples), 'ms')
  console.log('avg: ', _.mean(samples), 'ms')
  console.log('max: ', _.max(samples), 'ms')
  console.log('std: ', ss.standardDeviation(samples).toPrecision(3), 'ms')

  // const histogram = stats.histogram(samples)
  // console.log('histogram', histogram)

  var data = [
    {
      x: samples,
      nbinsx: NBINSX,
      type: "histogram"
    }
  ]

  var graphOptions = {filename: "response-times-" + Date.now(), fileopt: "overwrite"}
  plotly.plot(data, graphOptions, (_: any, msg: any) => {
    console.log(msg)
  })
}