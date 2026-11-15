import { PasswordHash } from '../../domain/password-hash';

/**
 * Outbound password-hashing port.
 *
 * Implementations must use a vetted adaptive password-hashing algorithm with a
 * unique salt per password and a versioned encoded representation. Plaintext
 * passwords and encoded hashes must never be logged.
 */
export interface PasswordHasher {
  hash(plainTextPassword: string): Promise<PasswordHash>;
}
