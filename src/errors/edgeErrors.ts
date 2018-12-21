import log from '../loggers/winston'
import { Edge, VirtualEdge } from '../models/edge'

abstract class EdgeError extends Error {
  public name: string = 'EDGE_ERROR'
  public edge: Edge
  public message: string
  private apiMessage: string

  constructor (name: string, edge: Edge, message: string, apiMessage: string = '') {
    super(message)
    Object.setPrototypeOf(this, EdgeError.prototype)

    this.name = name
    this.message = message
    this.edge = edge
    this.apiMessage = apiMessage
  }

  logError (): void {
    let edgeType = 'Edge'
    if (this.edge instanceof VirtualEdge) {
      edgeType = 'VirtualEdge' 
    }

    log.error(`[${this.name}]: ${edgeType}: ${this.edge}, Message: ${this.message}, ApiMesssage: ${this.apiMessage}`)
  }
}

export class OrderFillTimeoutError extends EdgeError {
  constructor (edge: Edge, message = '', apiMessage: string = '') {
    super('ORDER_FILL_TIMEOUT', edge, message, apiMessage)

    this.logError()
  }
}

export class TraversalAPIError extends EdgeError {
  constructor (edge: Edge, message = '', apiMessage: string = '') {
    super('EDGE_TRAVERSAL_API_ERROR', edge, message, apiMessage)

    this.logError()
  }
}
