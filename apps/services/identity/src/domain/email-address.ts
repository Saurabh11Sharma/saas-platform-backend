const LOCAL_PART_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const MAX_EMAIL_LENGTH = 254;

export class InvalidEmailAddressError extends Error {
  constructor() {
    super('Email address is invalid');
    this.name = 'InvalidEmailAddressError';
  }
}

/**
 * A normalized email address used by the Identity domain.
 *
 * This value object supports common ASCII dot-atom addresses with DNS domains;
 * it intentionally does not attempt to implement every RFC 5322 mailbox form.
 */
export class EmailAddress {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(input: string): EmailAddress {
    if (typeof input !== 'string') {
      throw new InvalidEmailAddressError();
    }

    const value = input.trim().toLowerCase();
    if (!EmailAddress.isValid(value)) {
      throw new InvalidEmailAddressError();
    }

    return new EmailAddress(value);
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private static isValid(value: string): boolean {
    if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) {
      return false;
    }

    const separatorIndex = value.indexOf('@');
    if (separatorIndex <= 0 || separatorIndex !== value.lastIndexOf('@')) {
      return false;
    }

    const localPart = value.slice(0, separatorIndex);
    const domain = value.slice(separatorIndex + 1);

    if (
      localPart.length > 64 ||
      localPart.startsWith('.') ||
      localPart.endsWith('.') ||
      localPart.includes('..') ||
      !LOCAL_PART_PATTERN.test(localPart)
    ) {
      return false;
    }

    if (domain.length > 253) {
      return false;
    }

    const labels = domain.split('.');
    if (
      labels.length < 2 ||
      labels.some(
        (label) =>
          label.length === 0 || label.length > 63 || !DOMAIN_LABEL_PATTERN.test(label),
      )
    ) {
      return false;
    }

    return labels[labels.length - 1].length >= 2;
  }
}