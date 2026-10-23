# 13: Progress view

**What to build:** The Progress area: error rate per match plotted over time (from stored analysis results), blunder counts per match, and simple aggregates (total matches, average error rate over the last N matches). Tutor-assisted games are excluded from stats. Empty states guide a new user toward playing an analyzed match.

**Blocked by:** 08 (post-game review).

**Status:** done

- [x] The trend chart renders from stored analysis with correct values (golden test on a known history)
- [x] Tutor-assisted games are excluded and the exclusion is visible/explained
- [x] Works in both themes; readable at tablet width
- [x] Empty state shows before any analyzed match exists

## Comments

Implemented on branch `ticket/13-progress-view` (2026-10-22). Shape of what
landed, and what was verified how:

- **Selector** (`src/progress`, new — pure data in, pure data out):
  `buildProgress(storedMatches)` derives the plotted series. A match
  contributes exactly when it is finished, carries a readable format-1
  `MatchAnalysis`, and its config says `mode: 'computer'` (the user always
  plays White there — hot-seat has no single user side; an imported match
  counts iff ticket 10 stores it with `mode: 'computer'`, the one marker
  that identifies the user's side today; any other mode is excluded until a
  richer marker exists). Within a match the numbers are **recomputed from
  the per-game `GameAnalysis.white` summaries of the non-tutor-assisted
  games only** (`record.games[i].tutorAssisted`, absent = falsy for
  pre-ticket-09 rows; zipped by index, extra entries on either side
  ignored) — never read from the stored match summary, which includes tutor
  games. A match whose counted games hold zero unforced decisions (every
  game tutor-assisted, or nothing to decide) contributes no point. Points
  order by `updatedAt` ascending (the finished row's last persisted write).
  Each `ProgressPoint`: errorRate/equityLost/decisions, blunder/error/
  dubious counts, gamesCounted/gamesExcluded, length + difficulty for
  labels. Totals: contributing-match count, blunders summed, and
  `recentErrorRate` = the **mean of the last ≤10 per-match error rates**
  (`RECENT_WINDOW = 10`) — the average of the plotted points, not a pooled
  re-rate, so the headline matches what the chart's tail shows.
- **Page** (`src/pages/Progress.tsx` + `progress.css`): stat strip
  (matches analyzed, error rate over the last N, total blunders, with the
  thousandths/lower-is-better hint echoing Analyze's wording), a visible
  exclusion note ("Tutor-assisted games are excluded from everything on
  this page — a hollow point marks a match where only some games
  counted"), the error-rate line chart, the blunders column chart, and a
  "View the numbers" `<details>` table (match, date, rate, blunders,
  decisions, "2 of 3" games counted) so no value is tooltip-gated. Storage
  is injectable like Analyze's; rows are `isStoredMatch`-filtered. Empty
  state invites the user to Play (link), explains the tutor rule, and adds
  a "none of your matches can be scored yet" paragraph when rows exist but
  none contribute. Storage failure gets its own message.
- **Charts** (hand-rolled SVG per the dataviz skill — no new dependency):
  single-series each, so no legend (titles + subtitles name the series;
  "lower is better" sits in both subtitles). 2px round-join line, r=4 dots
  with a 2px surface ring; **a hollow dot is the per-match exclusion
  mark** (shape, not color). Columns ≤24px with 4px rounded data-ends,
  square at the baseline, ≥2px gaps; zero-blunder matches draw no bar (the
  axis and table carry the zero). Hairline solid gridlines/baseline, muted
  tabular axis text, ≤5 date ticks, the latest rate direct-labeled at the
  line's end. Hover = full-height hit bands with a crosshair (line chart)
  or bar lift; the tooltip (date, match, value-first readout, exclusion
  line when partial) also appears on keyboard focus, and **click pins
  it** — the tablet/touch path. The hit layer is real HTML buttons overlaid
  on an aria-hidden SVG, each labeled with its full readout, so keyboard
  and screen-reader users get exactly what hover shows. Series colors are
  validated chart steps of the app's own hues (`validate_palette.js`, all
  six checks, both surfaces): light `#0e7a4e` / dark `#27a874` for the
  rate line (the accent's green), light `#a2402c` / dark `#cd5f3b` for the
  bars — the review's blunder rust, so "blunder" wears the same color in
  Analyze and Progress.
- **Test fixtures** (`src/test/progressRows.ts`, new): hand-built
  StoredMatch rows (passing `isStoredMatch`) with per-game tutor flags and
  hand-computed summaries, shared by the selector and page tests.

Automated vs needs-human-eyes:

- Selector: `src/progress/series.test.ts` (7 tests) — the **golden
  history**: a three-game match with the middle game tutor-assisted pins
  25 decisions / 0.300 lost / rate 0.012 / 2 blunders / 2 errors / 3
  dubious / 2-of-3 counted, deliberately different from the stored match
  summary (which would include the tutor game's 10 decisions / 0.900 / 5
  blunders), proving recomputation; all-tutor matches contribute nothing;
  absent `tutorAssisted` counts as clean; in-progress / unanalyzed /
  corrupt-analysis / hot-seat / unknown-mode rows excluded; ordering by
  finish time regardless of input order; totals (12-match history pins the
  last-10 mean at 0.0075); empty history.
- Page: `src/pages/Progress.test.tsx` (10 tests) — aggregates over
  contributing matches only (2 matches / 11.0 / 4 blunders with excluded
  noise rows seeded); each match an accessible labeled point with its
  golden values in both charts (and only contributing matches plotted);
  exactly one hollow `.rate-dot--partial` for the partial match; the
  exclusion note; tooltip on keyboard focus with the exclusion line,
  cleared on blur; pin on click / unpin on second click; the table view
  with "2 of 3"; empty-state guidance with the Play link; the
  "none can be scored yet" variant; storage failure.
- Verified live in a real browser against a seeded 14-match, 3-month
  history (realistic improving trend, one partially tutor-assisted match):
  line + dots + hollow point render with correct values, hover crosshair
  and tooltip ("8.3 error rate / 1 blunder · 64 decisions / 1 of 3 games
  was tutor-assisted and excluded" on the partial match — hand-checked),
  bar tooltip leads with blunders, end label clear of the line (one
  collision found and fixed during this pass), the table matches every
  plotted number, both themes checked (validated dark steps swap in via
  `data-theme`), empty state after clearing IndexedDB.
- `npm test` (569), `npm run build`, `npm run lint` all pass.
- **Human eyes**: the page on a real tablet (the layout is one fluid
  column capped at 68ch, so 780px renders essentially as desktop does, and
  the automation's window manager refused a true resize — worth a minute
  on a device, especially tooltip-pinning by touch); tooltip placement
  when a high point sits near the chart top (it overlaps the subtitle
  area by design — judge the feel); the hollow-dot mark's legibility at a
  glance; long-history densities (50+ matches compress the hit bands).

Deviations / notes for later tickets:

- "Average error rate over the last N" is the mean of the last ≤10
  per-match rates, not pooled equity/decisions over the span — chosen so
  the headline agrees with the plotted points; the pooled figure is
  derivable from the same data if ever preferred.
- Ticket 10's importer: imported matches appear here automatically iff
  their config says `mode: 'computer'` and White is the user. If the
  importer lands a dedicated marker (e.g. the user's side), extend
  `pointOf` in `src/progress/series.ts` — the rule lives in one place.
- Matches are plotted at equal horizontal spacing in time order (an
  ordinal axis with date ticks), not time-scaled — several matches a day
  stay readable and gaps don't stretch the line.
- A zero-decision analyzed match contributes nothing rather than a
  perfect-looking 0.0 — no decisions is no evidence.
