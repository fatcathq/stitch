import { Balance, Currency, Precisions } from '../types'
import log from '../loggers/winston'
import { numberIsDeformed, financial } from '../utils/helpers'
import Opportunity from '../models/opportunity'
import Decimal from 'decimal.js'

const _ = require('lodash')

const EXCLUDE: any[] = []
const MIN_VOLUME_SAFETY_MARGIN = 1 / 0.8
const DECIMAL_POINT_PRECISION = 15

export default class BalanceHandler {
  public balance: Balance = {}
  private api: any
  private precisions: {[key: string]: number} = {}

  constructor (api: any) {
    this.api = api
  }

  public setPrecisions (precisions: Precisions): void {
    this.precisions = precisions
  }

  public async update (): Promise<void> {
    let balance: any
    try {
      balance = (await this.api.fetchBalance()).free
    } catch (e) {
      log.warn(`[BALANCE_HANDLER] Could not update balance. Locking engine. Error: ${e.message}`)
      return
    }

    this.balance = {}

    for (const currency of Object.keys(balance)) {
      const precision = this.precisions[currency] ? this.precisions[currency] : DECIMAL_POINT_PRECISION

      if (numberIsDeformed(balance[currency]) || financial(balance[currency], precision).equals(0) || EXCLUDE.includes(currency)) {
        continue
      }

      this.balance[currency] = financial(balance[currency], precision)
    }

    log.info(`[BALANCE_HANDLER] Balance updated. Balance now is:`)
    BalanceHandler.log(this.balance)
  }

  public static log (balance: Balance): void {
    for (const currency in balance) {
      log.info(`${currency}: ${balance[currency].toNumber()}`)
    }
  }

  public get (currency: Currency): Decimal {
    return this.balance[currency] ? this.balance[currency] : new Decimal(0)
  }

  public getAsNumber (currency: Currency): Number {
    return this.get(currency).toNumber()
  }

  public has (currency: Currency): boolean {
    return currency in this.balance[currency]
  }

  public sufficient (opportunity: Opportunity, currency: Currency): boolean {
    opportunity.changeStartingPoint(currency)

    if (opportunity.maxVolume.equals(Infinity)) {
      log.warn(`[SUFFICIENT_BALANCE_CHECK] Max Volumes of opportunity ${opportunity.getNodes()} are not defined. This shouldn't be happening`)
      return false
    }

    const balance = this.balance[opportunity.getReferenceUnit()]

    log.info(`[SUFFICIENT_BALANCE_CHECK] Triangle ${opportunity.getNodes()}.
              Volumes: [${opportunity.minVolume}, ${opportunity.maxVolume}].
              Balance:  ${balance} ${opportunity.getReferenceUnit()}`)

    return opportunity.minVolume < opportunity.maxVolume && opportunity.minVolume.mul(MIN_VOLUME_SAFETY_MARGIN).lessThan(balance)
  }

  public getIntersection (opportunity: Opportunity): Currency[] {
    return _.intersection(opportunity.getNodes(), Object.keys(this.balance))
  }

  public getCheckpoint (): Balance {
    return this.balance
  }

  public compareWithCheckpoint (oldBalance: Balance): Balance {
    let difference: Balance = {}

    for (const currency in oldBalance) {
      const diff = this.get(currency).minus(oldBalance[currency])

      if (!diff.isZero()) {
        difference[currency] = diff
      }
    }

    for (const currency in this.balance) {
      if (!(currency in oldBalance)) {
        difference[currency] = this.get(currency)
      }
    }

    return difference
  }
}
