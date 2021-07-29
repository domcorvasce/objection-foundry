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

## Relations

This library only supports **belongs to** and **has many** relations. Suppose you have two models: `User` and `Post`, which you linked together through the following [relation mappings](https://vincit.github.io/objection.js/guide/relations.html):

| Model  | Relation name | From            | To              | Type       |
| ------ | ------------- | --------------- | --------------- | ---------- |
| `Post` | `user`        | `posts.user_id` | `users.id`      | Belongs to |
| `User` | `posts`       | `users.id`      | `posts.user_id` | Has many   |

Then you can build a relation by passing a special attribute&mdash;which starts with either `$has` or `$for`&mdash;to the `create` and `count` methods. These special attributes build **has many** and **belongs to** relations, respectively.

Attributes starting with `$has` accept an integer which represents the amount of records to create. Attributes starting with `$for` accept literal values (e.g. `2`) or model instances.

```js
const user = await User.create({
    $hasPosts: 3,
});

const post = await Post.create({ $forUser: 3 }); // Post { userId: 3, ... }
const posts = await Post.count(3, { $forUser: user });
```

## License

objection-foundry is released under the [MIT License](./LICENSE).
