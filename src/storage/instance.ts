/**
 * The app-wide shared MatchStorage. IndexedDB in the browser; an in-memory
 * stand-in where IndexedDB does not exist (jsdom tests that render pages
 * without injecting storage), so persistence is simply ephemeral there.
 */

import { createIndexedDbStorage } from './idb';
import { createMemoryStorage } from './memory';
import type { MatchStorage } from './types';

let shared: MatchStorage | null = null;

export function getMatchStorage(): MatchStorage {
  if (!shared) {
    shared =
      typeof indexedDB === 'undefined'
        ? createMemoryStorage()
        : createIndexedDbStorage();
  }
  return shared;
}
