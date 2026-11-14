import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailAddress, InvalidEmailAddressError } from './email-address';
import {
  Identity,
  InvalidIdentityCreatedAtError,
  InvalidIdentityIdError,
} from './identity';
import { InvalidPasswordHashError, PasswordHash } from './password-hash';

describe('Identity', () => {
  it('reconstitutes a valid aggregate with an immutable ISO timestamp', () => {
    const createdAt = new Date('2026-11-14T03:00:00.000Z');
    const identity = Identity.reconstitute({
      id: 'identity-123',
      email: EmailAddress.create('Ada@example.com'),
      passwordHash: PasswordHash.fromEncoded('test-only-hash'),
      createdAt,
    });

    assert.equal(identity.id, 'identity-123');
    assert.equal(identity.email.value, 'ada@example.com');
    assert.equal(identity.createdAt, '2026-11-14T03:00:00.000Z');
    assert.equal(Object.isFrozen(identity), true);
  });

  it('rejects an empty identity ID', () => {
    assert.throws(
      () =>
        Identity.reconstitute({
          id: '  ',
          email: EmailAddress.create('ada@example.com'),
          passwordHash: PasswordHash.fromEncoded('test-only-hash'),
          createdAt: new Date('2026-11-14T03:00:00.000Z'),
        }),
      InvalidIdentityIdError,
    );
  });

  it('rejects an invalid email value object', () => {
    assert.throws(
      () =>
        Identity.reconstitute({
          id: 'identity-123',
          email: 'ada@example.com',
          passwordHash: PasswordHash.fromEncoded('test-only-hash'),
          createdAt: new Date('2026-11-14T03:00:00.000Z'),
        }),
      InvalidEmailAddressError,
    );
  });

  it('rejects an invalid password hash value object', () => {
    assert.throws(
      () =>
        Identity.reconstitute({
          id: 'identity-123',
          email: EmailAddress.create('ada@example.com'),
          passwordHash: 'plaintext-password',
          createdAt: new Date('2026-11-14T03:00:00.000Z'),
        }),
      InvalidPasswordHashError,
    );
  });

  it('rejects an invalid creation timestamp', () => {
    assert.throws(
      () =>
        Identity.reconstitute({
          id: 'identity-123',
          email: EmailAddress.create('ada@example.com'),
          passwordHash: PasswordHash.fromEncoded('test-only-hash'),
          createdAt: new Date('invalid'),
        }),
      InvalidIdentityCreatedAtError,
    );
  });

  it('does not expose the encoded hash through default serialization', () => {
    const hash = PasswordHash.fromEncoded('test-only-hash');

    assert.equal(JSON.stringify(hash), '{}');
    assert.equal(hash.toString(), '[REDACTED]');
  });
});
