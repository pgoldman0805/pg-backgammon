/**
 * Launcher for the score-dependent cube mining script: runs
 * scripts/mineScoreCubes.ts in node through Vite's SSR transform, so the
 * script can import the repo's TypeScript sources (extensionless imports
 * included) unchanged.
 *
 *   npm run mine:score-cubes
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
    module = await server.ssrLoadModule('/scripts/mineScoreCubes.ts');
  } else {
    const { createServerModuleRunner } = await import('vite');
    const runner = createServerModuleRunner(server.environments.ssr);
    module = await runner.import('/scripts/mineScoreCubes.ts');
  }
  await module.mineScoreCubes();
} finally {
  await server.close();
}
