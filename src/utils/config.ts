type Config = {
  exchange: string,
  api: {
    key: string,
    secret: string
  },
  threshold: number,
  // TODO: Get fee from API
  log: {
    slack: {
      webhook: string,
      extended: boolean,
      enabled: boolean
    },
    db: {
      host: string,
      user: string,
      dassword: string,
      database: string,
      enabled: boolean
    }
  },
  fetchVolumes: boolean
}

const CONFIG_FILE = '../../config/config.json'
const config: Config = require(CONFIG_FILE)

export default config
