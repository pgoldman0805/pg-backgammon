/**
 * Node-only loader for the vendored gnubg WASM build, used by contract and
 * cross-validation tests (the browser path is src/engine/worker.ts). Kept in
 * src/engine/node/, which the app tsconfig excludes: this file needs node
 * builtins that must never leak into the browser bundle.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGnubgBoot } from '../gnubgBoot';
import type { GnubgSession } from '../session';
import { createGnubgSession } from '../session';

const require = createRequire(import.meta.url);

const DEFAULT_ENGINE_DIR = fileURLToPath(
  new URL('../../../public/engine/', import.meta.url),
);

/** Load the glue + wasm + data from disk and boot a session. */
export async function loadGnubgSession(
  engineDir: string = DEFAULT_ENGINE_DIR,
): Promise<GnubgSession> {
  const glueSource = readFileSync(join(engineDir, 'gnubg.js'), 'utf8');
  const wasmBinary = readFileSync(join(engineDir, 'gnubg.wasm'));
  const dataPackage = readFileSync(join(engineDir, 'gnubg.data'));

  const boot = createGnubgBoot({
    wasmBinary,
    getPreloadedPackage: () =>
      dataPackage.buffer.slice(
        dataPackage.byteOffset,
        dataPackage.byteOffset + dataPackage.byteLength,
      ) as ArrayBuffer,
    locateFile: (path) => join(engineDir, path),
  });

  // The glue is a classic script: evaluate it with the scope names it
  // expects. `location` satisfies the data-package loader's environment
  // check; `require` serves Emscripten's node paths.
  // biome-ignore lint/security/noGlobalEval: loading the vendored Emscripten glue is the one sanctioned eval in this repo.
  const evaluateGlue = new Function(
    'Module',
    'require',
    'location',
    '__dirname',
    '__filename',
    glueSource,
  );
  evaluateGlue(
    boot.moduleConfig,
    require,
    { pathname: '/' },
    engineDir,
    join(engineDir, 'gnubg.js'),
  );

  const runCommand = await boot.ready;
  return createGnubgSession(runCommand);
}
