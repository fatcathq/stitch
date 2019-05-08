import { Edge, VirtualEdge } from '../../src/models/edge'
import Decimal from 'decimal.js'
import Opportunity from '../../src/models/opportunity'

const createMockOpportunity = (triangle: [string, string, string]): Opportunity => {
  const edges = [
    new Edge(triangle[0], triangle[1]),
    new Edge(triangle[1], triangle[2]),
    new Edge(triangle[2], triangle[0])
  ]

  return new Opportunity('testExchange', edges)
}

describe('opportunity', () => {
  test('opportunity reports its lifetime', () => {
    const unixEpoch = Date.now()
    const mockTime = jest.fn()
    const p1 = createMockOpportunity(['A', 'B', 'C'])

    Date.now = mockTime
    mockTime.mockReturnValue(unixEpoch + 1500)

    expect(p1.getDuration()).toBeCloseTo(1500, -2)
  })
})

describe('calculateArbitrage', () => {
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
})
