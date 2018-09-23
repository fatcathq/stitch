import {Edge as EdgeDriver} from './edge'
import db from '../connectors/db'

export default class Opportunity {
  public exchange: string
  public arbitrage: number
  public triangle: EdgeDriver[]
  public minVolume?: number
  public maxVolume?: number

  constructor(exchange: string, triangle: EdgeDriver[], arbitrage: number) {
    this.exchange = exchange  
    this.triangle = triangle
    this.arbitrage = arbitrage
  }

  public async save() {
    const id = await db('opportunities').insert({
      exchange: this.exchange,
      cycle: this.triangle.map((edge: EdgeDriver) => edge.source),
      arbitrage: this.arbitrage
    }).returning('id')

    return Promise.all(this.triangle.map((edge: EdgeDriver) => edge.save(id)))
  }
}
