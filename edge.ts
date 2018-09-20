import { Node } from './types'

export default class {
  public source: Node = 'BTC'
  public target: Node = 'ETH'
  public price: number
  public volume: number = 0 // Volume of OrderBook Top
  public isVirtual: boolean = false
  public fee: number = 0

  constructor (source: string, target: string, price: number, fee: number, isVirtual: boolean) {
    this.source = source
    this.target = target
    this.fee = fee
    this.price = price
    this.isVirtual = isVirtual
  }

  public getMarket (): string {
    return this.isVirtual ? `${this.target}/${this.source}` : `${this.source}/${this.target}`
  }

  public getWeight (): number {
    if (this.isVirtual) {
      return (1 - this.fee) / this.price
    } else {
      return (1 - this.fee) * this.price
    }
  }

  public async updateFromAPI (api: any): Promise<void> {
    const ob = await api.fetchOrderBook(this.getMarket(), 1)

    if (this.isVirtual) {
      [this.price, this.volume] = ob.asks[0]
    } else {
      [this.price, this.volume] = ob.bids[0]
    }
  }

  public updatePrice (price: any): any {
    this.price = price
  }
}
