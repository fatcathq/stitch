import { Balance, Opportunities } from './types'
import { numberIsDeformed } from './utils/helpers'
import ArbitrageFinder from './arbitrage-finder'

export default class Engine {
  public balance: Balance
  public finder: ArbitrageFinder
  public opportunities: Opportunities = {}
  public api: any
  public isWorking: boolean = false
  public locked = false
  public mock: boolean

  constructor(api: any, finder: ArbitrageFinder, mock = true) {
    this.finder = finder
    this.balance = new Map<string, number>()
    this.api = api
    this.mock = mock
  }

  public linkOpportunities (opportunities: Opportunities) {
    this.opportunities = opportunities
  }

  public async init() {
    await this.updateBalance()
    //this.registerListeners()
  }

  /*
  public async registerListeners() {
    this.finder.on('OpportunityVolumesUpdated', (opportunity) => {
      opportunity.getByStartingCurrency(opportunity.getNodes()[1]).log()
    })
  }

  async tradeOnTriangle(triangle: Triangle) {
    for (const edge of triangle) {
      edge.traverse(triangle, startVolume)
    }
  }
  */

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

  public lock () {
    this.locked = true
  }

  public unlock () {
    this.locked = false
  }
}
