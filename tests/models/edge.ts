import { Edge, VirtualEdge } from '../../src/models/edge'
import Decimal from 'decimal.js'

const createOrderBookAPIMock = (): any => {
  return {
    fetchOrderBook: jest.fn().mockReturnValue({
      bids: [
        [5.1, 9], // price, volume
        [4.9, 12]
      ],
      asks: [
        [5.2, 8.6],
        [5.6, 0.01]
      ]
    })
  }
}

describe(
  'edges', async () => {
    test('Edges have markets and sides', async () => {
      let edge = new Edge('ADA', 'BTC')

      expect(edge.getMarket()).toBe('ADA/BTC')
      expect(edge.side).toBe('sell')

      let virtualEdge = new VirtualEdge('BTC', 'ADA')

      expect(virtualEdge.getMarket()).toBe('ADA/BTC')
      expect(virtualEdge.side).toBe('buy')
    })

    test('Edges have prices', async () => {
      let edge = new Edge('ADA', 'BTC', [new Decimal(0), 'before'], new Decimal(0))

      edge.setPrice(new Decimal(3.14159265))
      expect(edge.getPrice().toNumber()).toBeCloseTo(3.14159265)
      expect(edge.getRealPrice().toNumber()).toBeCloseTo(3.14159265)

      edge.setRealPrice(new Decimal(2.71828))
      expect(edge.getPrice().toNumber()).toBeCloseTo(2.71828)
      expect(edge.getRealPrice().toNumber()).toBeCloseTo(2.71828)

      let virtualEdge = new VirtualEdge('BTC', 'ADA')

      virtualEdge.setPrice(new Decimal(3))
      expect(virtualEdge.getPrice().toNumber()).toBeCloseTo(3)
      expect(virtualEdge.getRealPrice().toNumber()).toBeCloseTo(1/3)

      virtualEdge.setRealPrice(new Decimal(5))
      expect(virtualEdge.getPrice().toNumber()).toBeCloseTo(1/5)
      expect(virtualEdge.getRealPrice().toNumber()).toBeCloseTo(5)
    })

    test('Edges can update from API', async () => {
      let api = createOrderBookAPIMock()
      let edge = new Edge('ADA', 'BTC')

      await edge.updateFromAPI(api)

      expect(edge.getVolume().toNumber()).toBe(9)
      expect(edge.getRealVolume().toNumber()).toBe(9)
      expect(edge.getPrice().toNumber()).toBe(5.1)
      expect(edge.getRealPrice().toNumber()).toBe(5.1)

      let virtualEdge = new VirtualEdge('BTC', 'ADA')

      await virtualEdge.updateFromAPI(api)

      expect(virtualEdge.getRealVolume().toNumber()).toBeCloseTo(8.6)
      expect(virtualEdge.getRealPrice().toNumber()).toBeCloseTo(5.2)
      expect(virtualEdge.getVolume().toNumber()).toBeCloseTo(8.6 * 5.2)
      expect(virtualEdge.getPrice().toNumber()).toBeCloseTo(1 / 5.2)
    })
  }
)
