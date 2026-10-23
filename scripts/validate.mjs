/**
 * Launcher for the full-set puzzle validation script: runs
 * scripts/validatePuzzles.ts in node through Vite's SSR transform, so the
 * script can import the repo's TypeScript sources (extensionless imports
 * included) unchanged.
 *
 *   npm run validate:puzzles
 */

import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  logLevel: 'warn',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});

try {
  let module;
  if (typeof server.ssrLoadModule === 'function') {
    module = await server.ssrLoadModule('/scripts/validatePuzzles.ts');
  } else {
    const { createServerModuleRunner } = await import('vite');
    const runner = createServerModuleRunner(server.environments.ssr);
    module = await runner.import('/scripts/validatePuzzles.ts');
  }
  await module.validatePuzzles();
} finally {
  await server.close();
}
