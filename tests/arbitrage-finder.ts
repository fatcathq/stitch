import ArbitrageFinder from '../src/arbitrage-finder'
import Opportunity from '../src/models/opportunity'
import { Edge } from '../src/models/edge'

const createMockOpportunity = (triangle: [string, string, string]): Opportunity => {
  const edges = [
    new Edge(triangle[0], triangle[1]),
    new Edge(triangle[1], triangle[2]),
    new Edge(triangle[2], triangle[0])
  ]

  return new Opportunity('testExchange', edges)
}

describe('updateOpportunities', () => {
  let p1: Opportunity
  let p2: Opportunity
  let p3: Opportunity

  beforeEach(() => {
    p1 = createMockOpportunity(['A', 'B', 'C'])
    p2 = createMockOpportunity(['D', 'E', 'F'])
    p3 = createMockOpportunity(['G', 'H', 'I'])
  })

  test('deletes non existing opportunity', async () => {
    const arbitrageFinder = new ArbitrageFinder()

    arbitrageFinder.opportunityMap['ABC'] = p1
    arbitrageFinder.opportunityMap['DEF'] = p2

    await arbitrageFinder.updateOpportunities({ 'ABC': p1 })

    expect(Object.keys(arbitrageFinder.opportunityMap)).toHaveLength(1)
    expect(arbitrageFinder.opportunityMap['ABC']).toEqual(p1)
  })

  test('adds newly added opportunity', async () => {
    const arbitrageFinder = new ArbitrageFinder()

    arbitrageFinder.opportunityMap['ABC'] = p1

    await arbitrageFinder.updateOpportunities({ 'ABC': p1, 'DEF': p2 })

    expect(Object.keys(arbitrageFinder.opportunityMap)).toHaveLength(2)
    expect(arbitrageFinder.opportunityMap['ABC']).toEqual(p1)
    expect(arbitrageFinder.opportunityMap['DEF']).toEqual(p2)
  })

  test('emits events properly', async () => {
    const arbitrageFinder = new ArbitrageFinder()
    const addedSpy = jest.fn()
    const closedSpy = jest.fn()

    const unixEpoch = Date.now()
    const mockTime = jest.fn()

    Date.now = mockTime

    console.log('counting')
    arbitrageFinder.on('OpportunityAdded', addedSpy)
    arbitrageFinder.on('OpportunityClosed', closedSpy)

    arbitrageFinder.opportunityMap['ABC'] = p1
    arbitrageFinder.opportunityMap['PQR'] = p1

    mockTime.mockReturnValue(unixEpoch + 1500)

    let p = createMockOpportunity(['A', 'B', 'C'])

    await arbitrageFinder.updateOpportunities({ 'DEF': p2, 'GHI': p3, 'PQR': p })

    expect(addedSpy.mock.calls.length).toEqual(2)
    expect(addedSpy.mock.calls[0][0]).toEqual('DEF')
    expect(addedSpy.mock.calls[1][0]).toEqual('GHI')

    expect(closedSpy.mock.calls.length).toEqual(1)
    expect(closedSpy.mock.calls[0][0]).toEqual(p1)

    // Opportunity must remember its lifetime from update to update
    expect(arbitrageFinder.opportunityMap.PQR.getDuration()).toBeCloseTo(1500, -2)

    arbitrageFinder.removeAllListeners('OpportunityAdded')
    arbitrageFinder.removeAllListeners('OpportunityClosed')
  })

  test('calculates opportunity diff', () => {
    const A = { 'DEF': p2, 'GHI': p3 }
    const B = { 'DEF': p2 }
    const C = { 'BTC': p2 }

    expect(ArbitrageFinder.opportunityDiff(A, B)).toHaveProperty('GHI')
    expect(ArbitrageFinder.opportunityDiff(B, A)).toEqual({})
    expect(ArbitrageFinder.opportunityDiff(A, C)).toEqual(A)
  })
})
