import Graph from '../../src/models/graph'
import { Market, OrderBookRecord } from '../../src/types'
import { Edge, VirtualEdge } from '../../src/models/edge'
import Decimal from 'decimal.js'

const markets = [
  {
    symbol: 'ETH/BTC',
    base: 'ETH',
    quote: 'BTC',
    fee: new Decimal(0.0025),
    precisions: {
      base: new Decimal(8),
      quote: new Decimal(8)
    },
    minBaseVolume: new Decimal(0.001)
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
  beforeEach(() => {
    graph = new Graph('Picaccu', markets)
  })

  test('Should return false if edge does not exists', () => {
    const record = {
      asset: 'ZEC',
      currency: 'LALA',
      side: 'ask',
      volume: 1.2,
      price: 3.12
    } as OrderBookRecord

    expect(graph.updateFromOBTRecord(record)).toBeFalsy()
  })

  test('Should update edge properly', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      side: 'bid',
      volume: 14.332,
      price: 0.03796237
    } as OrderBookRecord

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.edge('ETH', 'BTC').getRealVolume().toNumber()).toBeCloseTo(14.332)
    expect(graph.edge('ETH', 'BTC').getRealPrice().toNumber()).toBeCloseTo(0.03796237)
  })

  test('Should update virtual edge properly', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      side: 'ask',
      volume: 14.332,
      price: 0.03796237
    } as OrderBookRecord

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.edge('BTC', 'ETH').getRealVolume().toNumber()).toBeCloseTo(14.332)
    expect(graph.edge('BTC', 'ETH').getRealPrice().toNumber()).toBeCloseTo(0.03796237)
  })

  test('Should not update edge if price and volume are the same', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      side: 'ask',
      volume: 14.332,
      price: 0.03796237
    } as OrderBookRecord

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.updateFromOBTRecord(record)).toBeFalsy()
  })

  test('Should not update virtual edge if price and volume are the same', () => {
    const record = {
      asset: 'ETH',
      currency: 'BTC',
      side: 'ask',
      volume: 14.332,
      price: 0.03796237
    } as OrderBookRecord

    expect(graph.updateFromOBTRecord(record)).toBeTruthy()
    expect(graph.updateFromOBTRecord(record)).toBeFalsy()
  })
})

describe('getTriangles', () => {
  let graph: Graph
  beforeEach(() => {
    graph = new Graph('Picaccu', markets)
  })

  const addEdgeToGraph = (from: string, to: string) => {
    graph.setEdge(from, to, new Edge(from, to, [new Decimal(0), 'after'], new Decimal(0), [5, 5]))
  }

  test('Should not return triangles if triangles do not exist', () => {
    addEdgeToGraph('ETH', 'BTC')
    graph.edge('ETH', 'BTC').setRealPrice(new Decimal(0.03))

    addEdgeToGraph('BTC', 'ETH')
    graph.edge('BTC', 'ETH').setRealPrice(new Decimal(30))

    addEdgeToGraph('ZEC', 'ETH')
    graph.edge('ZEC', 'ETH').setRealPrice(new Decimal(0.3))

    expect(graph.getTriangles(true)).toHaveLength(0)
  })

  test('Should return triangles if triangles exist', () => {
    addEdgeToGraph('ETH', 'BTC')
    graph.edge('ETH', 'BTC').setRealPrice(new Decimal(0.03))

    addEdgeToGraph('BTC', 'ZEC')
    graph.edge('BTC', 'ZEC').setRealPrice(new Decimal(30))

    addEdgeToGraph('ZEC', 'ETH')
    graph.edge('ZEC', 'ETH').setRealPrice(new Decimal(0.3))

    const triangles = graph.getTriangles(true)
    expect(triangles).toHaveLength(1)
    expect(triangles[0]).toHaveLength(3)
  })
})

describe('getNonEmptyTriangles', () => {
  let graph: Graph
  beforeEach(() => {
    graph = new Graph('Picaccu', markets)
  })

  const addEdgeToGraph = (from: string, to: string) => {
    graph.setEdge(from, to, new Edge(from, to, [new Decimal(0), 'after'], new Decimal(0), [5, 5]))
  }

  test('Should not return triangles if edges are empty', () => {
    addEdgeToGraph('ETH', 'BTC')
    addEdgeToGraph('BTC', 'ZEC')
    addEdgeToGraph('ZEC', 'ETH')

    expect(graph.getNonEmptyTriangles(true)).toEqual([])
  })

  test('Should not return triangles if at least one edge is empty', () => {
    addEdgeToGraph('ETH', 'BTC')

    addEdgeToGraph('BTC', 'ZEC')
    graph.edge('BTC', 'ZEC').setRealPrice(new Decimal(30))

    addEdgeToGraph('ZEC', 'ETH')
    graph.edge('ZEC', 'ETH').setRealPrice(new Decimal(0.3))

    expect(graph.getNonEmptyTriangles(true)).toEqual([])
  })

  test('Should return triangles if all edges are non empty', () => {
    addEdgeToGraph('ETH', 'BTC')
    graph.edge('ETH', 'BTC').setRealPrice(new Decimal(0.03))

    addEdgeToGraph('BTC', 'ZEC')
    graph.edge('BTC', 'ZEC').setRealPrice(new Decimal(30))

    addEdgeToGraph('ZEC', 'ETH')
    graph.edge('ZEC', 'ETH').setRealPrice(new Decimal(0.3))

    expect(graph.getNonEmptyTriangles(true)).toHaveLength(1)
  })
})

describe('getMarketsPotentiallyParticipatingInTriangle', () => {
  const generateMarketFromBaseQuote = (base: string, quote: string): Market => {
    return {
      symbol: `${base}/${quote}`,
      base: base,
      quote: quote,
      fee: new Decimal(0.0025),
      precisions: {
        base: new Decimal(8),
        quote: new Decimal(8)
      },
      minBaseVolume: new Decimal(0.001)
    }
  }

  test('Should find proper markets', () => {
    const markets = [
      generateMarketFromBaseQuote('ETH', 'BTC'),
      generateMarketFromBaseQuote('COB', 'BTC'),
      generateMarketFromBaseQuote('COB', 'ETH'),
      generateMarketFromBaseQuote('TZA', 'ETH'),
      generateMarketFromBaseQuote('MAL', 'ETH'),
      generateMarketFromBaseQuote('LEX', 'BTC')
    ]

    expect(Object.keys(Graph.getMarketsPotentiallyParticipatingInTriangle(markets))).toHaveLength(3)
  })

  test('Should return as proper markets', () => {
    const markets = [
      generateMarketFromBaseQuote('ETH', 'BTC'),
      generateMarketFromBaseQuote('COB', 'BTC'),
      generateMarketFromBaseQuote('TSIFSA', 'COB')
    ]

    expect(Graph.getMarketsPotentiallyParticipatingInTriangle(markets)).toEqual([generateMarketFromBaseQuote('COB','BTC')])
  })
})
