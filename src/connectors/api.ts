const ccxt = require('ccxt')
const fetch = require('fetch-ponyfill')().fetch
import log from '../loggers/winston'
import { APIError } from '../errors/api'

import config from '../utils/config'

export default class extends ccxt[config.exchange] {
  constructor () {
    super({ apiKey: config.api.key })

    this.fetchImplementation = this.fetchWithLog

  }

  private async fetchWithLog (url: string, ...args: any[]): Promise<any> {
    const now = Date.now()
    let failed = 0
    let done = false
    let res: any

    do {
      res = await fetch(url, ...args)

      if (!res.ok) {
        failed++
        log.error(`[REQUEST_FAILED] ${url}, duration: ${Date.now() - now} ms, args: ${JSON.stringify(args)}. ${failed < 3 ? 'Trying again' : ''}.`)
      } else {
        done = true
      }
    } while (!done && failed < 3)

    if (!done) {
      throw new APIError(url, res.statusText, args)
    }

    return res
  }
}
