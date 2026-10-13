/**
 * Small text rules shared by many pages, the same as the app's.
 */

/**
 * A fragment that keeps its own direction inside a sentence in the other:
 * a building code, a phone number, an invoice number inside Dari text.
 * U+2068 FIRST STRONG ISOLATE … U+2069 POP DIRECTIONAL ISOLATE.
 */
export function isolate(value: string): string {
  return `⁨${value}⁩`;
}

/** Building codes: 2–8 of A–Z and 0–9, starting with a letter. */
export const CODE_MIN = 2;
export const CODE_MAX = 8;

/** A complex's code (V031): 2–6, starting with a letter. */
export function isValidComplexCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{1,5}$/.test(code);
}

export function normaliseComplexCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/** Two letters for an avatar. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '؟';
}

/** A `tel:` link for a stored E.164 number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Joins the parts that exist with a middle dot. */
export function dotted(...parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(' · ');
}
