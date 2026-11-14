import { EmailAddress } from '../../domain/email-address';
import { Identity } from '../../domain/identity';
import { PasswordHash } from '../../domain/password-hash';

export interface NewIdentity {
  readonly email: EmailAddress;
  readonly passwordHash: PasswordHash;
}

/**
 * Outbound persistence port owned by the Identity application.
 *
 * create must perform one atomic insert and enforce uniqueness on the normalized
 * email address. The adapter must translate only the matching database
 * uniqueness violation into IdentityEmailAlreadyRegisteredError; it must not
 * use a read-before-write check that can race. The adapter may generate the
 * identity ID and creation timestamp and must return the persisted aggregate.
 * It must use only the Identity service's database.
 */
export interface IdentityRepository {
  create(input: NewIdentity): Promise<Identity>;
}
