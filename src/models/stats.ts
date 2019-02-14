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

  public init (): void {
    setInterval(() => {
      const stats = this.logStats()
      this.logBeautified(stats)
    }, LOG_INTERVAL)
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

  private logStats (): any {
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

  public logBeautified (stats: any): void {
    console.log(this.createBeautifiedLogsString(stats))
  }

  public createBeautifiedLogsString (stats: any): string {
    let str: string = this.createBorder()

    str += `| All edges: ${this.graph.edges().length}. SettedEdges: ${stats.settedEdgesLength} \n`

    if (stats.lastUpdated.max === undefined) {
      str += this.createBorder()
      return str
    }

    str += `| Edges updated on last interval: ${stats.updatedOnLastInterval} \n`
    str += `| lastUpdated mean: ${stats.lastUpdated.mean} ms, std: ${stats.lastUpdated.std} \n`
    str += `| lastUpdated min: ${stats.lastUpdated.min.lastUpdated} ms on ${stats.lastUpdated.min.source}->${stats.lastUpdated.min.target} with price: ${stats.lastUpdated.min.price}, realPirce: ${stats.lastUpdated.min.realPrice} and volume: ${stats.lastUpdated.min.volume} \n`
    str += `| lastUpdated max ${stats.lastUpdated.max.lastUpdated} ms on ${stats.lastUpdated.max.source}->${stats.lastUpdated.max.target} with price: ${stats.lastUpdated.max.price}, realPirce: ${stats.lastUpdated.max.realPrice} and volume: ${stats.lastUpdated.max.volume} \n`
    str += this.createBorder()

    return str
  }

  private createBorder (): string {
    return `--------------------------------------------------------------------- \n`
  }
}
