import Graph from './graph'
// import log from '../loggers/winston'
import { OpportunityMap } from '../types'
import * as _ from 'lodash'
/*

type EdgeSample = {
  source: string
  target: string
  emptyValues: boolean
  lastUpdated: number
  price: number
  realPrice: number
  volume: number
}

class Stats {
  private graph: Graph
  private opportunities:OpportunityMap

  constructor (graph: Graph, opportunities: OpportunityMap) {
    this.graph = graph
    this.opportunities = opportunities
  }

  private generateEdgeSamples (graph: Graph): EdgeSample {
    return graph.edges().map((e: any) => {
      const edge = graph.edge(e)

      return {
        source: edge.source,
        target: edge.target,
        emptyValues: edge.hasEmptyValues(),
        lastUpdated: Date.now() - edge.lastUpdatedTs,
        price: edge.getPrice().toNumber(),
        realPrice: edge.getRealPrice(),
        volume: edge.volume
      }
    })
  }
}
*/

export function logStats (graph: Graph, opportunities: OpportunityMap): void {
  const samples = graph.edges().map((e: any) => {
    const edge = graph.edge(e)

    return {
      source: edge.source,
      target: edge.target,
      emptyValues: edge.hasEmptyValues(),
      lastUpdated: Date.now() - edge.lastUpdatedTs,
      price: edge.getPrice().toNumber(),
      realPrice: edge.getRealPrice(),
      volume: edge.volume
    }
  })
  const setEdges = samples.filter((s: any) => s.emptyValues === false)

  if (setEdges.length === 0) {
    return
  }

  const maxLastUpdated: any = _.maxBy(setEdges, 'lastUpdated')
  const minLastUpdated: any = _.minBy(setEdges, 'lastUpdated')
  const meanLastUpdated: any = _.meanBy(setEdges, 'lastUpdated')
  const stdLastUpdated: any = stdBy(setEdges, 'lastUpdated')

  console.log(`---------------------------------------------------------
|    All edges: ${graph.edges().length}, with set values: ${setEdges.length}
|    Open opportunities: ${Object.keys(opportunities).length}
|    Mean lastUpdated: ${meanLastUpdated}
|    Standard deviation lastUpdated: ${stdLastUpdated}
|    Max lastUpdated of set edges: ${maxLastUpdated.lastUpdated} on ${maxLastUpdated.source}->${maxLastUpdated.target} with price: ${maxLastUpdated.price}, realPirce: ${maxLastUpdated.realPrice} and volume: ${maxLastUpdated.volume}
|    Min lastUpdated of set edges: ${minLastUpdated.lastUpdated} on ${minLastUpdated.source}->${minLastUpdated.target} with price: ${minLastUpdated.price}, realPirce: ${minLastUpdated.realPrice} and volume: ${minLastUpdated.volume}
---------------------------------------------------------`)
}

function stdBy (dict: any, key: string): number {
  const array = dict.map((dict: any) => dict[key])
  const avg = _.sum(array) / array.length
  return Math.sqrt(_.sum(_.map(array, (i) => Math.pow((i - avg), 2))) / array.length)
}
