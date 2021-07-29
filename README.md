# objection-foundry

[![npm version](https://badge.fury.io/js/objection-foundry.svg)](https://badge.fury.io/js/objection-foundry)

A model factory library for [Objection.js](https://github.com/Vincit/objection.js).

## Installation

Install the npm package:

```shell
npm i objection-foundry
```

## Quick Start

This library provides a `Factory` [class mixin](https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/) which you must use to extend Objection.js' [Model](https://vincit.github.io/objection.js/api/model/) class, adding support to model factories.

```js
const { Model } = require('objection');
const Factory = require('objection-foundry');

class User extends Factory(Model) {
    // ...
```

You must also define the **factory schema** which is used as blueprint when generating fake data. The factory schema is stored in the `factorySchema` static attribute.

The attribute is a plain old JavaScript object. Each key represents a column, and each value is either a [Faker.js](https://github.com/marak/Faker.js/#api-methods) method or a literal value (e.g. `2` or `"john.doe@example.com"`).

```js
class User extends Factory(Model) {
    static get factorySchema() {
        return {
            first_name: this.faker.name.firstName,
            last_name: this.faker.name.lastName,
            email: this.faker.internet.email,
            created_at: this.faker.datatype.datetime,
            updated_at: this.faker.datatype.datetime,
        };
    }

    // ...
```

You can now start generating fake data.

```js
const user = await User.create();
const users = await User.count(5);
```

The `create` method returns a plain old JavaScript object, while the `count` method returns a collection of objects. Both methods allow you to override attributes.

```js
const user = await User.create({ firstName: 'John' });
const users = await User.count(5, {
    $transform: (record, idx) => {
        record.firstName = idx % 2 ? 'John' : 'Ivy';
        return record;
    },
});
```

You can also write data to the database by binding a [Knex](https://knexjs.org/) client to the model. If you write to the database, the `create` and `count` methods will return instances of the model (e.g. `User`) instead of plain old JavaScript objects.

```js
User.knex(db);
const user = await User.create(); // User { id: 1, ... }
```

You can use the `destroy` instance method to remove a record.

```js
const user = await User.create();
await user.destroy(); //=> true
```

## License

objection-foundry is released under the [MIT License](./LICENSE).
