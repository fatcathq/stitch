import Decimal from 'decimal.js'
import { Currency, Volume, Price, OrderDetails, OrderSide } from '../types'
import log from '../loggers/winston'
import db from '../connectors/db'
import { OrderFillTimeoutError, TraversalAPIError } from '../errors/edgeErrors'
import assert from 'assert'

const FILLED_ORDER_TRIES = 500
const MARKET_ORDER_PRICE_CHANGE = 0.01
const MAX_INT = Number.MAX_SAFE_INTEGER

type FeeApplication = 'before' | 'after'

// An Edge indicating a market which allows us to go from the 'source' Currency
// to the 'target' Currency by selling the 'source' to obtain 'target'.
export class Edge {
  public source: Currency
  public target: Currency
  public sourcePrecision: number
  public targetPrecision: number
  public minVolume: Volume // Volume of OrderBook Top
  // Volume is source units (in both Edge and VirtualEdge)
  public volume: Volume = new Decimal(0) // Volume of OrderBook Top
  public fee: Decimal = new Decimal(0)
  // Price is target unit (in both Edge and VirtualEdge).
  // It indicates how many target units one can get by giving 1 source unit.
  // In the case of an Edge, this trade is performed by selling the source unit
  // to obtain target units. In the case of a VirtualEdge, this trade is
  // performed by buying the target unit and paying in the source unit.
  public lastUpdatedTs: number = Date.now()
  protected price: Decimal = new Decimal(MAX_INT)
  protected feeApplication: FeeApplication = 'before'
  public side: OrderSide = 'ask'

  constructor
    (source: string,
     target: string,
     fee: [Decimal, FeeApplication] = [new Decimal(0), 'before'],
     minVolume: Volume = new Decimal(0),
     precisions: [number, number] = [8, 8]) {
    this.source = source
    this.target = target
    this.minVolume = minVolume

    this.fee = fee[0]
    this.feeApplication = fee[1]

    this.sourcePrecision = precisions[0]
    this.targetPrecision = precisions[1]

  }

  public fullPrintEdge (): void {
    log.info(`${this.source} -> ${this.target}, price: ${this.price}, volume: ${this.volume}`)
  }

  public hasEmptyValues (): boolean {
    return this.volume.equals(0) && this.price.equals(MAX_INT)
  }

  public toString (): string {
    return `${this.source} -> ${this.target}`
  }

  public setPrice (price: Price): void {
    this.updateLastUpdatedTs()

    this.price = price
    log.debug(`New price on edge ${this}. With 1 ${this.source} you buy ${this.price} ${this.target}`)
  }

  public setRealPrice (price: Price): void {
    this.setPrice(price)
  }

  public getPrice (): Price {
    return this.price
  }

  public getRealPrice (): Price {
    return this.getPrice()
  }

  public setMinVolume (volume: Volume): void {
    this.minVolume = volume
  }

  public updateLastUpdatedTs (): void {
    log.debug(`Price of market ${this.source}/${this.target} wasn't updated for ${Date.now() - this.lastUpdatedTs} ms.`)
    this.lastUpdatedTs = Date.now()
  }

  protected volumeToRealVolume (volume: Volume): Volume {
    return volume
  }

  protected setRealVolume (volume: Volume): void {
    this.volume = volume
  }

  public getRealVolume (): Volume {
    return this.volumeToRealVolume(this.volume)
  }

  public getVolume (): Decimal {
    return this.volume
  }

  public getMarket (): string {
    return `${this.source}/${this.target}`
  }

  public isVirtual (): Boolean {
    return this instanceof VirtualEdge
  }

  protected extractTopOfTheOrderBook (ob: any): [Price, Volume] {
    return ob.bids[0]
  }

  public async updateFromAPI (api: any): Promise<void> {
    const ob = await api.fetchOrderBook(this.getMarket(), 1)
    const [price, volume] = this.extractTopOfTheOrderBook(ob)

    this.setRealPrice(new Decimal(price))
    this.setRealVolume(new Decimal(volume))
  }

  protected worsenPrice (price: Price, factor: number): Price {
    return price.mul(1 - factor)
  }

  /*
   * Volume and Price for this function call are given in the same units as this.volume and this.price
   */
  public async traverse (args: OrderDetails): Promise<Volume> {
    assert(typeof args.price === 'undefined')
    args.price = this.getRealPrice()
    if (args.type && args.type === 'market') {
      // WARNING: Mocking market order, so giving type 'limit' to placeAndFillOrder()
      args.price = this.worsenPrice(args.price, MARKET_ORDER_PRICE_CHANGE)
    }
    args.volume = this.volumeToRealVolume(new Decimal(args.volume))

    return this.placeAndFillOrder({
      type: args.type ? args.type : 'limit',
      side: this.side,
      ...args
    })
  }

  /*
   * Volume and Price for this function call are given for the real market, not the virtual market
   * (both for Edge and VirtualEdge)
   */

  protected async placeAndFillOrder (args: OrderDetails): Promise<Volume> {
    let id: null | number = null
    let tradeVolume = args.volume
    if (this.feeApplication === 'before') {
      tradeVolume = tradeVolume.minus(this.fee.mul(tradeVolume))
    }
    let apiRes

    let method = args.side === 'ask' ? 'createLimitSellOrder' : 'createLimitBuyOrder'

    log.info(
     `[EDGE] Placing order ${this.source} -> ${this.target}
      [EDGE] Fees will be applied ${this.feeApplication} the trade.
      [EDGE] Placing an ${args.side} ${args.type} order on market ${this.getMarket()} with volume: ${args.volume} and  price ${args.price}.
      [EDGE] Calling api.${method}(${this.getMarket()}, ${tradeVolume.toNumber()}, ${args.price!.toNumber()})`)

    if (args.mock) {
      return this.calculateReturnedFunds({}, tradeVolume)
    }

    try {
      let res = await args.api[method](this.getMarket(), tradeVolume.toNumber(), args.price!.toNumber())
      id = res.id
    } catch (e) {
      throw new TraversalAPIError(this, `${method} failed`, e.message)
    }

    log.info(`[EDGE] Placed order with id: ${id}. Now waiting order to be filled`)

    let status: string
    const now = Date.now()
    let tries = 0

    do {
      ++tries

      try {
        apiRes = await args.api.fetchOrder(id)
      } catch (e) {
        log.error('Failed fetch order', e)
        throw new TraversalAPIError(this, `FetchOrder failed`, e.message)
      }

      status = apiRes.status
      log.info(`[EDGE] Status: ${status}, tries: ${tries}`)
    } while (status !== 'closed' && tries < FILLED_ORDER_TRIES)

    if (status !== 'closed') {
      log.warn(`[EDGE] Order was not filled`)

      try {
        await args.api.cancelOrder(id)
        log.info(`[EDGE] Order was cancelled`)
      } catch (e) {
        throw new TraversalAPIError(this, `CancelOrder failed for id ${id}`, e.message)
      }

      throw new OrderFillTimeoutError(this, `Order was not filled after ${tries} tries`)
    }

    log.info(`[EDGE] Order was filled. Duration: ${Date.now() - now}`)

    return this.calculateReturnedFunds(apiRes, args.volume)
  }

  protected calculateOutputVolume (realVolume: Volume): Volume {
    return this.price.mul(realVolume).mul(new Decimal(1).minus(this.fee))
  }

  protected calculateCostAfterFees (apiResult: any): Volume {
    if (!apiResult.fee) {
      return new Decimal(apiResult.cost)
    }

    return new Decimal(apiResult.cost).minus(apiResult.fee.cost)
  }

  protected calculateReturnedFunds (apiResult: any, realVolume: Volume): Volume {
    let estimation: Volume
    let calculation: Decimal

    estimation = this.calculateOutputVolume(realVolume)

    if (apiResult.cost === undefined
     || apiResult.amount === undefined) {
      return estimation
    }

    log.info(`[FUNDS_CALCULATOR] Calculating returned funds from api result`)

    calculation = this.calculateCostAfterFees(apiResult)

    const percentageDiff = new Decimal(estimation.minus(calculation)).div(estimation).mul(100).toFixed(8)

    log.info(`[FUNDS_CALCULATOR]
      Estimation: ${estimation.toNumber()} ${this.target},
      FromAPI: ${calculation.toNumber()} ${this.target},
      Difference: ${percentageDiff} %`
    )

    return calculation
  }

  public async save (opportunityId: number, order: number): Promise<void> {
    return db('edges').insert({
      opportunity_id: opportunityId,
      virtual: this instanceof VirtualEdge,
      source: this.source,
      target: this.target,
      price: this.price.toNumber(),
      order: order,
      last_updated: Date.now() - this.lastUpdatedTs,
      taker_fee: this.fee.toNumber(),
      volume: !this.getVolume().equals(Infinity) ? this.volume.toNumber() : null
    })
  }
}

// A VirtualEdge allowing us to go from 'source' to 'target' by buying the
// 'target' and paying in 'source' units in the underlying market.
export class VirtualEdge extends Edge {
  public side: OrderSide = 'bid'
  protected price: Decimal = new Decimal(0)

  public setRealPrice (price: Price): void {
    this.setPrice(price.pow(-1))
  }

  public getRealPrice (): Price {
    return this.price.pow(-1)
  }

  public hasEmptyValues (): boolean {
    return this.volume.equals(0) && this.price.equals(0)
  }

  public getMarket (): string {
    return `${this.target}/${this.source}`
  }

  protected extractTopOfTheOrderBook (ob: any): any {
    return ob.asks[0]
  }

  protected calculateOutputVolume (realVolume: Volume): Volume {
    return new Decimal(realVolume).mul(new Decimal(1).minus(this.fee))
  }

  protected calculateCostAfterFees (apiResult: any): Volume {
    return new Decimal(apiResult.amount)
  }

  protected volumeToRealVolume (volume: Volume): Volume {
    return volume.div(this.getRealPrice())
  }

  protected setRealVolume (volume: Volume): void {
    /** With 1 ETH I buy 120 USD and have volume 0.1 eth
     *  So I can buy max 120 * 0.1 = 12 USD max
     */
    this.volume = new Decimal(volume).mul(this.getRealPrice())
  }

  protected worsenPrice (price: Price, factor: number): Price {
    return price.mul(1 + factor)
  }
}
