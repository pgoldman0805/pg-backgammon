/**
 * The gnubg engine Web Worker: boots the vendored WASM build off the main
 * thread and answers EngineRequest messages. Deliberately thin — all
 * protocol logic lives in session.ts, which contract tests exercise against
 * the same WASM loaded directly in Node.
 */

import { createGnubgBoot } from './gnubgBoot';
import type { GnubgSession } from './session';
import { createGnubgSession } from './session';
import type { EngineRequest, EngineResponse } from './workerProtocol';

const scope = globalThis as unknown as {
  Module: Record<string, unknown>;
  postMessage(message: EngineResponse): void;
  onmessage: ((event: MessageEvent<EngineRequest>) => void) | null;
};

let sessionPromise: Promise<GnubgSession> | undefined;

async function bootSession(): Promise<GnubgSession> {
  const base = import.meta.env.BASE_URL ?? '/';
  const engineUrl = (file: string): string => `${base}engine/${file}`;
  const boot = createGnubgBoot({ locateFile: engineUrl });
  scope.Module = boot.moduleConfig;
  const response = await fetch(engineUrl('gnubg.js'));
  if (!response.ok) {
    throw new Error(`failed to fetch gnubg.js: HTTP ${response.status}`);
  }
  const glueSource = await response.text();
  // The glue is a classic non-module script; indirect eval runs it in the
  // worker's global scope, which is exactly what it expects.
  // biome-ignore lint/security/noGlobalEval: loading the vendored Emscripten glue is the one sanctioned eval in this repo.
  globalThis.eval(glueSource);
  const runCommand = await boot.ready;
  return createGnubgSession(runCommand);
}

function ensureSession(): Promise<GnubgSession> {
  if (!sessionPromise) {
    // Don't cache a rejected boot: a failed fetch/compile must not poison
    // every later request with the same stale failure. Clearing the slot on
    // failure lets a re-sent request re-attempt the boot. (The client also
    // replaces the whole worker on retry; this keeps a single worker honest.)
    sessionPromise = bootSession().catch((error: unknown) => {
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

async function handle(request: EngineRequest): Promise<unknown> {
  const session = await ensureSession();
  switch (request.kind) {
    case 'initialize':
      return undefined;
    case 'evaluate':
      return session.evaluate(request.position);
    case 'rankPlays':
      return session.rankPlays(request.position, request.roll, request.options);
    case 'cubeInfo':
      return session.cubeInfo(request.position, request.options);
  }
}

scope.onmessage = (event: MessageEvent<EngineRequest>) => {
  const request = event.data;
  handle(request).then(
    (result) => scope.postMessage({ id: request.id, ok: true, result }),
    (error: unknown) =>
      scope.postMessage({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
  );
};
