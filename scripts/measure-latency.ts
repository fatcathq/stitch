const _ = require('lodash')
const plotly = require('plotly')('dionyziz', 'aO4adNhLrXSjWXpjYHoJ')
const stats = require('stats-lite')
const axios = require('axios')
const ss = require('simple-statistics')
const pb = require('progress')
const URL = 'https://bittrex.com/api/v1.1/public/getorderbook?market=BTC-ETH&type=both'
const MONTE_CARLO_N = 1000
const NBINSX = MONTE_CARLO_N / 2

const bar = new pb(':bar :percent (:eta seconds remaining)', { total: MONTE_CARLO_N, width: 100 })

const measure = async () => {
  const t = Date.now()
  const response = await axios.get(URL)
  const dt = Date.now() - t

  if (response.status !== 200) {
    throw 'HTTP error ' + response.status
  }
  if (!response.data.success) {
    throw 'Invalid response from server'
  }
  return dt
};

(async () => {
  let samples = []

  for (let i = 0; i < MONTE_CARLO_N; ++i) {
    samples.push(await measure())
    bar.tick()
  }

  console.log('n = ', MONTE_CARLO_N)
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
  plotly.plot(data, graphOptions, function (_: any, msg: any) {
    console.log(msg)
  })
})()
