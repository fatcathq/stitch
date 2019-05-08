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
  'edges', () => {
    let edge: Edge
    let virtualEdge: VirtualEdge

    beforeEach(() => {
      edge = new Edge('ADA', 'BTC')
      virtualEdge = new VirtualEdge('BTC', 'ADA')
    })

    test('Edges have markets and sides', () => {
      expect(edge.getMarket()).toBe('ADA/BTC')
      expect(edge.side).toBe('ask')

      expect(virtualEdge.getMarket()).toBe('ADA/BTC')
      expect(virtualEdge.side).toBe('bid')
    })

    test('Edges can be stringified', () => {
      expect(`${edge}`).toBe('ADA -> BTC')
      expect(`${virtualEdge}`).toBe('BTC -> ADA')
    })

    test('Edges have prices', () => {
      edge.setPrice(new Decimal(3.14159265))
      expect(edge.getPrice().toNumber()).toBeCloseTo(3.14159265)
      expect(edge.getRealPrice().toNumber()).toBeCloseTo(3.14159265)

      edge.setRealPrice(new Decimal(2.71828))
      expect(edge.getPrice().toNumber()).toBeCloseTo(2.71828)
      expect(edge.getRealPrice().toNumber()).toBeCloseTo(2.71828)

      virtualEdge.setPrice(new Decimal(3))
      expect(virtualEdge.getPrice().toNumber()).toBeCloseTo(3)
      expect(virtualEdge.getRealPrice().toNumber()).toBeCloseTo(1 / 3)

      virtualEdge.setRealPrice(new Decimal(5))
      expect(virtualEdge.getPrice().toNumber()).toBeCloseTo(1 / 5)
      expect(virtualEdge.getRealPrice().toNumber()).toBeCloseTo(5)
    })

    test('Edges can update from API', async () => {
      let api = createOrderBookAPIMock()

      await edge.updateFromAPI(api)

      expect(edge.getVolume().toNumber()).toBe(9)
      expect(edge.getRealVolume().toNumber()).toBe(9)
      expect(edge.getPrice().toNumber()).toBe(5.1)
      expect(edge.getRealPrice().toNumber()).toBe(5.1)

      await virtualEdge.updateFromAPI(api)

      expect(virtualEdge.getRealVolume().toNumber()).toBeCloseTo(8.6)
      expect(virtualEdge.getRealPrice().toNumber()).toBeCloseTo(5.2)
      expect(virtualEdge.getVolume().toNumber()).toBeCloseTo(8.6 * 5.2)
      expect(virtualEdge.getPrice().toNumber()).toBeCloseTo(1 / 5.2)
    })

    test('Edges can be traversed', () => {
      // let api = createOrderBookAPIMock()

      edge.traverse({
        volume: new Decimal(3.7),
        mock: true
      })
    })
  }
)

describe('hasEmptyValues', () => {
  let edge: Edge
  let virtualEdge: Edge

  beforeEach(() => {
    edge = new Edge('ADA', 'BTC')
    virtualEdge = new VirtualEdge('BTC', 'ADA')
  })

  test('Returns true on default values', () => {
    expect(edge.hasEmptyValues()).toBeTruthy()
    expect(virtualEdge.hasEmptyValues()).toBeTruthy()
  })

  test('Returns true on default values', () => {
    edge.setPrice(new Decimal(1))
    virtualEdge.setPrice(new Decimal(2))

    expect(edge.hasEmptyValues()).toBeFalsy()
    expect(virtualEdge.hasEmptyValues()).toBeFalsy()
  })
})
