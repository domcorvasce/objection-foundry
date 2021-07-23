const Factory = require('../../../src/index');
const { Model } = require('objection');

module.exports = class extends Factory(Model) {
  static get tableName() {
    return 'people';
  }

  static get factorySchema() {
    return {
      firstName: this.faker.name.firstName,
      lastName: this.faker.name.lastName,
      email: this.faker.internet.email,
    };
  }

  // See https://vincit.github.io/objection.js/api/model/static-properties.html#static-relationmappings
  static get relationMappings() {
    const CreditCard = require('./credit-card');

    return {
      creditCards: {
        relation: Model.HasManyRelation,
        modelClass: CreditCard,
        join: {
          from: 'people.id',
          to: 'credit_cards.ownerId'
        }
      },
    };
  }
};