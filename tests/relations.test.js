const CreditCard = require('./fixtures/models/credit-card');
const Person = require('./fixtures/models/person');
const createDb = require('./fixtures/create-db');

describe('Factory#create', () => {
  let db;

  beforeAll(async () => {
    db = await createDb();
  });

  afterAll(() => {
    db.destroy();
  });

  it('throws an error if the relation has not been defined', async () => {
    try {
      await CreditCard.create({
        // The relation "form" does not exist
        $forFooBar: true,
      });
    } catch (err) {
      expect(err.message).toEqual(`The relation "fooBar" is not defined`);
    }

    try {
      await CreditCard.create({
        // The relation "form" does not exist
        $for_foo_bar: true,
      });
    } catch (err) {
      expect(err.message).toEqual(`The relation "foo_bar" is not defined`);
      return;
    }

    throw new Error('Expected an error. None thrown');
  });

  it('resolves relation using a literal value', async () => {
    const creditCards = await CreditCard.count(3, {
      $forOwner: 2,
    });

    creditCards.forEach((creditCard) => {
      expect(creditCard.ownerId).toEqual(2);
    });
  });

  it('resolves relation using an instance of the model', async () => {
    Person.knex(db);
    CreditCard.knex(db);

    const person = await Person.create();
    const creditCard = await CreditCard.create({ $forOwner: person });

    expect(creditCard.ownerId).toEqual(person.id);
    await person.destroy();
  });

  it('autoresolves one-to-many relation', async () => {
    const person = await Person.create({
      $hasCreditCards: 3,
    });

    expect(person.creditCards.length).toEqual(3);

    person.creditCards.forEach(async (creditCard) => {
      expect(creditCard.id).not.toEqual(undefined);
      expect(creditCard.ownerId).toEqual(person.id);

      await creditCard.destroy();
    });

    await person.destroy();
  });

  it('autoresolves belongs-to relation', async () => {
    const creditCard = await CreditCard.create({
      $forOwner: true
    });

    expect(creditCard.ownerId).not.toEqual(undefined);
  });

  it('autoresolves belongs-to relation using user data', async () => {
    const creditCard = await CreditCard.create({
      $forOwner: { firstName: 'Ivy' },
    });

    expect(creditCard.owner.firstName).toEqual('Ivy');
  });

  it('resolves nested relations', async () => {
    const creditCard = await CreditCard.create({
      $forOwner: {
        $hasCreditCards: 2,
        firstName: 'Nested',
      },
    });

    expect(creditCard.owner.firstName).toEqual('Nested');
  });
});
