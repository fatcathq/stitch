import Decimal from 'decimal.js'
import { Edge, VirtualEdge } from '../models/edge'

// Fees are applied in always in the target of the edge
export function bitfinex(volume: Decimal, edge: Edge): Decimal {
  return volume.mul(edge.getPriceAsDecimal()).mul((new Decimal(1).minus(edge.fee)))
}

/**
 * Fees are applied always in the currency.
 * - On sell position fees are applied to target
 * - On bid position fees are applied on source
 */
export function bittrex(volume: Decimal, edge: Edge): Decimal {
  if (edge instanceof VirtualEdge) {
    const afterFee = volume.mul(new Decimal(1).minus(edge.fee))

    return afterFee.mul(edge.getPriceAsDecimal())
  }
  else {
    return volume.mul(edge.getPriceAsDecimal()).mul(new Decimal(1).minus(edge.fee))
  }
}
