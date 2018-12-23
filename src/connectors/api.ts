const ccxt = require('ccxt')
const fetch = require('fetch-ponyfill')().fetch
// import log from '../loggers/winston'

import config from '../utils/config'

export default class extends ccxt[config.exchange] {
  constructor () {
    super({ apiKey: config.api.key, secret: config.api.secret })

    this.fetchImplementation = this.fetchWithLog

  }

  private async fetchWithLog (url: string, ...args: any[]): Promise<any> {
    // const now = Date.now()
    const res = await fetch(url, ...args)

    // log.info(`[REQUEST] ${url}, duration: ${Date.now() - now} ms`)

    return res
  }
}
