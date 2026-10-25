/**
 * Launcher for the Basics-theme authoring script: runs scripts/mineBasics.ts
 * in node through Vite's SSR transform, so the script can import the repo's
 * TypeScript sources (extensionless imports included) unchanged.
 *
 *   npm run mine:basics
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
    module = await server.ssrLoadModule('/scripts/mineBasics.ts');
  } else {
    const { createServerModuleRunner } = await import('vite');
    const runner = createServerModuleRunner(server.environments.ssr);
    module = await runner.import('/scripts/mineBasics.ts');
  }
  await module.mineBasics();
} finally {
  await server.close();
}
