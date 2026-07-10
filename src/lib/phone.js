/** Digits only from a phone-like string. */
export function phoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/**
 * Normalize to a local PH mobile digit string (11 digits starting with 09).
 * Accepts 09XXXXXXXXX or 639XXXXXXXXX.
 */
export function normalizePhMobileDigits(value) {
  let digits = phoneDigits(value);
  if (digits.startsWith("63") && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    digits = `0${digits}`;
  }
  return digits.slice(0, 11);
}

/** Format as 09XX XXX XXXX while typing. */
export function formatPhPhoneInput(value) {
  const digits = normalizePhMobileDigits(value);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Valid PH mobile: 09 + 9 digits. */
export function isValidPhPhone(value) {
  return /^09\d{9}$/.test(normalizePhMobileDigits(value));
}
