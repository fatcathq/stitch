type Config = {
  exchange: string,
  api: {
    key: string,
    secret: string
  },
  threshold: number,
  // TODO: Get fee from API
  fee: number,
  log: {
    slack: {
      webhook: string,
      should: true,
      extended: true
    }
  },
  repeat: {
    should: boolean,
    interval: number
  }
}

const CONFIG_FILE = './config.json'
const config: Config =  require(CONFIG_FILE)

export default config
