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
  public async traverse (args: OrderDetails): Promise<boolean> {
    log.info(`[ACTIVE_TRADING] Expecting to get ${args.volume * this.price} ${this.target}`)

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
  public async placeAndFillOrder(args: OrderDetails): Promise<boolean> {
    log.info(`[EDGE] Placing order ${this.source} -> ${this.target}`)

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
      const res = await args.api[method](this.getMarket(), args.volume, args.price)

      console.log(res)

      id = res.id
    }
    catch (e) {
      log.error(`[EDGE] Cannot traverse edge ${this.stringified}: ${e.message}`)
      return false
    }

    if (id === null) {
      log.info(`Invalid id: ${id}`)
      return false
    }

    log.info(`[EDGE] Placed order with id: ${id}. Now waiting order to be filled`)

    let status: string
    const now = Date.now()

    do {
      const apiRes = await args.api.fetchOrder(id)
      status = apiRes.status
      log.info(`[EDGE] Status: ${status}`)
    } while (status !== 'closed')

    log.info(`[EDGE] Order was filled. Duration: ${Date.now() - now}`)

    return true
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

  public async traverse (args: OrderDetails): Promise<boolean> {
    /*
     * real price = 1 / virtual price
     * real volume = virtual price * virtual volume = virtual volume / real price
     */
    args.price = 1 / this.price
    args.volume = args.volume / args.price

    log.info(`[ACTIVE_TRADING] Expecting to get ${args.volume * this.price} ${this.target}`)

    return await this.placeAndFillOrder({
      type: 'limit',
      side: 'buy',
      ...args
    })
  }
}
