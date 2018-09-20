import EdgeDriver from './edge'

export type Market = {
  [key: string]: any
}

export type Node = string
export type Edge = { v: Node, w: Node }
export type Triangle = EdgeDriver[]

export type Opportunity = {
  exchange: string,
  arbitrage: number
  triangle: Triangle
}
