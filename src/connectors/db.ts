import knex from 'knex'
import config from '../utils/config'

const client = knex({
  client: 'pg',
  connection: config.log.db,
})

export default client
