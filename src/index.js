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
    // Clone factory schema and merge user's attributes
    let record = { ...this.factorySchema };
    record = Object.assign(record, attributes);

    // Iterate over each attribute and resolve its value
    const keys = Object.keys(record);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = record[key];

      // Resolves model relations
      if (key.startsWith('$has') || key.startsWith('$for')) {
        const { localKey, localKeyVal } = await this._resolveRelation(key, value);
        record[localKey] = localKeyVal;
        delete record[key];
      }

      // Resolves a function
      if (typeof value === 'function') {
        record[key] = value();
      }
    }

    return record;
  }

  /**
   * Resolves a model relation.
   *
   * @param {string} key
   * @param {*} value
   * @return {object} The name of local key and its value
   */
  static async _resolveRelation(key, value) {
    // Get the relation name from the key name
    // The library supports both camelCase ($hasFooBar) and snake_case ($has_foo_bar)
    let relationName = key.replace(/\$(has|for)(_|)/, '');
    relationName = relationName.charAt(0).toLowerCase() + relationName.slice(1);

    const relation = this.relationMappings[relationName];

    // Throws an error if the relation is not defined
    // We already assume that the user has defined the `relationMappings` attribute
    if (!relation) {
      throw new Error(`The relation "${relationName}" is not defined`);
    }

    // Fetches the names of the local and foreign keys
    const { join } = relation;
    const localKey = join.from.split('.')[1];
    const foreignKey = join.to.split('.')[1];

    let localKeyVal;

    // If the user provided a literal value, we use that to resolve the relation
    if (typeof value === 'number' || typeof value === 'string') {
      localKeyVal = value;
    }

    // If the user provided an instance of the relation model
    // then we just need to fetch the value of the foreign key and use that to resolve the relation
    if (value instanceof relation.modelClass) {
      localKeyVal = value[foreignKey];
    }

    if (!localKeyVal) {
      throw new Error(`Unable to resolve the "${relationName}" relation`);
    }

    return { localKey, localKeyVal };
  }

  /**
   * Returns a collection of fake data in accordance with the factory schema.
   *
   * @param {number} len Length of the collection
   * @param {object} attributes
   * @return {promise<array>} Collection of fake data
   */
  static async count(len, attributes = {}) {
    const collection = [];
    const transformer = attributes.$transform;

    // Get rid of unnecessary special attributes
    delete attributes.$transform;

    for (let i = 0; i < len; i += 1) {
      collection.push(await this.create(attributes));
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
