/**
 * Display-name rules, shared by the room (which stores names) and the client
 * (which shows and persists them). A name is cosmetic: it carries no identity
 * or authority, so the rules only keep it printable and short.
 */

import { MAX_NAME_LENGTH } from './protocol';

/** The cleaned name, or null when nothing usable remains. */
export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const cleaned = Array.from(raw.replace(/\s+/g, ' '))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned === '' ? null : cleaned;
}
