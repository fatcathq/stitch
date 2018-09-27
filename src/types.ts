import { Edge as EdgeDriver } from './models/edge'
import OpportunitySet from './models/opportunity'

export type Market = {
  [key: string]: any
}

export type Node = string
export type Currency = string
export type Edge = { v: Node, w: Node }
export type Triangle = EdgeDriver[]
export type Balance = Map<string, number>

export type OpportunitySets = {
  [key: string]: OpportunitySet
}
