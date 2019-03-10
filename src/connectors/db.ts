import knex from 'knex'
import config from '../utils/config'

const client = knex({
  client: 'mysql2',
  connection: config.log.db
})

export default client
