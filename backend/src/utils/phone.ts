// Phone numbers are stored in a single canonical form ("+" + digits) so that a
// customer can sign in with whatever spacing/prefix style they happen to type.
// Uzbek subscriber numbers are written locally as 9 digits (90 123 45 67) and
// with the 998 country code interchangeably, so both normalise to the same key.
const UZ_COUNTRY_CODE = '998';
const UZ_SUBSCRIBER_LENGTH = 9;

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === UZ_SUBSCRIBER_LENGTH) return `+${UZ_COUNTRY_CODE}${digits}`;
  if (digits.length === UZ_SUBSCRIBER_LENGTH + 1 && digits.startsWith('0')) {
    return `+${UZ_COUNTRY_CODE}${digits.slice(1)}`;
  }

  // Anything else is treated as an already-international number.
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

// True when the string looks like an email rather than a phone number — used by
// the sign-in endpoint, which accepts either in one field.
export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@');
}
