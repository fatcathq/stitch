import {Edge as EdgeDriver} from './edge'
import db from '../connectors/db'
import log from '../loggers/winston'

export default class Opportunity {
  public id: string
  public arbitrage: number
  public exchange: string
  public minVolume: number = 0
  public maxVolume?: number = Infinity
  public triangle: EdgeDriver[]
  private created: Date = new Date()

  constructor(exchange: string, triangle: EdgeDriver[], arbitrage: number) {
    this.exchange = exchange  
    this.triangle = triangle
    this.arbitrage = arbitrage

    this.id = this.generateIndex()
    this.minVolume = this.getMinVolume()
  }

  public async save() {
    const res = await db('opportunities').insert({
      created_at: this.created,
      closed_at: new Date(),
      min_trade_volume: this.minVolume,
      max_trade_volume: this.maxVolume === Infinity ? null : this.maxVolume,
      exchange: this.exchange,
      cycle: this.triangle.map((edge: EdgeDriver) => edge.source),
      arbitrage: this.arbitrage,
    }).returning('id')

    return this.triangle.map((edge: EdgeDriver) => edge.save(res[0]))
  }

  async updateFromAPI(api: any) {
    try {
      await Promise.all(this.triangle.map((edge: EdgeDriver) => edge.updateFromAPI(api)))
    } catch (e) {
      log.warn(`Could not update volumes. ${e.message}`)
    }

    this.maxVolume = this.getMaxVolume()
  }

  public getDuration() {
    return (new Date()).getTime() - this.created.getTime()
  }

  public getMaxVolume (): number {
    let volumeIt = this.triangle[0].volume

    for (const edge of this.triangle) {
      if (volumeIt > edge.volume) {
        volumeIt = edge.volume
      }

      volumeIt *= edge.getPrice()
    }

    return volumeIt
  }

  private getMinVolume(): number {
    let volumeIt = this.triangle[0].minVolume

    for (const edge of this.triangle) {
      if (volumeIt < edge.minVolume) {
        volumeIt = edge.minVolume
      }

      volumeIt *= edge.getPrice()
    }

    return volumeIt
  }

  private generateIndex() {
    const nodes = this.triangle.map(a => a.source)

    return nodes.sort().join('')
  }
}
