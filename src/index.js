const faker = require('faker');

/**
 * Extends the Objection.js' model class, adding support to model factories.
 *
 * @param {class} modelClass
 * @param {object} config Configuration options
 * @return {class} Subclass supporting model factories
 */
module.exports = (modelClass, config = {}) => class extends modelClass {
  /**
   * Defines the schema of the model factory.
   *
   * @return {object} Factory schema
   */
  static get factorySchema() {
    return {};
  }

  /**
   * Returns an instance of the faker library.
   *
   * @return {object}
   */
  static get faker() {
    return config.faker || faker;
  }

  /**
   * Creates fake data in accordance with the factory schema.
   *
   * @param {object} attributes Attributes' values
   * @return {promise<object>} Fake data
   */
  static async create(attributes) {
    // Clone factory schema
    let record = { ...this.factorySchema };

    // Merge user's attributes
    record = Object.assign(record, attributes);

    for (const [key, value] of Object.entries(record)) {
      // Resolves a function if it is provided as the value
      if (typeof value === 'function') {
        record[key] = value();
      }
    }

    return record;
  }

  /**
   * Returns a collection of fake data in accordance with the factory schema.
   *
   * @param {number} len Length of the collection
   * @param {number} mapper A function that processes the collection
   * @return {promise<array>} Collection of fake data
   */
  static async count(len, transformer = null) {
    const collection = [];

    for (let i = 0; i < len; i += 1) {
      collection.push(await this.create());
    }

    return !transformer ? collection : collection.map(transformer);
  }

  /**
   * Destroys the current model instance.
   *
   * @return {boolean} Indicates if the model was destroyed.
   */
  destroy() {
    return false;
  }
};
