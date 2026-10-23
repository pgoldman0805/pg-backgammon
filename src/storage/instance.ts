/**
 * The app-wide shared MatchStorage. IndexedDB in the browser; an in-memory
 * stand-in where IndexedDB does not exist (jsdom tests that render pages
 * without injecting storage), so persistence is simply ephemeral there.
 * The shared instance is observable (ticket 12): the blunder miner subscribes
 * to its put events to react when an analysis persists.
 */

import { createIndexedDbStorage } from './idb';
import { createMemoryStorage } from './memory';
import {
  createObservableMatchStorage,
  type ObservableMatchStorage,
} from './observe';
import type { MatchStorage } from './types';

let shared: ObservableMatchStorage | null = null;

function sharedStorage(): ObservableMatchStorage {
  if (!shared) {
    shared = createObservableMatchStorage(
      typeof indexedDB === 'undefined'
        ? createMemoryStorage()
        : createIndexedDbStorage(),
    );
  }
  return shared;
}

export function getMatchStorage(): MatchStorage {
  return sharedStorage();
}

/** The same shared instance, typed with its put events. */
export function getObservableMatchStorage(): ObservableMatchStorage {
  return sharedStorage();
}
