import { Balance, Currency, Precisions } from '../types'
import log from '../loggers/winston'
import { numberIsDeformed, financial } from '../utils/helpers'
import Opportunity from '../models/opportunity'

const _ = require('lodash')

const EXCLUDE: any[] = []
const MIN_VOLUME_SAFETY_MARGIN = 1 / 0.8
const DECIMAL_POINT_PRECISION = 6

export default class BalanceHandler {
  public balance: Balance = {}
  private api: any
  private precisions: {[key: string]: number} ={}

  constructor (api: any) {
    this.api = api
  }

  public async init(precisions: Precisions) {
    this.precisions = precisions
    await this.update()
  }

  public async update () {
    let balance: any
    try {
      balance = (await this.api.fetchBalance()).free
    } catch (e) {
      log.warn(`[BALANCE_HANDLER] Could not update balance. Locking engine. Error: ${e.message}`)
      return
    }

    this.balance = {}

    for (const currency of Object.keys(balance)) {
      if (numberIsDeformed(balance[currency]) || financial(balance[currency]) === 0 || EXCLUDE.includes(currency)) {
        continue
      }

      this.balance[currency] =  financial(balance[currency], (this.precisions[currency] ? this.precisions[currency] : DECIMAL_POINT_PRECISION))
    }

    log.info(`[BALANCE_HANDLER] Balance updated. Balance now is:`)
    console.log(this.balance)
  }

  public get (currency: Currency) {
    return this.balance[currency]
  }

  public has (currency: Currency) {
    return this.balance[currency] !== undefined
  }

  public sufficient(opportunity: Opportunity, currency: Currency): boolean {
    console.log('currency', currency)

    opportunity.changeStartingPoint(currency)

    if (opportunity.maxVolume === Infinity) {
      log.warn(`[SUFFICIENT_BALANCE_CHECK] Max Volumes of opportunity ${opportunity.getNodes()} are not defined. This shouldn't be happening`)
      return false
    }

    const balance = this.balance[opportunity.getReferenceUnit()]

    log.info(`[SUFFICIENT_BALANCE_CHECK] Triangle ${opportunity.getNodes()}. Volumes: [${opportunity.minVolume}, ${opportunity.maxVolume}]. Balance: ${balance} ${opportunity.getReferenceUnit()}`)

    console.log('minVolume---------------', Number(opportunity.minVolume) * MIN_VOLUME_SAFETY_MARGIN, balance)
    console.log('minVolume < maxVolume', opportunity.minVolume, opportunity.maxVolume, opportunity.minVolume < opportunity.maxVolume)
    console.log('opportunity.minVolume < balance', Number(opportunity.minVolume), balance, Number(opportunity.minVolume) * MIN_VOLUME_SAFETY_MARGIN < balance)
    const shouldTrade =  opportunity.minVolume < opportunity.maxVolume
        && opportunity.minVolume * MIN_VOLUME_SAFETY_MARGIN < balance

    console.log('shouldTrade', shouldTrade)
    return shouldTrade
  }

  public getIntersection (opportunity: Opportunity) {
    return _.intersection(opportunity.getNodes(), Object.keys(this.balance))
  }

  public getCheckpoint (): Balance {
    return this.balance
  }

  public compareWithCheckpoint(oldBalance: Balance) {
    let diff: Balance = {}

    for (const currency of Object.keys(oldBalance)) {
      // Balance in this currency doesn't exist anymore
      if (!(currency in this.balance)) {
        diff[currency] = - oldBalance[currency]
      }
      else if (oldBalance[currency] !== this.balance[currency]) {
        // Balance in this currency changed
        diff[currency] = this.balance[currency] - oldBalance[currency]
      }
    }

    // New balance
    for (const currency of Object.keys(oldBalance)) {
      if (!(currency in oldBalance)) {
        diff[currency] = this.balance[currency]
      }
    }

    return diff
  }
}
