const Factory = require('../src/index');
const { Model } = require('objection');

const ModelFactory = Factory(Model);

describe('Factory mixin', () => {
  it('defines a `factorySchema` static attribute', () => {
    expect(ModelFactory.factorySchema).toBeDefined();
  });

  it('defines a `faker` static attribute', () => {
    expect(ModelFactory.faker).toBeDefined();
  });

  it('defines a `create` static method', () => {
    expect(ModelFactory.create).toBeDefined();
  });

  it('defines a `destroy` instance method', () => {
    expect(ModelFactory.prototype.destroy).toBeDefined();
  });

  it('allows specifying a custom faker', () => {
    const faker = () => 1337;
    const ModelFactory = Factory(Model, { faker });

    expect(ModelFactory.faker()).toEqual(faker());
  });
});
