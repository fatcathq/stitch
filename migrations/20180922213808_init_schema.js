
exports.up = async function(knex) {
  await knex.schema.createTable('opportunities', (table) => {
    table.increments('id').primary()
    table.text('exchange').notNull()
    table.double('arbitrage').notNull()
    table.text('cycle').notNull()
    table.double('min_trade_volume')
    table.double('max_trade_volume')
    table.timestamp('closed_at').defaultTo(knex.fn.now())
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('edges', (table) => {
    table.integer('opportunity_id').unsigned().notNull()
    table.boolean('virtual').notNull()
    table.text('source', 8).notNull()
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
