import { Currency, Volume, Price, OrderDetails } from '../types'
import log from '../loggers/winston'
import db from '../connectors/db'

export class Edge {
  public virtual: boolean = false
  public source: Currency
  public target: Currency
  public minVolume: Volume // Volume of OrderBook Top
  // Volume is source units (in both Edge and VirtualEdge)
  public volume: Volume = Infinity // Volume of OrderBook Top
  public fee: number = 0
  public stringified: string
  // Price is target unit (in both Edge and VirtualEdge)
  protected price: Price = 0

  constructor (source: string, target: string, fee: number, minVolume: Volume) {
    this.source = source
    this.target = target
    this.fee = fee
    this.minVolume = minVolume
    this.stringified = `${this.source} -> ${this.target}`
  }

  public setPrice (price: Price): void {
    this.price = price
    log.debug(`New price on edge ${this.stringified}. With 1 ${this.source} you buy ${this.price} ${this.target}`)
  }

  public getPrice(): Price {
    return this.price
  }

  public getMarket (): string {
    return `${this.source}/${this.target}`
  }

  public getWeight (): number {
    return this.price
  }

  public async updateFromAPI (api: any): Promise<void> {
    const ob = await api.fetchOrderBook(this.getMarket(), 1)
    const [price, volume] = ob.bids[0]

    this.price = price
    this.volume = volume
  }

  /*
   * Volume and Price for this function call are given in the same units as this.volume and this.price
   */
  public async traverse (args: OrderDetails): Promise<any> {
    return await this.placeAndFillOrder({
      type: 'limit',
      side: 'sell',
      price: this.price,
      ...args
    })
  }

  /*
   * Volume and Price for this function call are given for the real market, not the virtual market
   * (both for Edge and VirtualEdge)
   */
  public async placeAndFillOrder(args: OrderDetails): Promise<void> {
    let status
    log.info(`[TRADING] Placing order ${this.source} -> ${this.target}`)

    if (args.mock) {
      log.info(`[TRADING] Mocking the trade`)
    }

    let method = args.side === 'sell' ?
      (args.type === 'limit' ? 'createLimitSellOrder' : 'createMarketSellOrder') :
      (args.type === 'limit' ? 'createLimitBuyOrder' : 'createMarketBuyOrder')

    log.info(`Method: ${method}`)

    log.info(`[ACTIVE_TRADING] Placing an ${args.side} ${args.type} order with volume: ${args.volume} ${this.source} on price ${args.price} ${this.target}`)
    log.info(`[ACTIVE_TRADING] Expecting to get ${args.volume * this.price} ${this.target}`)

    if (args.mock) {
      return
    }

    let id: null | number = null

    try {
      log.info(`Calling api.${method}(${this.getMarket()}, ${args.volume}, ${args.price})`)

      const res = await args.api[method](this.getMarket(), args.volume, args.price)

      console.log(res)

      id = res.id
    }
    catch (e) {
      console.log(e)
      return
    }

    if (id === null) {
      log.info(`Invalid id: ${id}`)
      return
    }

    log.info(`[ACTIVE_TRADING] Placed order with id: ${id}`)

    log.info(`[ACTIVE_TRADING] Waiting for order to be filled`)
    do {
      const res = await args.api.fetchOrder(id)
      console.log('FetchOrder res', res)
      const status = res.status
      log.debug(`Status ${status}`)
    } while (status !== 'closed')

    log.info(`[ACTIVE_TRADING] Order was filled`)
  }

  public async save(cycleId: number) {
    return db('edges').insert({
      cycle_id: cycleId,
      virtual: this.virtual,
      source: this.source,
      target: this.target,
      price: this.price,
      taker_fee: this.fee,
      volume: this.volume !== Infinity ? this.volume : null
    })
  }
}

export class VirtualEdge extends Edge {
  constructor (source: string, target: string, fee: number, minVolume: number) {
    super(source, target, fee, minVolume)
    this.virtual = true
    this.stringified = `${this.source} -> ${this.target}`
  }

  public setPrice(price: number) {
    this.price = 1 / price
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
    this.volume = volume * price
  }

  public async traverse (args: OrderDetails): Promise<void> {
    args.price = 1 / this.price
    args.volume = args.volume / args.price

    return await this.placeAndFillOrder({
      type: 'limit',
      side: 'buy',
      ...args
    })
  }
}
