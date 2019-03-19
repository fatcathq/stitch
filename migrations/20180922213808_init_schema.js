
exports.up = async function(knex) {
  await knex.schema.createTable('opportunities', (table) => {
    table.increments('id').primary()
    table.text('exchange').notNull()
    table.double('arbitrage').notNull()
    table.text('cycle').notNull()
    table.double('min_trade_volume')
    table.double('max_trade_volume')
    table.datetime('closed_at', 3)
    table.datetime('created_at', 3)
  })

  await knex.schema.createTable('edges', (table) => {
    table.integer('opportunity_id').unsigned().notNull()
    table.boolean('virtual').notNull()
    table.text('source', 8).notNull()
    table.integer('last_updated').notNull()
    table.text('target', 8).notNull()
    table.double('price').notNull()
    table.double('taker_fee').notNull()
    table.double('volume').nullable()

    table.foreign('opportunity_id').references('opportunities.id')
  })
};

exports.down = async function(knex) {
  await knex.schema.dropTable('edges')
  await knex.schema.dropTable('opportunities')
};
