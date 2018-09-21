import { Triangle, Market, Opportunity } from './types'
import * as _ from 'lodash'
import EdgeDriver from './edge'

function triangleEquals (triangleA: Triangle, triangleB: Triangle): boolean {
  const nodesA = triangleA.map(a => a.source)
  const nodesB = triangleB.map(a => a.source)

  return _.isEmpty(_.difference(nodesA, nodesB))
}

export function triangleExists (candidate: Triangle, triangles: Triangle[]): boolean {
  for (let triangle of triangles) {
    if (triangleEquals(candidate, triangle)) {
      return true
    }
  }
  return false
}

export function marketIsValid (market: Market): boolean {
  // Filter for inconsistent results. Happens mainly in binance
  return !/e/.test(String(market.bid))
    && !/e/.test(String(market.ask))
    && /([A-Z]{2,5}\/[A-Z]{2,5})/.test(market.symbol)
    && market.bid !== 0
    && market.ask !== 0
}

//Calculate arbitrage by getting the product of the (after fee) edge weights  
export function calculateArbitrage (triangle: Triangle, fee: number): number {
  return triangle.map((e: EdgeDriver) => e.getWeight()).reduce((acc, v) => acc * (1 - fee) * v, 1)
}

// TODO: Change that to Bellman Ford (?)
export function getMinVolume (triangle: Triangle): number {
  let volumes: number[] = []
  const [startEdge, intermediateEdge, endingEdge] = triangle
  const c = triangle[0].source
  console.log(`For startEdge ${startEdge.source} -> ${startEdge.target} volume: ${startEdge.volume} ${startEdge.getVolumeCurrency()}`)
  console.log(`For intermediateEdge ${intermediateEdge.source} -> ${intermediateEdge.target} volume: ${intermediateEdge.volume} ${intermediateEdge.getVolumeCurrency()}`)
  console.log(`For endingEdge ${endingEdge.source} -> ${endingEdge.target} volume: ${endingEdge.volume} ${endingEdge.getVolumeCurrency()}`)
  console.log(`Basic volume unit wll be`, c)

  if (startEdge.getVolumeCurrency() === c) {
    console.log(`startEdge volume unit is the same as c. Adding to volumes`)

    volumes.push(triangle[0].volume)
  }
  else {
    console.log(`startEdge volume unit is not in ${c}`)
    console.log(`Changing volume to unit ${c}: startEdge volume will be ${startEdge.volume / startEdge.getWeight()}`)

    volumes.push(startEdge.volume / startEdge.getWeight())
  }

  console.log(`endingEdge ${endingEdge.source} -> ${endingEdge.target} volume ${endingEdge.volume} ${endingEdge.getVolumeCurrency()}`)

  if (endingEdge.getVolumeCurrency() === c) {
    console.log(`endingEdge volume unit is the same as c. Adding to volumes`)

    volumes.push(triangle[0].volume)
  }
  else {
    console.log(`endingEdge volume unit is not in ${c}`)
    console.log(`Changing volume to unit ${c}: endingEdge volume will be ${endingEdge.volume * endingEdge.getWeight()}`)

    volumes.push(endingEdge.volume * endingEdge.getWeight())
  }

  console.log(`intermediateEdge ${intermediateEdge.source} -> ${intermediateEdge.target} volume:  ${intermediateEdge.volume} ${intermediateEdge.getVolumeCurrency()}`)
  if (intermediateEdge.getVolumeCurrency() === startEdge.target) {
    console.log(`volume should change using startingEdge`)
    console.log(`Changing volume to unit ${c}: intermediateEdge volume will be ${intermediateEdge.volume / startEdge.getWeight()}`)

    volumes.push(intermediateEdge.volume / startEdge.getWeight())
  }
  else {
    console.log(`volume should change using endingEdge`)
    console.log(`Changing volume to unit ${c}: intermediateEdge volume will be ${intermediateEdge.volume * endingEdge.getWeight()}`)

    volumes.push(intermediateEdge.volume * endingEdge.getWeight())
  }

  console.log(`Volumes in unit ${c} are: ${volumes}`)
  return Math.min(...volumes)
}
