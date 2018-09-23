import { Currency } from '../types'
import log from '../loggers/winston'
import db from '../connectors/db'

export class Edge {
  public virtual: boolean = false
  public source: Currency
  public target: Currency
  public minVolume: number // Volume of OrderBook Top
  public volume: number = Infinity // Volume of OrderBook Top
  public fee: number = 0
  protected price: number = 0

  constructor (source: string, target: string, fee: number, minVolume: number) {
    this.source = source
    this.target = target
    this.fee = fee
    this.minVolume = minVolume
  }

  public setPrice (price: number): void {
    this.price = price
  }

  public getPrice(): number {
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

  public async traverse (api: any, volume: number, price: number = this.price, mock = true): Promise<any> {
    if (mock) {
      log.info(`I would proceed to an ask limit order on volume: ${volume} ${this.target} on price ${price} ${this.source}`)
      return
    }

    return api.createLimitSellOrder(this.getMarket(), volume, price)
  }

  public async save(cycleId: number) {
    return db('edges').insert({
      cycleId: cycleId,
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
  }

  public setPrice(price: number) {
    this.price = 1 / price
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
    this.volume =  volume * price
  }

  public async traverse (api: any, volume: number, price: number = this.price, mock = true): Promise<any> {
    if (mock) {
      log.info(`I would proceed to a bid limit order on volume: ${volume} ${this.target} on price ${1 / price} ${this.source}`)
      return
    }

    await api.createLimitBidOrder(this.getMarket(), volume, 1 / price)
  }
}
