import Balance from './models/balance'
import Opportunity from './models/opportunity'
import { Currency, Precisions } from './types'
import log from './loggers/winston'
import Decimal from 'decimal.js'

const MAX_VOLUME_SAFETY_THRESHOLD = 0.8

export default class Engine {
  public balance: Balance
  public api: any
  private locked: boolean
  private precisions: Precisions = {}

  constructor (api: any) {
    this.api = api
    this.balance = new Balance(this.api)
    this.locked = true
  }

  public async init (markets: any): Promise<void> {
    this.precisions = Engine.marketsToPrecisions(markets)

    this.balance.setPrecisions(this.precisions)
    await this.balance.update()
  }

  public hasExploitableCurrency (opportunity: Opportunity): Currency | undefined {
    for (const currency of this.balance.getIntersection(opportunity)) {
      if (this.balance.sufficient(opportunity, currency)) {
        return currency
      }

      return undefined
    }
  }

  public async exploit (opportunity: Opportunity, currency: Currency): Promise<void> {
    log.info(`[ENGINE] Will exploit opportunity ${opportunity.getNodes()}.`)

    if (this.isLocked()) {
      log.warn(`[ENGINE] Cannot exploit opportunity ${opportunity.getNodes()}. Engine is locked`)
      return
    }

    if (opportunity.getReferenceUnit() !== currency) {
      log.error(`[ENGINE] Opportunity upon exploit must be already changed in the proper exploit currency`)
    }

    log.info(`[ENGINE] Locking engine to prevent parallel exploitations`)
    this.lock()

    const startingVolume = this.calculateStartingVolume(opportunity, currency)
    const now = Date.now()

    const exploit = await opportunity.exploit(this.api, currency, startingVolume, false)

    if (!exploit) {
      log.error(`[ENGINE] Opportunity was not exploited`)
    } else {
      log.info(`[ENGINE] Finished exploiting opportunity ${opportunity.getNodes()}. Duration: ${Date.now() - now}`)
    }

    await this.logExploitResults(opportunity, startingVolume)

    process.exit()
    this.unlock()
  }

  private calculateStartingVolume (opportunity: Opportunity, currency: Currency): Decimal {
    if (opportunity.maxVolume < this.balance.get(currency)) {
      log.info(`[ENGINE] We have ${this.balance.get(currency)} ${currency} but the maxVolume is ${opportunity.minVolume} ${currency}. Using maxVolume to trade.`)
      return new Decimal(opportunity.maxVolume).mul(MAX_VOLUME_SAFETY_THRESHOLD)
    }

    return new Decimal(this.balance.get(currency)).mul(MAX_VOLUME_SAFETY_THRESHOLD)
  }

  private async logExploitResults (opportunity: Opportunity, startingBalance: Decimal): Promise<void> {
    const balanceCheckpoint = this.balance.getCheckpoint()
    await this.balance.update()
    const diff = this.balance.compareWithCheckpoint(balanceCheckpoint)

    if (Object.keys(diff).length > 0) {
      log.info(`[ENGINE] Diff of balance after exploit:`)
      Balance.log(diff)

      // (startingBalance + diff[p.getRefUnit]) / startingBalance
      const actualArbitrage = new Decimal(
        startingBalance.plus(diff[opportunity.getReferenceUnit()])
      ).div(startingBalance).toNumber()
      log.info(`[ENGINE] Arbitrage expected: ${opportunity.arbitrage}. Actual arbitrage: ${actualArbitrage}`)
    } else {
      log.warn(`[ENGINE] No money gained from this opportunity exploit :(`)
    }
  }

  public isLocked (): boolean {
    return this.locked
  }

  public lock (): void {
    this.locked = true
  }

  public unlock (): void {
    this.locked = false
  }

  public static marketsToPrecisions (markets: any): Precisions {
    let precisions: Precisions = {}

    for (const id of Object.keys(markets)) {
      const market = markets[id]
      precisions[market.base] = market.precisions.base
      precisions[market.quote] = market.precisions.quote
    }

    // --- SPAM ---
    // log.info(`[ENGINE] Precisions updated`)
    // console.log(precisions)

    return precisions
  }
}
