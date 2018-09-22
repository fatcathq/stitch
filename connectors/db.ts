import knex from 'knex'
import config from '../config'

const client = knex({
  client: 'pg',
  connection: config.log.db,
})

export default client
