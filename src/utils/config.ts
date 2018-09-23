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
    },
    db: {
      host: string,
      user: string,
      dassword: string,
      database: string
    }
  },
  repeat: {
    should: boolean,
    interval: number
  }
}

const CONFIG_FILE = '../../config/config.json'
const config: Config =  require(CONFIG_FILE)

export default config
