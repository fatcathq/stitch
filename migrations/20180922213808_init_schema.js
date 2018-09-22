
exports.up = async function(knex) {
  await knex.schema.createTable('opportunities', function (table) {
    table.increments('id').primary();
    table.float('arbitrage').notNull();
    table.specificType('cycle', 'text[]').notNull();
    table.float('min_trade_volume').nullable();
    table.float('max_trade_volume').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
  })

  await knex.schema.createTable('edges', function (table) {
    table.increments();
    table.integer('cycle_id').unsigned().notNull()
    table.text('source', 8).notNull()
    table.text('target', 8).notNull()
    table.float('price').notNull()
    table.float('volume').nullable()
    table.float('taker_fee').nullable()

    table.foreign('cycle_id').references('opportunities.id')
    table.index('cycle_id')
  })
};

exports.down = function(knex, Promise) {
  knex.schema.dropTable('opportunities')
  knex.schema.dropTable('edges')
};
