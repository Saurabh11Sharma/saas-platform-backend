import { EmailAddress, InvalidEmailAddressError } from './email-address';
import { InvalidPasswordHashError, PasswordHash } from './password-hash';

export class InvalidIdentityIdError extends Error {
  constructor() {
    super('Identity ID is invalid');
    this.name = 'InvalidIdentityIdError';
  }
}

export class InvalidIdentityCreatedAtError extends Error {
  constructor() {
    super('Identity creation timestamp is invalid');
    this.name = 'InvalidIdentityCreatedAtError';
  }
}

export class IdentityEmailAlreadyRegisteredError extends Error {
  constructor() {
    super('An identity with this email address already exists');
    this.name = 'IdentityEmailAlreadyRegisteredError';
  }
}

/**
 * Identity aggregate root. Persistence adapters reconstitute it from the
 * Identity service's own database; password hashes are never returned by the
 * registration use case.
 */
export class Identity {
  private constructor(
    readonly id: string,
    readonly email: EmailAddress,
    readonly passwordHash: PasswordHash,
    readonly createdAt: string,
  ) {
    Object.freeze(this);
  }

  static reconstitute(input: {
    readonly id: unknown;
    readonly email: unknown;
    readonly passwordHash: unknown;
    readonly createdAt: unknown;
  }): Identity {
    if (typeof input.id !== 'string' || input.id.trim().length === 0) {
      throw new InvalidIdentityIdError();
    }

    if (!(input.email instanceof EmailAddress)) {
      throw new InvalidEmailAddressError();
    }

    if (!(input.passwordHash instanceof PasswordHash)) {
      throw new InvalidPasswordHashError();
    }

    if (!(input.createdAt instanceof Date) || !Number.isFinite(input.createdAt.getTime())) {
      throw new InvalidIdentityCreatedAtError();
    }

    return new Identity(input.id, input.email, input.passwordHash, input.createdAt.toISOString());
  }
}
