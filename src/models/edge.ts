import Decimal from 'decimal.js'
import { Currency, Volume, Price, OrderDetails } from '../types'
import log from '../loggers/winston'
import db from '../connectors/db'
import { OrderFillTimeoutError, TraversalAPIError } from '../errors/edgeErrors'
import { financial } from '../utils/helpers'

const FILLED_ORDER_TRIES = 6

export class Edge {
  public virtual: boolean = false
  public source: Currency
  public target: Currency
  public sourcePrecision: number
  public targetPrecision: number
  public minVolume: Volume // Volume of OrderBook Top
  // Volume is source units (in both Edge and VirtualEdge)
  public volume: Decimal = new Decimal(Infinity) // Volume of OrderBook Top
  public fee: number = 0
  public stringified: string
  // Price is target unit (in both Edge and VirtualEdge)
  protected price: Decimal = new Decimal(0)

  constructor (source: string, target: string, fee: number, minVolume: Volume, precisions: [number, number]) {
    this.source = source
    this.target = target
    this.fee = fee
    this.minVolume = minVolume

    this.sourcePrecision = precisions[0]
    this.targetPrecision = precisions[1]

    this.stringified = `${this.source} -> ${this.target}`
  }

  public setPrice (price: Price): void {
    this.price = new Decimal(price)
    log.debug(`New price on edge ${this.stringified}. With 1 ${this.source} you buy ${this.price} ${this.target}`)
  }

  public getPrice(): Price {
    return this.price.toNumber()
  }

  public getVolume(): Volume {
    return this.volume.toNumber()
  }

  public getPriceAsDecimal(): Decimal {
    return this.price
  }

  public getVolumeAsDecimal(): Decimal {
    return this.volume
  }

  public getMarket (): string {
    return `${this.source}/${this.target}`
  }

  public async updateFromAPI (api: any): Promise<void> {
    const ob = await api.fetchOrderBook(this.getMarket(), 1)
    const [price, volume] = ob.bids[0]

    this.price = new Decimal(price)
    this.volume = new Decimal(volume)
  }

  /*
   * Volume and Price for this function call are given in the same units as this.volume and this.price
   */
  public async traverse (args: OrderDetails): Promise<boolean> {
    return await this.placeAndFillOrder({
      type: args.type ? args.type : 'limit',
      side: 'sell',
      price: this.getPrice(),
      ...args
    })
  }

  /*
   * Volume and Price for this function call are given for the real market, not the virtual market
   * (both for Edge and VirtualEdge)
   */
  public async placeAndFillOrder(args: OrderDetails): Promise<boolean> {
    log.info(`[EDGE] Placing order ${this.source} -> ${this.target}`)

    log.info(`[ACTIVE_TRADING] Expecting to get ${financial(this.estimateVolumeAfterTraversal(args.volume), this.targetPrecision)} ${this.target})`)

    if (args.mock) {
      log.info(`[EDGE] Mocking the trade`)
    }

    let method = args.side === 'sell' ?
      (args.type === 'limit' ? 'createLimitSellOrder' : 'createMarketSellOrder') :
      (args.type === 'limit' ? 'createLimitBuyOrder' : 'createMarketBuyOrder')

    log.info(`[EDGE] Placing an ${args.side} ${args.type} order on market ${this.getMarket()} with volume: ${args.volume} and  price ${args.price}`)

    if (args.mock) {
      return true
    }

    let id: null | number = null

    try {
      log.info(`[EDGE] Calling api.${method}(${this.getMarket()}, ${args.volume}, ${args.price})`)
      const res = await args.api[method](this.getMarket(), financial(args.volume, this.sourcePrecision), args.price)

      id = res.id
    }
    catch (e) {
      throw new TraversalAPIError(this, `${method} failed`,  e.message)
    }

    if (id === null) {
      log.info(`Invalid id: ${id}`)
      return false
    }

    log.info(`[EDGE] Placed order with id: ${id}. Now waiting order to be filled`)

    let status: string
    const now = Date.now()
    let tries = 0
    let apiRes

    do {
      ++tries

      try {
        apiRes = await args.api.fetchOrder(id)
        console.log(apiRes)
      } catch (e) {
        throw new TraversalAPIError(this, `FetchOrder failed`, e.message)
      }

      status = apiRes.status
      log.info(`[EDGE] Status: ${status}, tries: ${tries}`)
    } while (status !== 'closed' && tries < FILLED_ORDER_TRIES)

    if (status !== 'closed') {
      log.warn(`[EDGE] Order was not filled`)
      try {
        const res = await args.api.cancelOrder(id)
        log.info(`[EDGE] Order was cancelled`)
        console.log(res)
      } catch (e) {
        throw new TraversalAPIError(this, `Cancelorder failed for id ${id}`,  e.message)
      }
      log.warn(`[EDGE] Edge traversal (Order) was cancelled`)

      throw new OrderFillTimeoutError(this, `Order was not filled after ${tries} tries`)
    }

    log.info(`[EDGE] Order was filled. Duration: ${Date.now() - now}`)

    return true
  }

  public estimateVolumeAfterTraversal(volume: number): number {
    return this.getPriceAsDecimal().mul(volume).mul(1 - this.fee).toNumber()
  }

  public async save(cycleId: number) {
    return db('edges').insert({
      cycle_id: cycleId,
      virtual: this.virtual,
      source: this.source,
      target: this.target,
      price: this.price,
      taker_fee: this.fee,
      volume: this.getVolume() !== Infinity ? this.volume : null
    })
  }
}

export class VirtualEdge extends Edge {
  constructor (source: string, target: string, fee: number, minVolume: number, precisions: [number, number]) {
    super(source, target, fee, minVolume, precisions)
    this.virtual = true
  }

  public setPrice(price: number) {
    this.price = new Decimal(price).pow(-1)

    log.debug(`New price on edge ${this.stringified}. With 1 ${this.source} you buy ${this.price} ${this.target}`)
  }

  public getMarket(): string {
    return `${this.target}/${this.source}`
  }

  public async updateFromAPI (api: any): Promise<void> {
    const ob = await api.fetchOrderBook(this.getMarket(), 1)
    const [price, volume] = ob.asks[0]

    this.setPrice(price)

    /** With 1 ETH I buy 120 USD and have volume 0.1 eth
     *  So I can buy max 120 * 0.1 = 12 USD max
     */
    this.volume = new Decimal(volume).mul(price)
  }

  public async traverse (args: OrderDetails): Promise<boolean> {
    /*
     * real price = 1 / virtual price
     * real volume = virtual price * virtual volume = virtual volume / real price
     */
    args.price = this.price.pow(-1).toNumber()
    args.volume = new Decimal(args.volume).div(args.price).toNumber()

    return await this.placeAndFillOrder({
      type: args.type ? args.type : 'limit',
      side: 'buy',
      ...args
    })
  }
}
