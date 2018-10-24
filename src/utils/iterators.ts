import Decimal from 'decimal.js'
import { Edge, VirtualEdge } from '../models/edge'

export function bitfinex(volume: Decimal, edge: Edge): Decimal {
  return new Decimal(volume).mul(edge.getPriceAsDecimal()).mul((1 - edge.fee))
}

export function bittrex(volume: Decimal, edge: Edge): Decimal {
  if (edge instanceof VirtualEdge) {
    return new Decimal(volume).mul(edge.getPriceAsDecimal()).minus(edge.fee)
  }
  else {
    return new Decimal(volume).mul(edge.getPriceAsDecimal()).mul(1 - edge.fee)
  }
}
