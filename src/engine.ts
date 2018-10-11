import Balance from './models/balance'
import Opportunity from './models/opportunity'
import { Currency } from './types'
import log from './loggers/winston'

export default class Engine {
  public balance: Balance
  public api: any
  private locked: boolean
  private mock: boolean

  constructor(api: any, mock = false) {
    this.api = api
    this.mock = mock
    this.balance = new Balance(this.api)
    this.locked = false
  }

  public async init() {
    await this.balance.init()
  }

  // Find the first opportunity in which we have sufficient balance ready for trading
  public hasExploitableCurrency(opportunity: Opportunity) : Currency | undefined {
    for (const currency of this.balance.getIntersection(opportunity)) {
      if (this.balance.sufficient(opportunity, currency)) {
        return currency
      }

      return undefined
    }
  }

  public async exploit (opportunity: Opportunity, currency: Currency) {
    log.info(`[ENGINE] Will exploit opportunity ${opportunity.getNodes()}.`)

    if (this.isLocked()) {
      log.warn(`[ENGINE] Cannot exploit opportunity ${opportunity.getNodes()}. Engine is locked`)
      return
    }

    this.lock()

    await this.api.emptyQueue()

    const exploited = await opportunity.exploit(this.api, currency, this.balance.get(currency), this.mock)

    if (!exploited) {
      log.error(`[ENGINE] Opportunity is not exploited`)
    }

    log.info(`[ENGINE] Finished exploiting opportunity ${opportunity.getNodes()}.`)

    this.unlock()
  }

  public isLocked() {
    return this.locked
  }

  private lock() {
    this.locked = true
  }

  private unlock() {
    this.locked = false
  }
}
