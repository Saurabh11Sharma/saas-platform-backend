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

interface RegistrationFields {
  readonly email: unknown;
  readonly password: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function getRegistrationFields(value: unknown): RegistrationFields | null {
  if (!isRecord(value)) {
    return null;
  }

  const keys = Reflect.ownKeys(value);
  if (
    !keys.includes('email') ||
    !keys.every((key) => key === 'email' || key === 'password')
  ) {
    return null;
  }

  const email = Object.getOwnPropertyDescriptor(value, 'email');
  const password = Object.getOwnPropertyDescriptor(value, 'password');

  if (email === undefined || !('value' in email) || !email.enumerable) {
    return null;
  }

  if (password !== undefined && (!('value' in password) || !password.enumerable)) {
    return null;
  }

  return {
    email: email.value,
    password: password?.value,
  };
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
    const fields = getRegistrationFields(command);
    if (fields === null) {
      throw new InvalidRegistrationRequestError();
    }

    const email = EmailAddress.create(fields.email);
    const password = fields.password;

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
