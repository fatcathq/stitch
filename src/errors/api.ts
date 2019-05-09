import log from '../loggers/winston'

export class APIError extends Error {
  public name: string = 'EDGE_ERROR'

  constructor (public method: string, public message: string = '', public args: any[]) {
    super(message)
    this.name = 'API_ERROR'
    this.args = args

    this.logError()
  }

  logError (): void {
    log.error(`[${this.name}]: Method: ${this.method}, Message: ${this.message}`)
    console.log('Args', this.args)
  }
}
