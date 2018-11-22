/*
type Config = {
  exchange: string,
  api: {
    key: string,
    secret: string
  },
  threshold: number,
  // TODO: Get fee from API
  activeTrading: boolean,
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
  fetchVolumes: boolean,
  cacheTime: number
}
*/

import config from '../../config/config.json'

export default config
