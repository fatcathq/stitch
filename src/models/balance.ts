import { Balance, Currency } from '../types'
import log from '../loggers/winston'
import { numberIsDeformed } from '../utils/helpers'
import Opportunity from '../models/opportunity'

const _ = require('lodash')

const EXCLUDE = ['DTH']
const MAX_VOLUME_SAFETY_MARGIN = 0.9
const MIN_VOLUME_SAFETY_MARGIN = 1 / 0.9

export default class {
  public balance: Balance = {}
  private api: any

  constructor (api: any) {
    this.api = api
  }

  public async init() {
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
      if (numberIsDeformed(balance[currency]) || balance[currency] === 0 || EXCLUDE.includes(currency)) {
        continue
      }

      this.balance[currency] =  balance[currency]
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

    return opportunity.minVolume < opportunity.maxVolume
        && opportunity.minVolume * MIN_VOLUME_SAFETY_MARGIN < balance
        && opportunity.maxVolume * MAX_VOLUME_SAFETY_MARGIN > balance
  }

  public getIntersection (opportunity: Opportunity) {
    return _.intersection(opportunity.getNodes(), Object.keys(this.balance))
  }
}
