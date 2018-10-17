import Balance from './models/balance'
import Opportunity from './models/opportunity'
import { Currency } from './types'
import log from './loggers/winston'
import config from  './utils/config'

/*
 * Kraken doesn't trade on maxVolume.
 * TODO: ^ Find why
 */
const MAX_VOLUME_SAFETY_THRESHOLD = 0.9

export default class Engine {
  public balance: Balance
  public api: any
  private locked: boolean
  private mock: boolean = !config.activeTrading

  constructor(api: any, mock = false) {
    this.api = api
    this.mock = mock
    this.balance = new Balance(this.api)
    this.locked = false
  }

  public async init() {
    await this.balance.init()
  }

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

    if (opportunity.getReferenceUnit() !== currency) {
      log.error(`[ENGINE] Opportunity upon exploit must be already changed in the proper exploit currency`)
    }

    this.lock()
    const now = Date.now()
    const balanceCheckpoint = this.balance.getCheckpoint()

    let startingBalance

    if (opportunity.maxVolume < this.balance.get(currency)) {
      log.info(`[ENGINE] We have ${this.balance.get(currency)} ${currency} but the maxVolume is ${opportunity.minVolume} ${currency}. Using maxVolume to trade.`)
      startingBalance = opportunity.maxVolume * MAX_VOLUME_SAFETY_THRESHOLD
    }
    else {
      startingBalance = this.balance.get(currency)
    }

    const exploited = await opportunity.exploit(this.api, currency, startingBalance, this.mock)

    if (!exploited) {
      log.error(`[ENGINE] Opportunity is not exploited`)
    }

    await this.balance.update()

    log.info(`[ENGINE] Finished exploiting opportunity ${opportunity.getNodes()}. Duration: ${Date.now() - now}`)

    const diff = this.balance.compareWithCheckpoint(balanceCheckpoint)

    if (Object.keys(diff).length > 0) {
      log.info(`[ENGINE] Diff of balance after exploit:`)
      console.log(diff)
    } else {
      log.warn(`[ENGINE] No money gained from this opportunity exploit :(`)
    }

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
