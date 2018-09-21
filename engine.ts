import { Balance } from './types'
import { numberIsDeformed } from './helpers'

export class Engine {
  public balance: Balance
  public api: any

  constructor(api: any) {
    this.balance = new Map<string, number>()
    this.api = api
  }

  //TODO: Change typescript to es2016 to support entries()
  async updateBalance () {
    const balance = (await this.api.fetchBalance()).free

    for (const currency of Object.keys(balance)) {
      if (numberIsDeformed(balance[currency]) || balance[currency] === 0) {
        continue
      }

      this.balance.set(currency, balance[currency])
    }
  }
}
