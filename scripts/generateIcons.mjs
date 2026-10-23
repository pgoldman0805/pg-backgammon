/**
 * Generate the PWA icons (ticket 23) from the app's mark, public/favicon.svg:
 *
 *   public/icon-192.png          192x192, transparent rounded corners
 *   public/icon-512.png          512x512, transparent rounded corners
 *   public/icon-maskable-512.png 512x512, full-bleed background with the mark
 *                                scaled into the maskable safe zone (~72%)
 *
 * Playwright's bundled Chromium rasterizes the SVG, so the pipeline needs no
 * extra image dependency and renders the same way the browser does.
 *
 * Usage: npm run icons   (or: node scripts/generateIcons.mjs)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const publicDir = new URL('../public/', import.meta.url);

/** Rasterize one SVG document at size x size into a PNG file. */
async function rasterize(page, svgMarkup, size, fileName) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svgMarkup}`,
  );
  const png = await page.screenshot({ omitBackground: true });
  const path = fileURLToPath(new URL(fileName, publicDir));
  await writeFile(path, png);
  console.log(`wrote ${path} (${png.length} bytes)`);
}

const favicon = await readFile(
  fileURLToPath(new URL('favicon.svg', publicDir)),
  'utf8',
);

/**
 * The maskable variant, derived from the same source: drop the corner radius
 * (the platform mask supplies the shape) and scale the mark toward the
 * center so it stays inside the maskable safe zone (a circle of 80% of the
 * icon's width). Relies on favicon.svg's shape: one <rect> background, then
 * the mark's <path> elements.
 */
const maskable = favicon
  .replace(' rx="6"', '')
  .replace(
    '<path',
    '<g transform="translate(16 16) scale(0.72) translate(-16 -16)"><path',
  )
  .replace('</svg>', '</g></svg>');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await rasterize(page, favicon, 192, 'icon-192.png');
  await rasterize(page, favicon, 512, 'icon-512.png');
  await rasterize(page, maskable, 512, 'icon-maskable-512.png');
} finally {
  await browser.close();
}
