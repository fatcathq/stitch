import { Currency } from './types'
import log from './loggers/winston'

export class Edge {
  public source: Currency
  public target: Currency
  public price: number
  public volume: number = 0 // Volume of OrderBook Top
  public fee: number = 0

  constructor (source: string, target: string, fee: number, price: number) {
    this.source = source
    this.target = target
    this.fee = fee
    this.price = price
  }

  public getMarket (): string {
    return `${this.source}/${this.target}`
  }

  public async traverse (api: any, volume: number = this.volume, price: number = this.price, mock = true): Promise<any> {
    if (mock) {
      log.info(`I would proceed to an ask limit order on volume: ${volume} ${this.target} on price ${price} ${this.source}`)
      return
    }

    return api.createLimitSellOrder(this.getMarket(), volume, price)
  }

  public getVolumeCurrency (): Currency {
    return this.source
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
}

export class VirtualEdge extends Edge {
  constructor (source: string, target: string, fee: number, price: number = -1) {
    super(source, target, fee, price)
    this.price = 1 / price
  }

  public async updateFromAPI (api: any): Promise<void> {
    const ob = await api.fetchOrderBook(this.getMarket(), 1)
    const [price, volume] = ob.asks[0]

    this.price = 1 / price

    /** With 1 ETH I buy 120 USD and have volume 0.1 eth
     *  So I can buy max 120 * 0.1 = 12 USD max
     */
    this.volume =  volume * price
  }

  public getMarket(): string {
    return `${this.target}/${this.source}`
  }

  public async traverse (api: any, volume: number = this.volume * this.price, price: number = 1 / this.price, mock = true): Promise<any> {
    if (mock) {
      log.info(`I would proceed to a bid limit order on volume: ${volume} ${this.target} on price ${price} ${this.source}`)
      return
    }

    await api.createLimitBidOrder(this.getMarket(), volume, price)
  }
}
