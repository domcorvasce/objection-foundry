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
    const eagers = [];
    const oneToManyRelations = [];

    // Clone factory schema and merge user's attributes
    let record = { ...this.factorySchema };
    record = Object.assign(record, attributes);

    // Iterate over each attribute and resolve its value
    const keys = Object.keys(record);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = record[key];

      // Resolves belongs-to relations
      if (key.startsWith('$for')) {
        const result = await this._resolveRelation(null, key, value);
        const { localKey, localKeyVal, relationName } = result;

        record[localKey] = localKeyVal;
        eagers.push(relationName);

        delete record[key];
        continue;
      }

      // Postpones resolving one-to-many relations after the parent record has been created
      if (key.startsWith('$has')) {
        oneToManyRelations.push({ key, value });
        continue;
      }

      // Resolves a function
      if (typeof value === 'function') {
        record[key] = value();
      }
    }

    // Write record to the database if a connection is available
    if (this.knex()) {
      record = await this.query().insert(record);
    }

    // Resolves has-many relations
    for (let i = 0; i < oneToManyRelations.length; i += 1) {
      const { key, value } = oneToManyRelations[i];

      const result = await this._resolveRelation(record[this.idColumn], key, value);
      const { localKey, localKeyVal, relationName } = result;

      record[localKey] = localKeyVal;
      eagers.push(relationName);
    }

    // Fetches related records when dealing with records written to the database
    if (this.knex()) {
      record = await this.query()
        .where('id', record[this.idColumn])
        .withGraphFetched(`[${eagers.join(',')}]`)
        .first();
    }

    return record;
  }

  /**
   * Resolves a model relation.
   *
   * @param {number|string} id Record ID
   * @param {string} key Special attribute key (e.g. $hasPets, $forUser)
   * @param {number|string|object} value Attribute value (literals or instance of models)
   * @return {object} The name of local key and its value
   */
  static async _resolveRelation(id, key, value) {
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

    // Bind database to the relation models
    if (this.knex()) {
      relation.modelClass.knex(this.knex());
    }

    // Belongs to relations
    if (key.startsWith('$for')) {
      if (typeof value === 'number' || typeof value === 'string') {
        // If the user provided a literal value, we use that to resolve the relation
        localKeyVal = value;
      } else if (value instanceof relation.modelClass) {
        // If the user provided an instance of the relation model
        // then we just need to fetch the value of the foreign key
        // and use that to resolve the relation
        localKeyVal = value[foreignKey];
      } else if (typeof value === 'object') {
        // Autoresolve the relation using the provided object
        const record = await relation.modelClass.create(value);
        localKeyVal = record[foreignKey];
      } else if (value === true) {
        // Autoresolve the relation without any data
        const record = await relation.modelClass.create();
        localKeyVal = record[foreignKey];
      }
    }

    // If the user wants to initialize multiple relations
    // This is only allowed for one-to-many relations using `$has*` attributes
    if (key.startsWith('$has') && typeof value === 'number') {
      localKeyVal = [];

      for (let i = 0; i < value; i += 1) {
        localKeyVal.push(await relation.modelClass.create({ [foreignKey]: id }));
      }

      // Returns a collection of relation instances instead of the local key
      return { localKey: relationName, localKeyVal, relationName };
    }

    if (!localKeyVal) {
      throw new Error(`Unable to resolve the "${relationName}" relation`);
    }

    return { localKey, localKeyVal, relationName };
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
