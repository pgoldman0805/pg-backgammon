import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// The Worker and the room Durable Object, run inside workerd (Miniflare) from
// the same wrangler config that deploys them. Kept apart from the jsdom suite
// in vite.config.ts, which only sweeps src/.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
  test: {
    include: ['worker/**/*.test.ts'],
  },
});
