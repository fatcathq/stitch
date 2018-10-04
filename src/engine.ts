import { Balance, OpportunitySets } from './types'
import OpportunitySet, { Opportunity } from './models/opportunity'
import { numberIsDeformed } from './utils/helpers'
import log from './loggers/winston'
import Notifier from './utils/notifier'

const MAX_VOLUME_SAFETY_THRESHOLD = 0.9
const MIN_VOLUME_SAFETY_THRESHOLD = 1 / 0.9

export default class Engine {
  public balance: Balance = {}
  public opportunitySets: OpportunitySets = {}
  public api: any
  public isWorking: boolean = false
  public locked = false
  public mock: boolean

  constructor(api: any, mock = true) {
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
    Notifier.on('OpportunityAdded', (id: number) => {
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
      log.info(`[EXPLOIT] Triangle: ${opportunity.getNodes()}. MinVolume: ${opportunity.minVolume}, maxVolume: ${opportunity.maxVolume}`)

      await opportunity.exploit(this.api, this.balance[opportunity.getReferenceUnit()])

      log.info(`[EXPLOIT] Finished`)
    }
  }

  // Find the first opportunity in which we have sufficient balance ready for trading
  private getExploitable(abstractOp: OpportunitySet) : Opportunity | undefined {
      for (const currency in this.balance) {
        const opportunity = abstractOp.getOpportunityByStartingCurrency(currency)

        if (opportunity !== undefined && this.sufficientBalance(opportunity, this.balance[currency])) {
            return opportunity
          }
      }

      return undefined
  }

  // TODO: Investigate whether it's too risky to trade in maxVolume 
  // TODO: Use partial balance
  private sufficientBalance(opportunity: Opportunity, balance: number): boolean {
    log.info(`Checking opportunity ${opportunity.getNodes()} for sufficient balance. MinVolume: ${opportunity.minVolume}, MaxVolume: ${opportunity.maxVolume}, balance: ${balance}`)

    return opportunity.minVolume < opportunity.maxVolume
        && opportunity.minVolume * MIN_VOLUME_SAFETY_THRESHOLD < balance
        && opportunity.maxVolume * MAX_VOLUME_SAFETY_THRESHOLD > balance
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

    this.balance = {}

    for (const currency of Object.keys(balance)) {
      if (numberIsDeformed(balance[currency]) || balance[currency] === 0) {
        continue
      }

      this.balance[currency] =  balance[currency]
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
