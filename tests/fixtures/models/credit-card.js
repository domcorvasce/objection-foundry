const Factory = require('../../../src/index');
const { Model } = require('objection');

module.exports = class extends Factory(Model) {
  static get tableName() {
    return 'credit_cards';
  };

  static get factorySchema() {
    return {
      number: this.faker.finance.creditCardNumber,
      cvv: this.faker.finance.creditCardCVV,
      expiresOn: this.faker.date.future,
    };
  }

  // See https://vincit.github.io/objection.js/api/model/static-properties.html#static-relationmappings
  static get relationMappings() {
    const Person = require('./person');

    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'credit_cards.ownerId',
          to: 'people.id',
        },
      },
    };
  }
};
