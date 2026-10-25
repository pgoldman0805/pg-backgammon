# 34: Report PR, not raw mEMG

**What to build:** The quality number speaks the language serious players use. The error rate is shown as XG-style PR (equity lost per unforced decision × 500), labelled as PR, and mapped to familiar skill bands (e.g. world-class / expert / advanced / intermediate / beginner) so the figure is immediately interpretable to anyone from the wider backgammon world.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Per-game and per-match quality is displayed as PR with correct scaling, clearly labelled as PR
- [x] A skill-band label accompanies the number
- [x] Progress charts and stored history read consistently in the new units (no stale mEMG figures lingering)
- [x] Full gauntlet green

## Comments

- Display-only change: stored analysis stays in EMG (`errorRate` field untouched). PR is computed for display as `errorRate × 500` (vs the former mEMG `× 1000`), so every figure is now exactly half the old number and labelled "PR".
- New formatters in `src/ui/format.ts`: `errorRatePr` (numeric ×500), `prText` (one-decimal string, renamed from `rateText`), and `skillBand`. Skill-band mapping (PR, lower is better, each boundary on the better side): World-class `<5`, Expert `5–8`, Advanced `8–13`, Intermediate `13–20`, Beginner `≥20`. This puts a gnubg mEMG 30 (PR 15) in "Intermediate", matching review finding #9.
- Analyze summary now shows `<PR> PR · <band>` per player and the game tabs show PR; the hint and glossary term switched from "Error rate" to "PR". Progress: chart retitled "PR per match", the recent-matches aggregate shows PR + band, the table column and tooltips read PR, and the empty-state copy says "PR over time".
- Glossary: added a player-facing `pr` entry; updated the `error-rate` entry (dropped "thousandths", now "shown here as PR"). Canonical `GLOSSARY.md` "Error rate" entry updated — it previously said _Avoid: PR_, which this ticket reverses; it now documents EMG-stored / PR-displayed and the skill bands.
- The `role="group"` accessible names stayed "White/Black error rate" (and the review-summary region "Match error rates") so the e2e group selectors keep working; the visible, player-facing label is PR. Only one e2e assertion needed updating: the audit chart title ("Error rate per match" → "PR per match").
- Verification (all foreground, green): `npm test` (929), `npm run lint`, `npm run build`, `npm run e2e`, `npm run e2e:audit`, `npm run e2e:pwa`.
