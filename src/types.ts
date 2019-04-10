import { Edge } from './models/edge'
import Opportunity from './models/opportunity'
import Decimal from 'decimal.js'

export type OrderBookRecord = {
  asset: Currency,
  currency: Currency
  type: string
  volume: number,
  price: number
}

export type Market = {
  symbol: string,
  base: string,
  quote: string
  minVolume: Decimal
  precision: {
    amount: Decimal,
    price: Decimal
  }
}

type Api = any
export type Node = string
export type Currency = string
export type Edge = { v: Node, w: Node }
export type Triangle = Edge[]
export type Balance = {
  [key: string]: Volume
}
export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'

export type Volume = Decimal
export type Price = Decimal
export type OrderDetails = {
  side?: OrderSide
  type?: OrderType
  price?: Price
  mock?: boolean
  volume: Volume
  muteLogs?: boolean
  api?: Api
}

export type OpportunityMap = {
  [key: string]: Opportunity
}

export type Precisions = {
  [key: string]: number
}

export type Iterator = (it: Decimal, edge: Edge) => Decimal
