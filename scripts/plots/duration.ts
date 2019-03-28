import config from '../../config/config.json'
import db from '../../src/connectors/db'
const plotly = require('plotly')(config.plotly.username, config.plotly.key)

type Point = {
  rounded_duration: number,
  cnt: number
}

const dataToTrace = (data: Array<Point>) => {
  return {
    type: 'scatter',
    line: { shape: 'spline' },
    mode: 'lines+markers',
    x: data.map(x => x.rounded_duration),
    y: data.map(x => x.cnt)
  }
}

const main = async () => {
  const query = await db('opportunities').select(db.raw('round(duration, -2) as rounded_duration')).count('id as cnt').groupBy('rounded_duration')
  const trace = dataToTrace(query)
  const graphOptions = {
    filename: 'basic-line',
    fileopt: 'overwrite'
  }

  plotly.plot(trace, graphOptions, function (err: Error, msg: any): void {
    if (err) {
      console.log(err)
    }

    console.log(msg)
  })
}

main()
