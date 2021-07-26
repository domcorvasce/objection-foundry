/* eslint-disable import/no-extraneous-dependencies */
const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: ':memory:',
  useNullAsDefault: true,
});

module.exports = async () => {
  if (!await db.schema.hasTable('people')) {
    await db.schema
      .createTable('people', (table) => {
        table.increments();
        table.string('firstName');
        table.string('lastName');
        table.string('email');
        table.unique('email');
      });
  }

  if (!await db.schema.hasTable('credit_cards')) {
    await db.schema
      .createTable('credit_cards', (table) => {
        table.increments();
        table.string('number');
        table.string('cvv');
        table.datetime('expiresOn');
        table.integer('ownerId');

        table.foreign('ownerId').references('id').inTable('people');
      });
  }

  return db;
};
