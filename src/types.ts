import { Edge as EdgeDriver } from './models/edge'
import OpportunitySet from './models/opportunity'

export type Market = {
  [key: string]: any
}

type Api = any
export type Node = string
export type Currency = string
export type Edge = { v: Node, w: Node }
export type Triangle = EdgeDriver[]
export type Balance = {
  [key: string]: Volume
}

export type Volume = number
export type Price = number
export type OrderDetails = {
  side?: 'buy' | 'sell'
  type?: 'market' | 'limit'
  price?: Price
  mock?: boolean
  volume: Volume,
  api: Api,
}

export type OpportunitySets = {
  [key: string]: OpportunitySet
}
