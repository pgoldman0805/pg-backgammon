# Relay-only backend for remote play

The app was browser-only with no backend. Remote play (two people, two devices, one match, joined by a link) needs something both browsers can reach, so the deployment gains one: a Cloudflare Worker plus one SQLite-backed Durable Object **room** per remote match, speaking WebSocket with hibernation. The room runs the same `src/rules` and `src/play/reduce.ts` as the client, owns the dice (seeded from `crypto.getRandomValues`, never revealed), validates that the sender is the actor, and broadcasts each accepted action with the dice it consumed. It keeps only the live room record, which expires (seven days after the last action, 24 hours after the match ends).

The boundary: no accounts, no names, no server-side user data beyond the ephemeral room. The invite link (`/play/<roomId>`) is the only credential to get a seat. A seat is proven by a token held in device storage, or carried in a private link's `#seat=` fragment, which browsers never send to the server. If this backend ever grows a users table, it has failed. Everything personal (finished matches, analysis, progress) stays in the device's IndexedDB, and each player stores their own copy of the match.

Alternatives rejected:

- WebRTC peer to peer with a signaling server: still needs a server, adds NAT failures on mobile, needs both players online to recover state, and makes fair dice a commit-and-reveal protocol.
- A third-party realtime service (Firebase, Supabase, PartyKit): adds an account, a dependency and a trust boundary for nothing a Durable Object does not provide.
- A shared dice seed with lockstep clients: anyone with devtools can read every future roll.
- A dumb relay without validation: a modified client could act out of turn and the two boards would diverge, while validation costs one call into the shared reducer.

## Consequences

- The deployment now has a server to operate: `worker/` (Worker entry, Durable Object, pure `roomCore`), and `wrangler.jsonc` with `main`, the Durable Object binding and a `new_sqlite_classes` migration. The Cloudflare Vite plugin writes a `.wrangler/deploy/config.json` redirect to the built config, so `wrangler deploy` must not be run with an explicit `-c wrangler.jsonc`: the raw config's `assets.directory` points at the whole `dist/`.
- The deployment is designed to stay on the Workers Free plan, where exceeding a daily limit makes operations fail rather than bill. The rules that keep it there: one storage write per accepted action (never on hello, resync, presence or rejected actions); alarms only at room creation, at match end and from the alarm handler itself; no client heartbeats beyond free protocol pings; WebSocket hibernation so an idle room costs no duration. The binding limit is SQLite rows written (100,000 per day): a 7-point match is about 1,800 writes, so roughly 55 full matches per day across all players. Everything else has two or more orders of magnitude of headroom. A failed write is answered to the sender as `busy` and nothing is broadcast, so both sides stay consistent.
- Remote v1 is match play only (1 to 25 points). A money session never reaches `match-over` and the rules have no action that ends one, so a remote one would never finish, expire or count for Progress. An end-of-session action agreed by both players is the follow-up that would unlock it.
- The Capacitor Android shell does not support remote play: its WebView origin is `https://localhost`, so relative API and WebSocket URLs point nowhere. It would need a build-time API base URL and app links.
- Room creation is an unauthenticated endpoint. After the first deploy, add a Cloudflare rate limiting rule on `POST /api/rooms`.
- ADR-0001 (GPL) is unaffected: the server code is part of the same GPL program. ADR-0003 (PWA primary) is unaffected: remote play is reached through the same hosted bundle.
