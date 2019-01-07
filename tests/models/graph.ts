import Graph from '../../src/models/graph'
import { Edge, VirtualEdge } from '../../src/models/edge'

const markets = [
  {
    symbol: 'ETH/BTC',
    base: 'ETH',
    quote: 'BTC',
    taker: 0.0025,
    precision: {
      price: 8,
      amount: 8
    },
    limits: {
      amount: {
        min: 0.001
      }
    }
  }
]

describe('constructor', () => {
  const graph = new Graph('Picaccu', markets)

  test('Should construct graph nodes properly', () => {
    expect(graph.hasNode('ETH')).toBeTruthy()
    expect(graph.hasNode('BTC')).toBeTruthy()
  })

  test('Should construct graph edges properly', () => {
    const edges = graph.edges()

    expect(edges).toHaveLength(2)
    expect(edges).toContainEqual({ v: 'ETH', w: 'BTC' })
    expect(edges).toContainEqual({ v: 'BTC', w: 'ETH' })
  })

  test('Should construct edge drivers properly', () => {
    expect(graph.edge('ETH', 'BTC')).toBeInstanceOf(Edge)
    expect(graph.edge('BTC', 'ETH')).toBeInstanceOf(VirtualEdge)
  })
})

describe('updateFromOBT', () => {
  let graph: Graph
  beforeAll(() => {
    graph = new Graph('Picaccu', markets)
  })

  test('Should return false if edge does not exists', () => {
    const record = {
      asset: 'ZEC',
      currency: 'LALA',
      type: 'sell',
      volume: 1.2,
      price: 3.12
    }

    expect(graph.updateFromOBTRecord(record)).toBeFalsy()
  })

  test('Should update edge properly', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      type: 'buy',
      volume: 14.332,
      price: 0.03796237
    }

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.edge('ETH', 'BTC').getRealVolume().toNumber()).toBeCloseTo(14.332)
    expect(graph.edge('ETH', 'BTC').getRealPrice().toNumber()).toBeCloseTo(0.03796237)
  })

  test('Should update virtual edge properly', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      type: 'sell',
      volume: 14.332,
      price: 0.03796237
    }

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.edge('BTC', 'ETH').getRealVolume().toNumber()).toBeCloseTo(14.332)
    expect(graph.edge('BTC', 'ETH').getRealPrice().toNumber()).toBeCloseTo(0.03796237)
  })

  test('Should update virtual edge properly', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      type: 'sell',
      volume: 14.332,
      price: 0.03796237
    }

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
  })
})
