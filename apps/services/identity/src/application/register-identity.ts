import { EmailAddress } from '../domain/email-address';
import { IdentityRepository } from './ports/identity-repository';
import { PasswordHasher } from './ports/password-hasher';

export class InvalidRegistrationRequestError extends Error {
  constructor() {
    super('Registration request is invalid');
    this.name = 'InvalidRegistrationRequestError';
  }
}

export class InvalidRegistrationPasswordError extends Error {
  constructor() {
    super('Password is invalid');
    this.name = 'InvalidRegistrationPasswordError';
  }
}

export interface RegisterIdentityResult {
  readonly id: string;
  readonly email: string;
  readonly createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Creates an Identity account without depending on NestJS or persistence details.
 *
 * The repository owns atomic email uniqueness enforcement. Duplicate-email
 * conflicts are propagated as IdentityEmailAlreadyRegisteredError so the
 * inbound adapter can map them to the public API's chosen response.
 */
export class RegisterIdentity {
  constructor(
    private readonly identities: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: unknown): Promise<RegisterIdentityResult> {
    if (!isRecord(command)) {
      throw new InvalidRegistrationRequestError();
    }

    const email = EmailAddress.create(command.email);
    const password = command.password;

    if (typeof password !== 'string' || password.length === 0) {
      throw new InvalidRegistrationPasswordError();
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const identity = await this.identities.create({ email, passwordHash });

    return Object.freeze({
      id: identity.id,
      email: identity.email.value,
      createdAt: identity.createdAt,
    });
  }
}
