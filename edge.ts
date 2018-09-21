import { Currency } from './types'

export default class {
  public source: Currency
  public target: Currency
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

  public async traverse (api: any, volume: number = this.volume, price: number = this.price): Promise<any> {
    console.log('Starting taversal')
    if (this.isVirtual) {
      console.log(await api.createLimitBidOrder(this.getMarket(), volume, price))
      return
    }

    console.log(await api.createLimitSellOrder(this.getMarket(), volume, price))
  }

  public getVolumeCurrency (): Currency {
    if (this.isVirtual) {
      return this.target
    }
    else {
      return this.source
    }
  }

  public getWeight (): number {
    if (this.isVirtual) {
      return 1 / this.price
    } else {
      return this.price
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
