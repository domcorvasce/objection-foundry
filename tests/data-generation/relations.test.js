const CreditCard = require('../fixtures/models/credit-card');
const Person = require('../fixtures/models/person');

describe('Factory#create', () => {
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
    const person = new Person();
    person.id = 3;

    const creditCard = await CreditCard.create({
      $forOwner: person,
    });

    expect(creditCard.ownerId).toEqual(3);
  });

  it('resolves one-to-many relation', async () => {
    const person = await Person.create({
      id: 2,
      $hasCreditCards: 3,
    });

    expect(person.creditCards.length).toEqual(3);

    person.creditCards.forEach((creditCard) => {
      expect(creditCard.ownerId).toEqual(person.id);
    });
  });
});
