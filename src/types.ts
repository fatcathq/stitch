import { Edge } from './models/edge'
import Opportunity from './models/opportunity'
import Decimal from 'decimal.js'

export type Market = {
  [key: string]: any
}

type Api = any
export type Node = string
export type Currency = string
export type Edge = { v: Node, w: Node }
export type Triangle = Edge[]
export type Balance = {
  [key: string]: Volume
}

export type Volume = Decimal
export type Price = Decimal
export type OrderDetails = {
  side?: 'buy' | 'sell'
  type?: 'market' | 'limit'
  price?: Price
  mock?: boolean
  volume: Volume,
  sustainLogs?: boolean
  api: Api,
}

export type OpportunityMap = {
  [key: string]: Opportunity
}

export type Precisions = {
  [key: string]: number
}

export type Iterator = (it: Decimal, edge: Edge) => Decimal
