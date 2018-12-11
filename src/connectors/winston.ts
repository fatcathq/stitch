import { createLogger, format, transports } from 'winston'
import * as fs from 'fs'
import * as path from 'path'

const { combine, timestamp, json, simple, colorize } = format

const logDir = 'logs'
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

const fileLogFormat = combine(
  timestamp(),
  json()
)

const logger = createLogger({
  transports: [
    new transports.File({ format: fileLogFormat, filename: path.join(logDir, '/error.log'), level: 'error' }),
    new transports.File({ format: fileLogFormat, filename: path.join(logDir, '/warn.log'), level: 'warn' }),
    new transports.File({ format: fileLogFormat, filename: path.join(logDir, '/combined.log') })
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      simple()
    )
  }))
}

export default logger
