import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailAddress, InvalidEmailAddressError } from '../domain/email-address';
import {
  Identity,
  IdentityEmailAlreadyRegisteredError,
} from '../domain/identity';
import { PasswordHash } from '../domain/password-hash';
import { RegisterIdentity, InvalidRegistrationPasswordError, InvalidRegistrationRequestError } from './register-identity';
import { IdentityRepository, NewIdentity } from './ports/identity-repository';
import { PasswordHasher } from './ports/password-hasher';

function createHarness(options: {
  readonly repository?: IdentityRepository;
  readonly passwordHasher?: PasswordHasher;
} = {}) {
  const created: NewIdentity[] = [];
  const hashedPasswords: string[] = [];

  const repository: IdentityRepository = options.repository ?? {
    async create(input) {
      created.push(input);

      return Identity.reconstitute({
        id: 'identity-123',
        email: input.email,
        passwordHash: input.passwordHash,
        createdAt: new Date('2026-11-14T03:00:00.000Z'),
      });
    },
  };

  const passwordHasher: PasswordHasher = options.passwordHasher ?? {
    async hash(plainTextPassword) {
      hashedPasswords.push(plainTextPassword);
      return PasswordHash.fromEncoded('test-only-hash');
    },
  };

  return {
    useCase: new RegisterIdentity(repository, passwordHasher),
    created,
    hashedPasswords,
  };
}

describe('RegisterIdentity', () => {
  it('normalizes email, hashes the password, persists the aggregate, and returns no credential data', async () => {
    const { useCase, created, hashedPasswords } = createHarness();

    const result = await useCase.execute({
      email: '  Ada.Lovelace@Example.COM ',
      password: 'a-test-password',
    });

    assert.deepEqual(result, {
      id: 'identity-123',
      email: 'ada.lovelace@example.com',
      createdAt: '2026-11-14T03:00:00.000Z',
    });
    assert.deepEqual(hashedPasswords, ['a-test-password']);
    assert.equal(created.length, 1);
    assert.equal(created[0].email.value, 'ada.lovelace@example.com');
    assert.equal(created[0].passwordHash.encoded, 'test-only-hash');
    assert.equal('passwordHash' in result, false);
  });

  it('rejects a non-object request before invoking dependencies', async () => {
    const { useCase, created, hashedPasswords } = createHarness();

    await assert.rejects(
      useCase.execute(null),
      InvalidRegistrationRequestError,
    );

    assert.equal(hashedPasswords.length, 0);
    assert.equal(created.length, 0);
  });

  it('rejects an invalid email before hashing or persistence', async () => {
    const { useCase, created, hashedPasswords } = createHarness();

    await assert.rejects(
      useCase.execute({ email: 'not-an-email', password: 'a-test-password' }),
      InvalidEmailAddressError,
    );

    assert.equal(hashedPasswords.length, 0);
    assert.equal(created.length, 0);
  });

  it('rejects a missing or empty password before hashing or persistence', async () => {
    const { useCase, created, hashedPasswords } = createHarness();

    await assert.rejects(
      useCase.execute({ email: 'ada@example.com', password: '' }),
      InvalidRegistrationPasswordError,
    );

    await assert.rejects(
      useCase.execute({ email: 'ada@example.com' }),
      InvalidRegistrationPasswordError,
    );

    assert.equal(hashedPasswords.length, 0);
    assert.equal(created.length, 0);
  });

  it('does not persist an identity when password hashing fails', async () => {
    const hashingError = new Error('hashing failed');
    const passwordHasher: PasswordHasher = {
      async hash() {
        throw hashingError;
      },
    };
    const { useCase, created } = createHarness({ passwordHasher });

    await assert.rejects(
      useCase.execute({ email: 'ada@example.com', password: 'a-test-password' }),
      (error: unknown) => error === hashingError,
    );

    assert.equal(created.length, 0);
  });

  it('propagates the repository duplicate-email conflict', async () => {
    const conflict = new IdentityEmailAlreadyRegisteredError();
    const repository: IdentityRepository = {
      async create() {
        throw conflict;
      },
    };
    const { useCase, hashedPasswords } = createHarness({ repository });

    await assert.rejects(
      useCase.execute({ email: 'ada@example.com', password: 'a-test-password' }),
      (error: unknown) => error === conflict,
    );

    assert.equal(hashedPasswords.length, 1);
  });
});
