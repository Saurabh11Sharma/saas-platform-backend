import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailAddress, InvalidEmailAddressError } from './email-address';

describe('EmailAddress', () => {
  it('trims whitespace and normalizes the address to lowercase', () => {
    const email = EmailAddress.create('  Ada.Lovelace+tag@Example.COM  ');

    assert.equal(email.value, 'ada.lovelace+tag@example.com');
    assert.equal(email.toString(), 'ada.lovelace+tag@example.com');
  });

  it('compares addresses using their normalized value', () => {
    const first = EmailAddress.create('User@example.com');
    const second = EmailAddress.create(' user@EXAMPLE.com ');

    assert.equal(first.equals(second), true);
  });

  it('rejects malformed addresses without exposing the supplied value', () => {
    const invalidAddresses = [
      '',
      '   ',
      'missing-at.example.com',
      'user@@example.com',
      '@example.com',
      'user@localhost',
      'user name@example.com',
      '.user@example.com',
      'user..name@example.com',
      'user@example..com',
      'user@-example.com',
      'user@example.c',
    ];

    for (const address of invalidAddresses) {
      assert.throws(() => EmailAddress.create(address), InvalidEmailAddressError);
    }
  });

  it('rejects local parts longer than 64 characters', () => {
    const address = `${'a'.repeat(65)}@example.com`;

    assert.throws(() => EmailAddress.create(address), InvalidEmailAddressError);
  });

  it('rejects addresses longer than 254 characters', () => {
    const localPart = 'a'.repeat(64);
    const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(2)}`;
    const address = `${localPart}@${domain}`;

    assert.ok(address.length > 254);
    assert.throws(() => EmailAddress.create(address), InvalidEmailAddressError);
  });
});