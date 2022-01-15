const faker = require('@faker-js/faker');

/**
 * Extends the Objection.js' model class, adding support to model factories.
 *
 * @param {class} baseClass
 * @param {object} config Configuration options
 * @return {class} Subclass supporting model factories
 */
module.exports = (baseClass, config = {}) => class extends baseClass {
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
   * Destroys the current model instance.
   *
   * @return {boolean} Indicates if the model was destroyed.
   */
  async destroy() {
    const recordsRemoved = await this.$query().delete();
    return recordsRemoved === 1;
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
      // Apply transformation to the attributes
      if (transformer) {
        collection.push(await this.create(transformer(attributes, i)));
        continue;
      }

      collection.push(await this.create(attributes));
    }

    return collection;
  }

  /**
   * Creates fake data in accordance with the factory schema.
   *
   * @param {object} userAttributes
   * @return {promise<object>} Fake data
   */
  static async create(userAttributes) {
    const relations = [];
    const postponedResolutions = [];

    let record;
    const attributes = this._mergeDefaults(userAttributes);
    const keys = Object.keys(attributes);

    // Iterate over each attribute and resolve its value
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = attributes[key];

      if (key.startsWith('$for')) {
        const response = await this._resolveBelongsToRelation(key, value);
        const { localKey, localKeyVal, relationName } = response;

        // Replace the attribute key with the local key column name
        attributes[localKey] = localKeyVal;
        delete attributes[key];

        // Store the relation name for later use
        relations.push(relationName);
      } else if (key.startsWith('$has')) {
        // Postpone the resolution until we have the parent record from which we can fetch
        // the local key to satisfy the relation.
        postponedResolutions.push({ key, value });
        delete attributes[key];
      } else if (typeof value === 'function') {
        // If the value is a function, we call it to generate the literal value
        attributes[key] = value();
      }
    }

    // Write record to the database if a connection is available
    if (this.knex()) {
      record = await this.query().insert(attributes);

      // Resolves relations that were postponed
      for (let i = 0; i < postponedResolutions.length; i += 1) {
        const { key, value } = postponedResolutions[i];

        const result = await this._resolveHasManyRelation(record.$id(), key, value);
        const { localKey, localKeyVal, relationName } = result;

        record[localKey] = localKeyVal;
        relations.push(relationName);
      }

      record = await this.query()
        .where(this.idColumn, record.$id())
        .withGraphFetched(`[${relations.join(',')}]`)
        .first();
    }

    return record || attributes;
  }

  /**
   * Nerges user's attributes with the defaults provided by the factory schema.
   *
   * @param {object} attr Attributes passed by the user
   * @return {object} Processed attributes
   */
  static _mergeDefaults(attrs) {
    const defaults = { ...this.factorySchema };
    return Object.assign(defaults, attrs);
  }

  /**
   * Resolves a belongs-to relation
   *
   * @param {string} key Attribute key (e.g. $forUser)
   * @param {*} value Attribute value
   * @return {promise<object} The local key name and value, and the sanitized relation name
   */
  static async _resolveBelongsToRelation(key, value) {
    const relationName = this._getRelationNameFromAttrKey(key);
    const { localKey, foreignKey, modelClass } = this._fetchRelationData(relationName);

    let localKeyVal;

    // Bind database to the relation models
    if (this.knex()) {
      modelClass.knex(this.knex());
    }

    if (typeof value === 'number' || typeof value === 'string') {
      // If the user provided a literal value, we use that to resolve the relation
      localKeyVal = value;
    } else if (value instanceof modelClass) {
      // If the user provided an instance of the relation model
      // then we just need to fetch the value of the foreign key
      // and use that to resolve the relation
      localKeyVal = value[foreignKey];
    } else if (typeof value === 'object') {
      // Autoresolve the relation using the provided object
      const record = await modelClass.create(value);
      localKeyVal = record[foreignKey];
    } else if (value === true) {
      // Autoresolve the relation without any data
      const record = await modelClass.create();
      localKeyVal = record[foreignKey];
    }

    // If we were not able to satisfy the relation
    if (!localKeyVal) {
      throw new Error(this._getRelationResolutionError(relationName));
    }

    return { localKey, localKeyVal, relationName };
  }

  /**
   * Resolves a model relation.
   *
   * @param {number|string} id Record ID
   * @param {string} key Special attribute key (e.g. $hasPets, $forUser)
   * @param {number|string|object} value Attribute value (literals or instance of models)
   * @return {object} The name of local key and its value
   */
  static async _resolveHasManyRelation(id, key, value) {
    const relationName = this._getRelationNameFromAttrKey(key);
    const { foreignKey, modelClass } = this._fetchRelationData(relationName);

    let localKeyVal;

    // Bind database to the relation models
    if (this.knex()) {
      modelClass.knex(this.knex());
    }

    // Creates multiple records that satisfy the relation
    if (typeof value === 'number') {
      localKeyVal = [];

      for (let i = 0; i < value; i += 1) {
        localKeyVal.push(await modelClass.create({ [foreignKey]: id }));
      }
    }

    // If we were not able to satisfy the relation
    if (!localKeyVal) {
      throw new Error(this._getRelationResolutionError(relationName));
    }

    return { localKey: relationName, localKeyVal, relationName };
  }

  /**
   * Returns the error message for a failed relation resolution.
   *
   * @return {string}
   */
  static _getRelationResolutionError(relationName) {
    return `Unable to resolve the "${relationName}" relation`;
  }

  /**
   * Given an attribute key (e.g. $forUser, or $has_team_members),
   * this function returns the name of the relation to be used (e.g. user, team_members).
   *
   * @param {string} key Attribute key
   * @return {string} Relation name
   */
  static _getRelationNameFromAttrKey(key) {
    // The library supports both camelCase ($hasFooBar) and snake_case ($has_foo_bar)
    const relationName = key.replace(/\$(has|for)(_|)/, '');
    return relationName.charAt(0).toLowerCase() + relationName.slice(1);
  }

  /**
   * Returns information about a model relation.
   *
   * @param {string} relationName Relation name
   * @returns {object} Relation data
   */
  static _fetchRelationData(relationName) {
    const relation = this.relationMappings[relationName];

    if (!relation) {
      throw new Error(`The relation "${relationName}" is not defined`);
    }

    // Fetches the names of the local and foreign keys
    const { join, modelClass } = relation;
    const localKey = join.from.split('.')[1];
    const foreignKey = join.to.split('.')[1];

    return { localKey, foreignKey, modelClass };
  }
};
