import Graph from './graph'
import * as _ from 'lodash'

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

  constructor (graph: Graph) {
    this.graph = graph
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

  private logStats (): any {
    const edgeSamples = this.getSamplesFromGraph()
    const settedEdgeSamples = this.getSettedEdgeSamples(edgeSamples)
    const lastUpdatedStats = this.getDescriptiveStatsBy(settedEdgeSamples, 'lastUpdated')

    return {
      settedEdgesLength: settedEdgeSamples.length,
      lastUpdatedStats: lastUpdatedStats
    }
  }

  public init (): void {
    setInterval(() => {
      const stats = this.logStats()
      this.logBeautified(stats)
    }, LOG_INTERVAL)
  }

  public logBeautified (stats: any): void {
    console.log(`---------------------------------------------------------`)
    console.log(`| All edges: ${this.graph.edges().length}. SettedEdges: ${stats.settedEdgesLength}`)
    console.log(`| All edges: ${this.graph.edges().length}. SettedEdges: ${stats.settedEdgesLength}`)
    console.log(`| Mean lastUpdated: ${stats.lastUpdated.mean}`)
    console.log(` Standard deviation lastUpdated: ${stats.lastUpdated.std}`)
    console.log(`---------------------------------------------------------`)

    /*
      console.log(`Max lastUpdated of set edges: ${maxLastUpdated.lastUpdated} on ${maxLastUpdated.source}->${maxLastUpdated.target} with price: ${maxLastUpdated.price}, realPirce: ${maxLastUpdated.realPrice} and volume: ${maxLastUpdated.volume}`)
      console.log(`| Min lastUpdated of set edges: ${minLastUpdated.lastUpdated} on ${minLastUpdated.source}->${minLastUpdated.target} with price: ${minLastUpdated.price}, realPirce: ${minLastUpdated.realPrice} and volume: ${minLastUpdated.volume}`)
    */
  }
}
