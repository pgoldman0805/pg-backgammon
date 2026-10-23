/**
 * The bundled curated puzzle set (GLOSSARY "Curated puzzle").
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:puzzles
 * (scripts/minePuzzles.ts: engine self-play sweeps positions, keeps the
 * instructive ones, and grades every answer at full strength. Themes are
 * tagged by position heuristics. No positions are copied from books or
 * other published sources.)
 *
 * curated.validation.test.ts re-evaluates every stored answer against the
 * real WASM engine, so stale or wrong answer data cannot ship.
 */

import type { Puzzle } from './types';

export const CURATED_PUZZLES: readonly Puzzle[] = [];
