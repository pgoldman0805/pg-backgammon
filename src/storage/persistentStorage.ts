/**
 * Durable storage (ticket 26, review finding #1). Browsers evict an app's
 * IndexedDB under storage pressure, and iOS purges an unopened PWA's storage
 * after about a week — wiping every match and all puzzle progress with no
 * warning. The StorageManager API lets us ask for durability
 * (`persist()`), read whether we have it (`persisted()`), and measure what
 * we are using (`estimate()`). Every call here degrades quietly where the API
 * is absent (older browsers, non-secure contexts, jsdom), so the app stays
 * client-only and never throws on the storage path.
 */

/** The granted/denied durability of the app's storage. */
export type PersistenceState = 'persisted' | 'not-persisted' | 'unsupported';

/** Usage and quota in bytes, as the browser estimates them. */
export interface StorageUsage {
  readonly usage: number;
  readonly quota: number;
}

/** The slice of StorageManager we use; each method optional for feature-test. */
interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

/** The global StorageManager, if this environment has one. */
function globalStorageManager(): StorageManagerLike | undefined {
  return typeof navigator !== 'undefined'
    ? (navigator.storage as StorageManagerLike | undefined)
    : undefined;
}

/**
 * Ask the browser to make the app's storage durable (eviction-resistant).
 * Idempotent and safe to call on every launch; resolves to the resulting
 * state. 'unsupported' where `persist()` is missing or rejects — never throws.
 */
export async function requestPersistentStorage(
  manager: StorageManagerLike | undefined = globalStorageManager(),
): Promise<PersistenceState> {
  if (!manager || typeof manager.persist !== 'function') {
    return 'unsupported';
  }
  try {
    return (await manager.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

/**
 * Read whether storage is already durable, without prompting or requesting.
 * 'unsupported' where `persisted()` is missing or rejects.
 */
export async function persistedState(
  manager: StorageManagerLike | undefined = globalStorageManager(),
): Promise<PersistenceState> {
  if (!manager || typeof manager.persisted !== 'function') {
    return 'unsupported';
  }
  try {
    return (await manager.persisted()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

/**
 * The app's current storage usage and quota in bytes, or null where the
 * estimate is unavailable or incomplete.
 */
export async function estimateStorage(
  manager: StorageManagerLike | undefined = globalStorageManager(),
): Promise<StorageUsage | null> {
  if (!manager || typeof manager.estimate !== 'function') {
    return null;
  }
  try {
    const { usage, quota } = await manager.estimate();
    if (typeof usage !== 'number' || typeof quota !== 'number') {
      return null;
    }
    return { usage, quota };
  } catch {
    return null;
  }
}
