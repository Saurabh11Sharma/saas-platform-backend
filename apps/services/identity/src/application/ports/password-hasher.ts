import { PasswordHash } from '../../domain/password-hash';

/**
 * Outbound password-hashing port.
 *
 * RegisterIdentity supplies an NFC-normalized password. Implementations must
 * hash the complete input without truncation, use a vetted adaptive algorithm,
 * and encode a unique salt and algorithm/version parameters with the hash.
 * Authentication verification must apply the same NFC normalization. Plaintext
 * passwords and encoded hashes must never be logged.
 */
export interface PasswordHasher {
  hash(plainTextPassword: string): Promise<PasswordHash>;
}
