import { Edge, VirtualEdge } from '../../src/models/edge'
import Decimal from 'decimal.js'
import Opportunity from '../../src/models/opportunity'

describe(
  'calculateArbitrage', async () => {
    test('No-fee arbitrage is calculated correctly for real edges', async () => {
      const edge1 = new Edge('BTC', 'ADA')
      edge1.setPrice(new Decimal(1))

      const edge2 = new Edge('ADA', 'USD')
      edge2.setPrice(new Decimal(2))

      const edge3 = new Edge('USD', 'BTC')
      edge3.setPrice(new Decimal(3))

      const p = new Opportunity('testExchange', [edge1, edge2, edge3])
      let n = (await p.calculateArbitrage()).toNumber()

      expect(n).toBeCloseTo(6)
    })

    test('No-fee arbitrage is calculated correctly', async () => {
      const edge1 = new VirtualEdge('BTC', 'ADA')
      edge1.setPrice(new Decimal(1))

      const edge2 = new Edge('ADA', 'USD')
      edge2.setPrice(new Decimal(2))

      const edge3 = new VirtualEdge('USD', 'BTC')
      edge3.setPrice(new Decimal(3))

      const p = new Opportunity('testExchange', [edge1, edge2, edge3])
      let n = (await p.calculateArbitrage()).toNumber()

      expect(n).toBeCloseTo(6)
    })
  }
)
