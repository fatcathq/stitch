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

  test('Constructor should construct graph nodes properly', () => {
    expect(graph.hasNode('ETH')).toBeTruthy()
    expect(graph.hasNode('BTC')).toBeTruthy()
  })

  test('Constructor should construct graph edges properly', () => {
    const edges = graph.edges()

    expect(edges).toHaveLength(2)
    expect(edges).toContainEqual({ v: 'ETH', w: 'BTC' })
    expect(edges).toContainEqual({ v: 'BTC', w: 'ETH' })
  })

  test('Constructor should construct edge drivers properly', () => {
    expect(graph.edge('ETH', 'BTC')).toBeInstanceOf(Edge)
    expect(graph.edge('BTC', 'ETH')).toBeInstanceOf(VirtualEdge)
  })
})
