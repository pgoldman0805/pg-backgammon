# 36: Human-textured difficulty

**What to build:** The five difficulties span a real range of opponents that play like weaker humans, not randomly. The weakening at lower levels biases toward characteristic human mistakes (over-hitting, running back checkers, missing gammon or timing danger) and widens at the bottom, so Beginner feels genuinely beatable and distinct from Intermediate rather than compressing into a narrow upper band.

**Blocked by:** 29 (difficulty-aware opponent cube) — both reshape how a difficulty level plays; land the cube weakening first.

**Status:** ready-for-agent

- [x] Lower difficulties produce recognizably human-type errors, not only uniform symmetric noise, in a seeded/reproducible way
- [x] The five levels show a measurable, monotonic strength gap across sampled games (not compressed into a narrow band)
- [x] Expert and World-class are unchanged
- [x] Full gauntlet green

## Comments

### The model (ticket 36)

Difficulty weakening lives entirely in `src/engine/difficulty.ts`, consumed by
`session.ts` (real gnubg) and `fake.ts` (test engine). It is unchanged in spirit
from ADR-0001 — the same seeded, reproducible perturbation over clean 0-ply
equities — but each candidate play's clean equity now gets **two** terms added
before re-sorting, instead of one symmetric noise term:

1. **Random slips** — symmetric, zero-mean Gaussian noise of s.d. `noise`,
   position-seeded (`xgid|moveText`). The ordinary "didn't see it" error.
2. **Human-error bias** — a *directional* equity bonus of `bias ×
   humanTemptation(moveText)`, so a weakened opponent systematically errs the
   way a weaker human does rather than coin-flipping. `humanTemptation` reads
   gnubg's hero-relative notation (side-agnostic):
   - **over-hitting**: a play that hits (gnubg marks it `*`) → weight 1.0;
   - **running a back checker**: a play whose token advances a checker off
     point 20–24 (opponent home / deep anchor zone) → weight 0.6;
   - a running hit is doubly tempting (weights add).

Per-level settings (`plies / noise / bias`):

| Level        | plies | noise | bias |
|--------------|:-----:|:-----:|:----:|
| Beginner     | 0     | 0.12  | 0.12 |
| Casual       | 0     | 0.07  | 0.06 |
| Intermediate | 0     | 0.035 | 0.02 |
| Expert       | 0     | 0     | 0    |
| World-class  | 2     | 0     | 0    |

### How the levels differ

- The bottom is **widened**: Beginner's noise (0.12) is >3× Intermediate's
  (0.035), up from the old near-flat 0.06/0.05/0.03 band, so Beginner is
  genuinely beatable and clearly distinct from Intermediate.
- Both terms scale monotonically Beginner → Casual → Intermediate, so measured
  equity lost per decision is monotonic across the three weakened levels
  (pinned by the strength-gap test over a 400-position synthetic pool).
- **Expert (clean 0-ply) and World-class (clean 2-ply) are byte-for-byte
  unchanged**: both carry zero noise and zero bias, so `applyDifficultyNoise`
  returns the input untouched — identical to the pre-ticket behavior, and every
  analysis / post-game review / Tutor call (which pass no difficulty) stays
  full strength. Verified against the real WASM (session.test, smoke test).

### What was NOT modeled

The spec also named **under-valuing gammon chances** and **timing / priming
danger**. Those need each play's win/gammon distribution, which the shared
difficulty seam does not carry uniformly (the fake engine has no gammon model,
and the bias is computed from move notation alone so it behaves identically in
both engines). Modeling them would mean widening the seam to pass per-play
`WinChances` into the perturbation and giving the fake a gammon model — left for
a later pass. The two notation-detectable beginner errors (over-hitting,
running a back checker) are modeled; cube weakening is unchanged (ticket 29).

No `opponent.ts` wiring change was needed: it already passes `{ difficulty }`
to `rankPlays`/`cubeInfo`, and all the new behavior is inside those calls.
