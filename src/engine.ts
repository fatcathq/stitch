import { Balance, OpportunitySets } from './types'
import OpportunitySet, { Opportunity } from './models/opportunity'
import { numberIsDeformed } from './utils/helpers'
import ArbitrageFinder from './arbitrage-finder'
import log from './loggers/winston'

export default class Engine {
  public balance: Balance
  public finder: ArbitrageFinder
  public opportunitySets: OpportunitySets = {}
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

  public linkOpportunities (opportunities: OpportunitySets) {
    this.opportunitySets = opportunities
  }

  public async init() {
    await this.updateBalance()
    this.registerListeners()
  }

  public async registerListeners() {
    this.finder.on('OpportunityAdded', (id: number) => {
      this.handleOpportunityOpened(id)
    })
  }

  // If engine is locked do not exploit the opportunity.
  private handleOpportunityOpened(id: number) {
      if (this.opportunitySets[id] === undefined || this.locked) {
        return
      }

      const opportunity = this.getExploitable(this.opportunitySets[id])

      if (opportunity !== undefined) {
        //this.exploit(opportunity)
        log.info(`[EXPLOIT] Triangle: ${opportunity.getNodes()}. MinVolume: ${opportunity.minVolume}, maxVolume: ${opportunity.maxVolume}`)
      }

  }

  // Find the first opportunity in which we have sufficient balance ready for trading
  private getExploitable(abstractOp: OpportunitySet) : Opportunity | undefined {
      for (const [currency, balance] of this.balance.entries()) {
        const opportunity = abstractOp.getOpportunityByStartingCurrency(currency)

        if (opportunity !== undefined && this.sufficientBalance(opportunity, balance)) {
            return opportunity
          }
      }

      return undefined
  }

  // TODO: Investigate whether it's too risky to trade in maxVolume 
  // TODO: Use partial balance
  private sufficientBalance(opportunity: Opportunity, balance: number): boolean {
    log.info(`Checking opportunity ${opportunity.getNodes()} for sufficient balance. MinVolume: ${opportunity.minVolume}, MaxVolume: ${opportunity.maxVolume}, balance: ${balance}`)

    if (opportunity.minVolume < balance && (opportunity.maxVolume * 0.9) > balance) {
      return true
    }

    return false
  }

  /*
  async tradeOnTriangle(triangle: Triangle) {
    for (const edge of triangle) {
      edge.traverse(triangle, startVolume)
    }
  }
  */

  // TODO: Change typescript to es2016 to support entries()
  private async updateBalance () {
    let balance: any
    try {
      balance = (await this.api.fetchBalance()).free
    } catch (e) {
      log.warn(`Could not update balance. Locking engine`)
      this.lock()
      return
    }

    this.balance.clear()

    for (const currency of Object.keys(balance)) {
      if (numberIsDeformed(balance[currency]) || balance[currency] === 0) {
        continue
      }

      this.balance.set(currency, balance[currency])
    }

    log.info(`Updating balance. Balance now is:`)
    console.log(this.balance)
  }

  private lock () {
    this.locked = true
  }

  /*
  private unlock () {
    this.locked = false
  }
  */
}
