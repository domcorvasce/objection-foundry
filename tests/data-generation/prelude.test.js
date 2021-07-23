const Factory = require('../../src/index');
const { Model } = require('objection');

const ModelFactory = class extends Factory(Model) {
  static get factorySchema() {
    return {
      firstName: () => 'John',
      lastName: () => 'Doe',
      nationality: 'Italy',
      email: this.faker.internet.email,
    };
  }
};

describe('Factory#create', () => {
  it('returns an empty object if the factory schema is empty', async () => {
    const EmptyModelFactory = Factory(Model);
    const record = await EmptyModelFactory.create();
    expect(record).toEqual({});
  });

  it('returns a single object of fake data', async () => {
    const record = await ModelFactory.create();
    expect(record.email).toContain('@');
    expect(record).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      nationality: 'Italy',
    });
  });

  it('permits overriding attributes for a single record', async () => {
    const record = await ModelFactory.create({ firstName: 'Ivy' });
    expect(record.firstName).toEqual('Ivy');
  });
});

describe('Factory#count', () => {
  it('returns a collection of fake data', async () => {
    const records = await ModelFactory.count(3);

    expect(records.length).toEqual(3);

    records.forEach((record, index) => {
      expect(record).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        nationality: 'Italy',
      });

      if (index > 0) {
        expect(records[index - 1].email).not.toEqual(records[index].email);
      }
    });
  });

  it('permits overriding attributes for a collection of records', async () => {
    const records = await ModelFactory.count(3, {
      $transform: (record, _) => {
        record.firstName = 'Ivy';
        return record;
      },
    });

    for (const record of records) {
      expect(record.firstName).toEqual('Ivy');
    }
  });
});
