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
   * @return {object|array<object>} Fake data
   */
  static create() {
    return {};
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
