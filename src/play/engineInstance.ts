/**
 * The Play area's engine instance: one lazily created engine shared across
 * mounts, so navigating between areas never respawns the worker or reloads
 * the WASM payload. Where Web Workers don't exist (jsdom tests rendering the
 * app without an injected engine), the fake engine stands in — same
 * interface, no payload.
 */

import { createGnubgEngine, type Engine } from '../engine';
import { createFakeEngine } from '../engine/fake';

let instance: Engine | undefined;

export function getPlayEngine(): Engine {
  if (!instance) {
    // The fake branch is unreachable in real browsers (they all have Worker);
    // it exists for jsdom tests that render the app without injecting an
    // engine, and those tests rely on it.
    instance =
      typeof Worker === 'undefined' ? createFakeEngine() : createGnubgEngine();
  }
  return instance;
}
