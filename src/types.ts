import { Edge } from './models/edge'
import Opportunity from './models/opportunity'
import Decimal from 'decimal.js'

export type Currency = string
export type Node = Currency
export type Edge = { v: Node, w: Node }
export type Triangle = Edge[]
export type OrderSide = 'bid' | 'ask'
export type OrderType = 'market' | 'limit'
export type Volume = Decimal
export type Price = Decimal
type Api = any

export type OrderDetails = {
  side?: OrderSide,
  type?: OrderType,
  price?: Price,
  mock?: boolean,
  volume: Volume,
  api?: Api
}

export type Balance = {
  [key: string]: Volume
}

export type OrderBookRecord = {
  asset: Currency,
  currency: Currency,
  side: OrderSide,
  volume: number,
  price: number
}

export type Market = {
  symbol: string,
  base: string,
  quote: string,
  fee: Decimal,
  minBaseVolume: Decimal,
  precisions: {
    base: Decimal,
    quote: Decimal
  }
}

export type OpportunityMap = {
  [key: string]: Opportunity
}

export type Precisions = {
  [key: string]: number
}
