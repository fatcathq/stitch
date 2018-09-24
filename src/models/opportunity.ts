import {Edge as EdgeDriver} from './edge'
import db from '../connectors/db'

export default class Opportunity {
  public id: string
  public exchange: string
  public arbitrage: number
  public triangle: EdgeDriver[]
  public minVolume?: number
  public maxVolume?: number

  constructor(exchange: string, triangle: EdgeDriver[], arbitrage: number) {
    this.exchange = exchange  
    this.triangle = triangle
    this.arbitrage = arbitrage

    this.id = this.generateIndex()
  }

  public async save() {
    const res = await db('opportunities').insert({
      exchange: this.exchange,
      cycle: this.triangle.map((edge: EdgeDriver) => edge.source),
      arbitrage: this.arbitrage
    }).returning('id')

    return this.triangle.map((edge: EdgeDriver) => edge.save(res[0]))
  }

  private generateIndex() {
    const nodes = this.triangle.map(a => a.source)

    return nodes.sort().join('')
  }
}
