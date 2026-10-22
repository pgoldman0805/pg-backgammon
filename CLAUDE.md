# pg-backgammon

A personal, browser-only backgammon training platform: play vs computer at five difficulties, post-game and live (Tutor mode) analysis, and practice puzzles. TypeScript + React + Vite SPA, no backend, IndexedDB persistence, GPL-3.0. See `GLOSSARY.md` for domain vocabulary and `docs/adr/` for load-bearing decisions.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
