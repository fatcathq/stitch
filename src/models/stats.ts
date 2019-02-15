import Graph from './graph'
import * as _ from 'lodash'
import { OpportunityMap } from '../types'

type EdgeSample = {
  source: string
  target: string
  emptyValues: boolean
  lastUpdated: number
  price: number
  realPrice: number
  volume: number
}

type DescriptiveStats = {
  max: EdgeSample | undefined
  min: EdgeSample | undefined
  mean: number
  std: number
}

const LOG_INTERVAL = 1000

export default class Stats {
  private graph: Graph
  public opportunities: OpportunityMap

  constructor (graph: Graph, opportunities: OpportunityMap) {
    this.graph = graph
    this.opportunities = opportunities
  }

  public init (): void {
    setInterval(() => {
      const edgeStats = this.getEdgeStats()
      const opportunityStats = this.getOpportunityStats()
      this.logBeautified(edgeStats, opportunityStats)
    }, LOG_INTERVAL)
  }

  public logBeautified (edgeStats: any, opportunityStats: any): void {
    console.log(this.createBorder())
    console.log(this.createEdgeLogsString(edgeStats))
    console.log(this.createOpportunityLogsString(opportunityStats))
    console.log(this.createBorder())
  }

  private getEdgeStats (): any {
    const edgeSamples = this.getSamplesFromGraph()
    const settedEdgeSamples = this.getSettedEdgeSamples(edgeSamples)
    const lastUpdatedStats = this.getDescriptiveStatsBy(settedEdgeSamples, 'lastUpdated')
    const updatedOnLastInterval = this.filterUpdatedOnLastInterval(settedEdgeSamples)

    return {
      settedEdgesLength: settedEdgeSamples.length,
      updatedOnLastInterval: updatedOnLastInterval.length,
      lastUpdated: lastUpdatedStats
    }
  }

  private getOpportunityStats (): any {
    return {
      openOpportunitiesLen: Object.keys(this.opportunities).length
    }
  }

  public createOpportunityLogsString (opportunityStats: any): string {
    let str: string = ''

    str += `| Open opportunities: ${opportunityStats.openOpportunitiesLen} \n`

    return str
  }

  public createEdgeLogsString (stats: any): string {
    let str: string = ''

    str += `| All edges: ${this.graph.edges().length}. SettedEdges: ${stats.settedEdgesLength} \n`

    if (stats.lastUpdated.max === undefined) {
      return str
    }

    str += `| Edges updated on last interval: ${stats.updatedOnLastInterval} \n`
    str += `| lastUpdated mean: ${stats.lastUpdated.mean} ms, std: ${stats.lastUpdated.std} \n`
    str += `| lastUpdated min: ${stats.lastUpdated.min.lastUpdated} ms on ${stats.lastUpdated.min.source}->${stats.lastUpdated.min.target} with price: ${stats.lastUpdated.min.price}, realPrice: ${stats.lastUpdated.min.realPrice} and volume: ${stats.lastUpdated.min.volume} \n`
    str += `| lastUpdated max: ${stats.lastUpdated.max.lastUpdated} ms on ${stats.lastUpdated.max.source}->${stats.lastUpdated.max.target} with price: ${stats.lastUpdated.max.price}, realPrice: ${stats.lastUpdated.max.realPrice} and volume: ${stats.lastUpdated.max.volume} \n`

    return str
  }

  private getSamplesFromGraph (graph: Graph = this.graph): EdgeSample[] {
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

  private filterUpdatedOnLastInterval (stats: EdgeSample[]): EdgeSample[] {
    return stats.filter((stat) => {
      return stat.lastUpdated <= LOG_INTERVAL
    })
  }

  private getSettedEdgeSamples (samples: EdgeSample[]): EdgeSample[] {
    return samples.filter((s: any) => s.emptyValues === false)
  }

  private getDescriptiveStatsBy (samples: EdgeSample[], key: string): DescriptiveStats {
    return {
      max: _.maxBy(samples, key),
      min: _.minBy(samples, key),
      mean: _.meanBy(samples, key),
      std: this.stdBy(samples, key)
    }
  }

  private stdBy (dictArr: any, key: string): number {
    const array = dictArr.map((dict: any) => dict[key])
    const avg = _.sum(array) / array.length

    return Math.sqrt(_.sum(_.map(array, (i) => Math.pow((i - avg), 2))) / array.length)
  }

  private createBorder (): string {
    return `--------------------------------------------------------------------- \n`
  }
}
