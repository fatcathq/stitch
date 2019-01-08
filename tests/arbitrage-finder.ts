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

describe('updateOpportunities', async () => {
  const p1 = createMockOpportunity(['A', 'B', 'C'])
  const p2 = createMockOpportunity(['D', 'E', 'F'])

  test('deletes non existing opportunity', async () => {
    const arbitrageFinder = new ArbitrageFinder(null)

    arbitrageFinder.opportunityMap['ABC'] = p1
    arbitrageFinder.opportunityMap['DEF'] = p2

    await arbitrageFinder.updateOpportunities({ 'ABC': p1 })

    expect(Object.keys(arbitrageFinder.opportunityMap)).toHaveLength(1)
    expect(arbitrageFinder.opportunityMap['ABC']).toEqual(p1)
  })

  test('adds newly added opportunity', async () => {
    const arbitrageFinder = new ArbitrageFinder(null)

    arbitrageFinder.opportunityMap['ABC'] = p1

    await arbitrageFinder.updateOpportunities({ 'ABC': p1, 'DEF': p2 })

    expect(Object.keys(arbitrageFinder.opportunityMap)).toHaveLength(2)
    expect(arbitrageFinder.opportunityMap['ABC']).toEqual(p1)
    expect(arbitrageFinder.opportunityMap['DEF']).toEqual(p2)
  })
})
