import { createLogger, format, transports } from 'winston'
import * as fs from 'fs'
import * as path from 'path'
import Opportunity from '../models/opportunity'
  
const { combine, timestamp, prettyPrint, simple, colorize } = format

const logDir = 'logs'
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

const fileLogFormat = combine(
  timestamp(),
  prettyPrint()
)

const logger = createLogger({
  transports: [
    new transports.File({ format: fileLogFormat, filename: path.join(logDir, '/error.log'), level: 'error' }), 
    new transports.File({ format: fileLogFormat, filename: path.join(logDir, '/warn.log'), level: 'warn' }), 
    new transports.File({ format: fileLogFormat, filename: path.join(logDir, '/combined.log') })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      simple()
    )   
  })) 
}

export function logOpportunities (opportunities: Opportunity[]): void {
  console.log(typeof opportunities)
  for (const p of opportunities) {
    const triangle = p.triangle
    const [n1, n2, n3] = triangle.map(e => e.source)

    logger.info(`Arbitrage on *${p.exchange}*. Triangle: *${n1}, ${n2}, ${n3}*. Profit: *${(p.arbitrage - 1) * 100} %*`)
  }
}

export default logger
