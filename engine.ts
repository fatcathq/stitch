import { Balance, Triangle } from './types'
import { Edge as EdgeDriver } from './edge'
import { numberIsDeformed } from './helpers'

export default class Engine {
  public balance: Balance
  public api: any

  constructor(api: any) {
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

  async getMinVolume (triangle: Triangle): Promise<number> {
    let volumeIt = triangle[0].volume

    await Promise.all(triangle.map((edge: EdgeDriver) => edge.updateFromAPI(this.api)))

    for (const edge of triangle) {
      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt *= edge.getPrice()
    }

    return volumeIt
  }
}
