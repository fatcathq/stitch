import { Balance, OpportunityMap } from './types'
import Opportunity from './models/opportunity'
import { numberIsDeformed } from './utils/helpers'
import log from './loggers/winston'
import Notifier from './utils/notifier'

const MAX_VOLUME_SAFETY_MARGIN = 0.9
const MIN_VOLUME_SAFETY_MARGIN = 1 / 0.9

export default class Engine {
  public balance: Balance = {}
  public opportunityMap: OpportunityMap = {}
  public api: any
  public isWorking: boolean = false
  public locked = false
  public mock: boolean

  constructor(api: any, mock = false) {
    this.api = api
    this.mock = mock
  }

  public linkOpportunities (opportunities: OpportunityMap) {
    this.opportunityMap = opportunities
  }

  public async init() {
    await this.updateBalance()
    await this.registerListeners()
  }

  public async registerListeners() {
    Notifier.on('OpportunityAdded', async (id: number) => {
      if (!this.locked) {
        await this.handleOpportunityAdded(id)
      }
    })
  }

  // If engine is locked do not exploit the opportunity.
  private async handleOpportunityAdded(id: number) {
    if (this.opportunityMap[id] === undefined) {
      return
    }

    const opportunity = await this.getExploitable(this.opportunityMap[id])

    if (opportunity !== undefined) {
      Notifier.emit('War', opportunity)

      //Last moment check
      if (this.locked) {
        return
      }

      log.info(`[EXPLOIT] Triangle: ${opportunity.getNodes()}. MinVolume: ${opportunity.minVolume}, maxVolume: ${opportunity.maxVolume}`)

      await opportunity.exploit(this.api, this.balance[opportunity.getReferenceUnit()], this.mock)

      log.info(`[EXPLOIT] Finished`)
      // Notifier.emit('Peace')
    }
  }

  // Find the first opportunity in which we have sufficient balance ready for trading
  private async getExploitable(opportunity: Opportunity) : Promise<Opportunity | undefined> {
      for (const currency in this.balance) {
        if (!opportunity.contains(currency)) {
          continue
        }

        opportunity.changeStartingPoint(currency)

        if (!this.sufficientBalance(opportunity)) {
          log.info(`[ENGINE] Insufficient balance to exploit opportunity ${opportunity.getNodes()}`)
          continue
        }

        return opportunity
      }

      return undefined
  }

  // TODO: Investigate whether it's too risky to trade in maxVolume
  // TODO: Use partial balance
  private sufficientBalance(opportunity: Opportunity): boolean {
    if (opportunity.maxVolume === Infinity) {
      log.warn(`[SUFFICIENT_BALANCE_CHECK] Max Volumes of opportunity ${opportunity.getNodes()} are not defined. This shouldn't be happening`)
      return false
    }
    const balance = this.balance[opportunity.getReferenceUnit()]

    log.info(`Checking opportunity ${opportunity.getNodes()} for sufficient balance. MinVolume: ${opportunity.minVolume}, MaxVolume: ${opportunity.maxVolume}, balance: ${balance} ${opportunity.getReferenceUnit()}`)

    return opportunity.minVolume < opportunity.maxVolume
        && opportunity.minVolume * MIN_VOLUME_SAFETY_MARGIN < balance
        && opportunity.maxVolume * MAX_VOLUME_SAFETY_MARGIN > balance
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
