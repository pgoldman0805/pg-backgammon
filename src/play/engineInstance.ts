/**
 * The Play area's engine instance: one lazily created engine shared across
 * mounts, so navigating between areas never respawns the worker or reloads
 * the WASM payload. Where Web Workers don't exist (jsdom tests rendering the
 * app without an injected engine), the fake engine stands in — same
 * interface, no payload.
 */

import { createFakeEngine, createGnubgEngine, type Engine } from '../engine';

let instance: Engine | undefined;

export function getPlayEngine(): Engine {
  if (!instance) {
    instance =
      typeof Worker === 'undefined' ? createFakeEngine() : createGnubgEngine();
  }
  return instance;
}
