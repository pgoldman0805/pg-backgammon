# pg-backgammon

A personal, browser-first backgammon training platform with one relay-only backend for remote play (ADR-0004): play vs computer at five difficulties or a remote match with a friend, post-game and live (Tutor mode) analysis, and practice puzzles. TypeScript + React + Vite SPA, a Cloudflare Durable Object room relay for remote play only; no accounts, IndexedDB persistence, GPL-3.0. See `GLOSSARY.md` for domain vocabulary and `docs/adr/` for load-bearing decisions.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
