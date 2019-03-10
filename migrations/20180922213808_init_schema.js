
exports.up = async function(knex) {
  await knex.schema.createTable('opportunities', (table) => {
    table.increments('id').primary()
    table.text('exchange').notNull()
    table.float('arbitrage').notNull()
    table.text('cycle').notNull()
    table.float('min_trade_volume')
    table.float('max_trade_volume')
    table.timestamp('closed_at').defaultTo(knex.fn.now())
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('edges', (table) => {
    table.integer('cycle_id').unsigned().notNull()
    table.boolean('virtual').notNull()
    table.text('source', 8).notNull()
    table.text('target', 8).notNull()
    table.float('price').notNull()
    table.float('taker_fee').notNull()
    table.float('volume').nullable()

    table.foreign('cycle_id').references('opportunities.id')
    table.index('cycle_id')
  })
};

exports.down = async function(knex) {
  await knex.schema.dropTable('edges')
  await knex.schema.dropTable('opportunities')
};
