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

const MIN_REGISTRATION_PASSWORD_CODE_POINTS = 15;
const MAX_REGISTRATION_PASSWORD_CODE_POINTS = 128;

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
  if (!keys.includes('email') || !keys.every((key) => key === 'email' || key === 'password')) {
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

function countCodePointsWithinLimit(value: string, limit: number): number | null {
  let count = 0;

  for (let index = 0; index < value.length; index += 1) {
    const current = value.charCodeAt(index);
    const next = value.charCodeAt(index + 1);

    const isHighSurrogate = current >= 0xd800 && current <= 0xdbff;
    const isLowSurrogate = next >= 0xdc00 && next <= 0xdfff;

    if (isHighSurrogate) {
      if (!isLowSurrogate) {
        return null;
      }

      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      return null;
    }

    count += 1;
    if (count > limit) {
      return null;
    }
  }

  return count;
}

/**
 * Password-only registration follows the NIST SP 800-63B-4 single-factor
 * baseline: at least 15 Unicode code points. The 128-code-point cap supports
 * long passphrases while limiting input size. NFC normalization is applied
 * before validation and hashing; passwords are not trimmed or truncated.
 */
function normalizeRegistrationPassword(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidRegistrationPasswordError();
  }

  const normalized = value.normalize('NFC');
  const length = countCodePointsWithinLimit(normalized, MAX_REGISTRATION_PASSWORD_CODE_POINTS);

  if (length === null || length < MIN_REGISTRATION_PASSWORD_CODE_POINTS) {
    throw new InvalidRegistrationPasswordError();
  }

  return normalized;
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
    const password = normalizeRegistrationPassword(fields.password);

    const passwordHash = await this.passwordHasher.hash(password);
    const identity = await this.identities.create({ email, passwordHash });

    return Object.freeze({
      id: identity.id,
      email: identity.email.value,
      createdAt: identity.createdAt,
    });
  }
}
