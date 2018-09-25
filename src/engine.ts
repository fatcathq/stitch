import { Balance, Triangle } from './types'
import { Edge as EdgeDriver } from './models/edge'
import { numberIsDeformed } from './utils/helpers'
import ArbitrageFinder from './arbitrage-finder'

export default class Engine {
  public balance: Balance
  public finder: ArbitrageFinder
  public api: any
  public isWorking: boolean = false

  constructor(api: any, finder: ArbitrageFinder) {
    this.finder = finder
    this.balance = new Map<string, number>()
    this.api = api
  }

  // TODO: Change typescript to es2016 to support entries()
  async updateBalance () {
    const balance = (await this.api.fetchBalance()).free

    for (const currency of Object.keys(balance)) {
      if (numberIsDeformed(balance[currency]) || balance[currency] === 0) {
        continue
      }

      this.balance.set(currency, balance[currency])
    }
  }

  async tradeOnTriangle(triangle: Triangle) {
    const startVolume = await this.getMinVolume(triangle)

    for (const edge of triangle) {
      edge.traverse(triangle, startVolume)
    }
  }

}

await Promise.all(this.triangle.map((edge: EdgeDriver) => edge.updateFromAPI(this.api)))
