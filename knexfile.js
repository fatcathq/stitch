const config = require('./config/config.json')
const db = config.log.db

module.exports = {
  client: 'mysql2',
  connection: {
    database: db.database,
    user:     db.user,
    password: db.password
  }
}
