export class InvalidPasswordHashError extends Error {
  constructor() {
    super('Password hash is invalid');
    this.name = 'InvalidPasswordHashError';
  }
}

/**
 * An encoded, one-way password hash.
 *
 * The encoded value is available only through an explicit getter for persistence adapters.
 * Default object serialization intentionally does not expose the hash.
 */
export class PasswordHash {
  readonly #encoded: string;

  private constructor(encoded: string) {
    this.#encoded = encoded;
    Object.freeze(this);
  }

  static fromEncoded(input: unknown): PasswordHash {
    if (typeof input !== 'string' || input.length === 0) {
      throw new InvalidPasswordHashError();
    }

    return new PasswordHash(input);
  }

  get encoded(): string {
    return this.#encoded;
  }

  toString(): string {
    return '[REDACTED]';
  }
}
