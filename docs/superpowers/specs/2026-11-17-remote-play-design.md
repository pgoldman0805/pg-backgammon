# Remote play: two people, one game URL

Design for letting two people play a match against each other from two devices, with no accounts. One player creates a game and sends the other a link; opening the link joins the game.

Status: design, approved approach, awaiting plan.
Date: 2026-11-17

## Intent

The app is a personal training platform built around play vs the engine. The owner wants to also play friends remotely, inside the same app, with the same board, rules, record and post-game analysis, and with the lowest possible friction: no sign-up, no install for the friend beyond opening a URL.

Success looks like: create a game, share a link, both play a full match on phones or laptops, each side gets the finished match in their own Analyze area as if they had played it locally.

## Goals

- Two players, two devices, one match, driven by the existing rules engine and play store.
- Joining is opening a URL. No accounts, passwords, emails or display names.
- Fair dice neither player can predict.
- A reload, a dropped connection, or closing the tab for an hour does not lose the match; reopening the link resumes it.
- A finished remote match is stored locally for both players and analyzed like any other match. It counts toward the local player's Progress stats.
- The server keeps nothing about a person: no identity, no history, only the live state of a room while it exists.

## Non-goals (v1)

- Spectators, chat, nicknames, clocks or time controls, rankings, matchmaking, rematch buttons, invitations by email.
- Tutor mode, hints, takeback and race autopilot during a remote match (they are already gated to vs-computer play and stay so).
- Automatic forfeit when an opponent disappears. Resigning is the only way a match ends early.
- Moving a seat to another device without the private link described below.
- Playing offline. The PWA shell still loads offline; a remote match needs the network.
- Money sessions. A money session never reaches `match-over` (it has no target), the rules have no action that ends one, and the only local way out is starting something else. A remote money session would therefore never produce a finished row, never expire on the "24 hours after the end" rule, and never count for Progress. Remote v1 is match play only (1 to 25 points). Adding an `end-session` action agreed by both players is the follow-up that would unlock it.
- The Capacitor Android shell (ADR-0003). Its WebView origin is `https://localhost`, so relative API and WebSocket URLs point nowhere. Remote play is a hosted-PWA feature; ADR-0004 records this, and the Android project needs a build-time API base URL and app links if that ever changes.

## Anti-goals

- A backend that stores user data beyond the ephemeral room. If this design grows a users table, it has failed.
- A second rules implementation on the server. The server runs the same `src/rules` and the same reducer the client does.
- Weakening the vs-computer experience. Nothing here changes how a solo match plays.

## Constraints and conflicts with existing decisions

- The spec (`.scratch/backgammon-platform/spec.md`) lists "online play, accounts, backend" as out of scope, and story 38 says "no backend". `CLAUDE.md` and `GLOSSARY.md` repeat "no backend" and "single player". This design deliberately reopens that. It needs **ADR-0004** recording the decision and its boundary: a relay-only backend, no accounts, no persistent user data. The spec's out-of-scope list and CLAUDE.md's first paragraph are updated in the same change.
- ADR-0001 (gnubg, GPL) is unaffected. The server code is part of the same GPL program.
- ADR-0003 (PWA primary) is unaffected. Remote play is reached through the same hosted bundle. The service worker's SPA fallback already serves deep links.
- Hosting is already a Cloudflare Worker serving static assets (`wrangler.jsonc`), built with the Cloudflare Vite plugin. The server side of this design lives in that same Worker.
- Cost: SQLite-backed Durable Objects are available on the Workers Free plan (checked against the Cloudflare pricing page, 2026-11-17): 100,000 requests per day, where each WebSocket message counts as a request, and 13,000 GB-seconds per day of active duration. With WebSocket hibernation a room costs duration only while handling a message. A handful of friends playing is far inside these limits; exceeding them makes further operations fail for the day rather than bill. The key-value backend is not available on Free, so the migration must declare `new_sqlite_classes`.

## Cost analysis: staying on the Workers Free plan

Figures below are from the Cloudflare pricing and limits pages as of 2026-11-17. Free plan limits are daily, reset at 00:00 UTC, and when exceeded the operation fails rather than bills. Nothing in this design can produce a charge unless the account is upgraded.

### What the Free plan allows

| Resource | Free plan limit | Counts toward it |
| --- | --- | --- |
| Worker requests | 100,000 / day | `/api/*` HTTP calls and WebSocket upgrades. Static asset requests are free and unlimited. |
| Durable Object requests | 100,000 / day | HTTP calls to the object, WebSocket upgrades, alarm runs, and incoming WebSocket messages at 20:1 (20 messages = 1 request). Outgoing messages and protocol pings are free. |
| Durable Object duration | 13,000 GB-s / day | Wall-clock time the object is active and not eligible to hibernate, at 128 MB per object. |
| SQLite rows written | 100,000 / day | Every `put`, `delete` and `setAlarm`. |
| SQLite rows read | 5,000,000 / day | Every `get`. |
| SQLite stored data | 5 GB total | Live room records. |
| Worker CPU | 10 ms per invocation | The reducer runs well under 1 ms; the engine never loads server side. |

### What one match costs

Assumptions: a 7-point match of about 8 games, 50 turns per game, and about 4.3 inbound messages per turn (roll, two or three movements, commit), plus occasional undo, cube and resignation traffic. Call it 1,800 inbound messages per match.

| Resource | Per match | Matches per day before the limit binds |
| --- | --- | --- |
| Worker requests | about 15 (create, join, summary, a dozen WebSocket upgrades across reconnects) | about 6,500 |
| Durable Object requests | 1,800 / 20 + 15, about 105 | about 950 |
| Durable Object duration | 1,800 handlers at roughly 5 ms each, about 9 s active, about 1.2 GB-s | about 10,000 |
| SQLite rows written | one `put` per accepted action, about 1,800 | about 55 |
| SQLite rows read | one `get` per wake from hibernation, well under 100 | effectively unlimited |
| Stored data | one room record, 20 to 50 KB, deleted at expiry | about 100,000 live rooms |

The binding constraint is rows written: roughly 55 full 7-point matches per day across all players. A personal deployment with a handful of friends plays a few matches a day at most, which is under 10 percent of that limit. Everything else has two or more orders of magnitude of headroom.

### Design rules that keep it there

- Use the WebSocket Hibernation API (`ctx.acceptWebSocket`) so an idle room is not billed duration between moves. Serve keepalive pings through `setWebSocketAutoResponse`, which costs nothing.
- One storage write per accepted action: the whole room record in one `put`. Never write on `hello`, `resync`, presence changes or rejected actions.
- Keep the room record in memory after the first `get` and reread only on wake from hibernation.
- Set the expiry alarm on room creation, on match end, and from the alarm handler itself (rescheduling when the room is still active). Never per action, since each `setAlarm` is a row written.
- `deleteAll` at expiry so stored data stays bounded by live rooms.
- No heartbeat messages from the client beyond protocol pings. Presence comes from socket open and close events.
- If a storage write fails (including the daily limit), the room does not broadcast the action and tells the sender `busy`; the client shows "The game service is busy, try again shortly" and the match state stays consistent on both sides.

### Watching usage

The Cloudflare dashboard's Durable Objects page shows requests, duration and SQLite rows per day. If the owner ever wants a hard guarantee beyond "Free fails rather than bills", staying on the Free plan is that guarantee; a Durable Objects spending limit only applies to the Paid plan.

## Approaches considered

### Transport

1. **Cloudflare Worker + one Durable Object per room, over WebSocket. Chosen.**
   The room is the single ordering authority and the dice source. Reconnection is trivial because the room holds the state. It runs where the app is already deployed, in the same repo and language, and the pure rules module runs unmodified in it. Cost: the repo gains a server, with its own tests and a wrangler config that does more than serve files.
2. WebRTC peer to peer with a minimal signaling server.
   Still needs a server (signaling), adds NAT traversal failures on mobile networks, needs both players online at the same moment to recover state, and makes fair dice a commit-and-reveal protocol. Rejected: more work and less reliable for no reduction in infrastructure.
3. A third-party realtime service (Firebase, Supabase, PartyKit).
   Adds an account, a dependency and a trust boundary for nothing the Durable Object does not already provide, and PartyKit runs on Cloudflare anyway. Rejected.

### Dice

1. **Server rolls. Chosen.** The room owns a `DiceSource` seeded from `crypto.getRandomValues` and never reveals the seed. Each broadcast action carries the dice it consumed.
2. Shared seed. Both clients would run `createSeededDice(seed)` and stay in lockstep with zero protocol changes, but anyone with the seed (anyone who opens devtools) can read every future roll. Rejected.
3. Commit-and-reveal between peers. Fair without a server, but the server exists anyway. Rejected as needless complexity.

### Ordering and authority

1. **Server-ordered, server-validated. Chosen.** A client sends an intent; the room applies it to its own `MatchState` with the shared reducer, rejects it if the sender is not the actor or the rules refuse it, and otherwise broadcasts the applied action with a sequence number. Clients apply only what the room broadcasts. One round trip per action (tens of milliseconds on a normal connection; the existing checker travel animation starts when the echo lands, so the delay reads as part of the animation).
2. Optimistic local apply for the local player's own dice-free actions, with rollback on rejection. Smoother on a bad connection, but introduces rollback states the UI never had to render. Not for v1; noted as the upgrade path if lag proves irritating.
3. A dumb relay with no validation. Smallest server, but a modified client could act out of turn and both clients would diverge. Rejected: validation costs one function call since the rules are shared.

## The design

### Vocabulary (to add to GLOSSARY.md)

- **Remote match**: a match between two people on two devices, relayed through a room. Mode `remote`, beside `computer` and `hotseat`.
- **Room**: the server-side home of one remote match: its configuration, two seats, the live match state and the dice. Identified by an unguessable id that is the whole of the invite link. Rooms expire.
- **Seat**: one of the two sides of a room (White or Black), held by whoever claimed it. Proof of holding a seat is a seat token the device keeps privately.
- **Invite link**: the URL `/play/<roomId>`. Anyone opening it while a seat is free takes that seat.
- **Private link**: the invite link plus `#seat=<token>`. A player's own bookmark for moving their seat to another device. Never shared.

### Lifecycle, as the players see it

1. On the Play setup card a third start button, "Play a friend online", sits beside "Play vs computer" and "Hot-seat match". It uses the current match length picker. Difficulty does not apply, and the button is disabled with a short hint while the money-session game type is selected (see Non-goals).
2. Pressing it creates a room. The creator takes the White seat and lands on `/play/<roomId>`. The board shows the start position, inert, with a waiting panel: the invite link, a Copy button, and a Share button where the Web Share API exists.
3. The friend opens the link. They see the match configuration ("7-point match") and a Join button. Joining takes the Black seat. The room starts the match at that moment: the opening roll happens on the server and both boards come alive. A third visitor sees "This game already has two players" and nothing else.
4. Play proceeds through the existing board, HUD and dialogs. Each player can act only when the decision is theirs. On the opponent's turn the board is inert and the HUD shows whose decision it is, as it does today for the engine's turn, without the "thinking" treatment.
5. Every action is visible live on both boards: individual checker movements, undo, commit, roll, cube offers and answers, resignation offers and answers, next game.
6. Both devices persist the match locally as they go, mode `remote`, exactly like hot-seat and vs-computer matches. When the match ends, both have it finished in storage; the existing background analysis analyzes it; the Analyze area reviews it; Progress counts the local player's side.
7. Closing the tab, losing signal, or reloading at any point is harmless. Reopening the link, or the Play area's "A match is waiting" prompt, reconnects to the room and resumes from the room's state.
8. The room expires seven days after its last action, or 24 hours after the match ends. After that the link shows "This game has ended" and the local copy remains for review. Expiry timings are the builder's to tune.
9. If a match was still in progress when its room expired, the local row stays `in-progress` (it is never marked finished without a winner, so it is not analyzed as a result and does not count for Progress). The Play area's resume prompt shows it as "ended online" with Review and Discard instead of Resume, and the Analyze area lists it as in progress, exactly as an abandoned local match is listed today.

### Server: the Worker and the room

Files: a new `worker/` directory at the repo root (`worker/index.ts` the Worker entry, `worker/room.ts` the Durable Object class, `worker/roomCore.ts` the pure room logic), with its own `tsconfig.worker.json` referenced from the root `tsconfig.json`. The Worker imports `src/rules`, the extracted reducer (below) and `src/remote/protocol.ts`; nothing from React or the browser.

`wrangler.jsonc` gains `main`, a Durable Object binding with a SQLite-backed migration (`new_sqlite_classes`), and `assets.run_worker_first: ["/api/*"]` so API and WebSocket paths reach the Worker instead of the SPA fallback.

HTTP API, all under `/api/rooms`:

- `POST /api/rooms` with the match config. Creates the room, claims White. Returns `{ roomId, side: 'white', seatToken }`.
- `GET /api/rooms/:id`. Public room summary: config, which seats are taken, status (`waiting`, `playing`, `finished`, `expired`). No tokens, no state.
- `POST /api/rooms/:id/join`. Claims Black if free. Returns `{ side: 'black', seatToken }`, or 409 when full.
- `GET /api/rooms/:id/ws` upgrades to a WebSocket. The first client message is `hello` carrying the seat token. An unknown token is closed with a code the client shows as "This game already has two players."

Room ids are 20 characters of base32 from `crypto.getRandomValues` (100 bits). Seat tokens are 128-bit random, hex. The id is the capability; tokens never appear in a shared URL (only in the private link's fragment, which browsers do not send to the server).

The Durable Object uses the WebSocket Hibernation API, so an idle room costs nothing while two players think. It stores in its SQLite storage: config, seats (side, token hash or token), `seq`, the current `MatchState`, status, `lastActivity`, and the dice PRNG state. It sets an alarm for expiry on every write.

`roomCore.ts` is pure: given room state and an inbound message from a seat, return the new room state and the messages to send. The Durable Object class is a thin shell around it (storage, sockets, alarms). This mirrors `src/play/controllerCore.ts` and keeps the room testable in plain Vitest.

Room behaviour:

- The match starts when the second seat is claimed: the room applies `start` with its own dice and broadcasts the result.
- On any inbound action the room determines the current actor (turn: the turn's player; pre-roll: `toRoll`; cube-offered: the opponent of `toRoll`; resign-offered: the opponent of the offerer; game-over: either seat; match-over: nobody). Non-actors are rejected. `takeback` and `tutor-assisted` are always rejected. `start` from a client is always rejected.
- Accepted actions are applied with the shared reducer, `seq` increments, and `{ seq, side, action, dice }` is broadcast to both sockets, where `dice` is the list of die values the reducer drew (empty for most actions, two for `roll`, two or more for `next-game`).
- Rejections are answered only to the sender with `{ type: 'rejected', seq, reason }`. The client treats any rejection as a desync signal and asks for a snapshot.
- `hello` is answered with `{ type: 'snapshot', seq, match, status, presence }`. The client replaces its local match with the snapshot. Always snapshotting on connect keeps reconnection to one message and needs no action log on the server.
- `resync` requests are answered with the same snapshot.
- Presence: when a socket opens or closes the room broadcasts `{ type: 'presence', white: boolean, black: boolean }`.
- Rate limiting and abuse: room creation is an unauthenticated endpoint. v1 accepts this for a personal deployment behind an obscure hostname; the builder should put a Cloudflare rate limiting rule on `POST /api/rooms` if one is available on the plan, and the Durable Object caps room count only by expiry.

### Shared reducer

`src/play/store.ts` holds the reducer inline inside `createPlayStore`. Extract it to a pure `reduceMatch(match: MatchState | null, action: PlayAction, dice: DiceSource): MatchState | null` (returning null for an illegal action, as the store does today) in a new `src/play/reduce.ts`. `createPlayStore` calls it. The room calls it. There is one legality path. `currentActor` moves alongside it and is exported, since the room needs it too.

### Protocol

`src/remote/protocol.ts` defines the message types above, shared by client and worker. Versioned with a single integer; a mismatch closes the socket with a "please reload" code. JSON over WebSocket.

### Client: the remote session

`src/remote/session.ts` exports `createRemoteSession(options)` returning an object that satisfies `PlayStore` (`getState`, `dispatch`, `subscribe`) plus a connection observable, so the Play page and every existing controller (autoplay, persistence, auto-analysis) use it unchanged.

- It owns an inner `createPlayStore` built with a queue `DiceSource`: `rollDie()` shifts from a queue filled from each broadcast's `dice`. If the queue underflows or `reduceMatch` returns null for a broadcast action, the session requests a snapshot.
- `dispatch(action)` on the local side's decision sends an intent to the room and applies nothing locally. On someone else's decision it is ignored (the UI should never offer it, but the store's existing "ignore illegal" contract covers it).
- On `snapshot` it replaces the inner store's match. The inner `PlayStore` needs a `replace(match)` capability for this; add it to `createPlayStore` as an option-gated method rather than widening the public `PlayStore` interface the UI sees.
- Connection state: `{ status: 'connecting' | 'open' | 'reconnecting' | 'closed', roomStatus, opponentPresent, error }`. Reconnects with exponential backoff (cap at 30 seconds), resuming with `hello`. Reconnects on `online` and `visibilitychange` events too, because phones drop sockets in the background.
- Transport is injectable (`WebSocket` by default) so tests run two sessions against an in-memory fake wired to `roomCore` directly: a full loopback match with no network.

`src/remote/seats.ts`: read and write the seat token under `localStorage` key `pg-backgammon.room.<roomId>`; on page load, if the URL has `#seat=<token>`, store it and strip the fragment with `history.replaceState`.

`src/remote/api.ts`: the three HTTP calls.

### Play page changes

`src/pages/Play.tsx` currently encodes "the human is White unless hot-seat" in `humanSide`, the autoplay players list, the auto-roll pre-roll effect, the engine opponent effect and board interactivity. Introduce one derived value, `localSides: readonly Player[]` (`['white']` vs computer, `['white','black']` hot-seat, `[localSide]` remote), and route every one of those decisions through it. Specifically:

- `humanSide(player)` becomes `localSides.includes(player)`.
- Autoplay `players` is `localSides`.
- The "roll yourself when you cannot double" effect fires only when `match.toRoll` is in `localSides`. In a remote match the resulting `roll` goes through the session to the room; the opponent's auto-roll happens on their device, never on both.
- Board `interactive` is true only when the decision is the local side's and the connection is open.
- The engine opponent, tutor and race autopilot effects stay gated to `mode === 'computer'`, unchanged. The engine still initializes on the page (for post-game analysis).
- `PlayMode` gains `'remote'`. `PlaySetup` is unchanged. The remote mode is entered from the route, not the setup card's state.

The page needs a `RemotePanel` (new, `src/pages/play/RemotePanel.tsx`) rendered in place of the setup card for the waiting, joining, full and expired states, and a compact connection line in the HUD during play ("Opponent disconnected", "Reconnecting…"). Copy is the builder's. Dialogs for cube and resignation already exist and already address "the opponent"; they work unchanged because the actor logic is the store's.

### Board perspective

`src/play/Board.tsx` and `src/play/geometry.ts` draw White moving 24 to 1 with White's home bottom right. A Black player should see their own home bottom right. Add a `perspective: Player` prop (default `'white'`) that rotates the layout 180 degrees: point `p` renders where `25 - p` renders today, and the bar and off trays swap sides accordingly. Drag, selection and travel animation go through the same geometry so they follow. Hot-seat keeps the White perspective (it is one device). Tests: a geometry round-trip property (position of `p` under black equals position of `25 - p` under white) and a render test that the Black home points land bottom right.

### Routing

`src/App.tsx` gains `/play/:roomId`, rendering `Play` with a `roomId` prop. `/` is unchanged. On the room route the page:

1. Reads the seat token for this room (storage or fragment).
2. With a token: opens the session, which connects and snapshots.
3. Without a token: fetches the room summary. `waiting` shows the Join button; `playing` or `finished` with both seats taken shows "already has two players"; `expired` or 404 shows "This game has ended."

The creator's flow is `POST /api/rooms`, store the token, `navigate('/play/<roomId>')`.

### Persistence and Progress

`MatchConfig.mode` gains `'remote'`, and remote rows carry `roomId: string` and `localSide: Player`. `persistence.begin` is called when the session first receives a snapshot for a room with no stored row; a stored row for the same `roomId` is adopted instead (identity by `roomId`, found by scanning `list()` once, which is already how resume works).

The Play area's resume prompt for a `remote` row navigates to `/play/<roomId>` instead of restoring from the local snapshot, because the room is the authority. If the room has since expired, the row stays in progress and is offered for review or discard (lifecycle step 9).

**The user's side.** Three places today encode "the user is White in a vs-computer match, and nobody in particular otherwise": `src/progress/series.ts` (counts `mode === 'computer'` only), `src/puzzles/blunderMining.ts` (a `HUMAN = 'white'` constant and the same mode gate) and the review wording in `src/pages/analyze` ("your decisions"). Add one helper in `src/storage`, `userSide(config: MatchConfig): Player | null`, returning White for `computer`, `config.localSide` for `remote`, and null for `hotseat` and `imported`, and route all three through it. Progress then counts remote matches for the local side, blunder mining mines the local side's blunders (the puzzle model already carries a `hero: Player`, and the Puzzles page already names the hero, so Black-hero puzzles need no new presentation), and the review grades the local side. `storedMatchName` and `matchName` learn the remote wording ("7-point match online").

### Documentation changes

- `docs/adr/0004-relay-only-backend-for-remote-play.md`: the decision, the boundary (no accounts, no user data, room state only, expiring), the alternatives above, and the consequence that the deployment now has a server to operate.
- `GLOSSARY.md`: the five terms above; the "Single player" line in the intro becomes accurate.
- `CLAUDE.md`: first paragraph no longer says "no backend"; says "a relay-only backend for remote play (ADR-0004)".
- `.scratch/backgammon-platform/spec.md`: move online play out of the out-of-scope list and add stories for create, join, play, resume, review.

### Testing

- `roomCore`: plain Vitest. Seat claiming, start on second seat, actor enforcement, rejection of takeback and start, dice attached to roll and next-game, snapshot contents, expiry decisions.
- Shared reducer: the existing `store.test.ts` keeps passing; a few direct `reduceMatch` tests.
- Remote session: two sessions and one `roomCore` wired through an in-memory transport play a scripted full game; reconnection mid-game replaces state from a snapshot; a rejection triggers a resync; the dice queue underflow triggers a resync.
- Play page: component tests with an injected session and fake transport, covering waiting, join, inert board on the opponent's turn, auto-roll only for the local side, Black perspective.
- Geometry: the perspective property test.
- Progress and mining: a remote match with `localSide: 'black'` contributes Black's numbers and mines Black's blunders as Black-hero puzzles.
- Expired room: a remote row left in progress is never marked finished; the resume prompt offers Review and Discard.
- Durable Object shell: one test through `@cloudflare/vitest-pool-workers` (new dev dependency) that creates a room, joins, and exchanges one action over a real WebSocket in workerd. If the pool proves awkward with the existing jsdom Vitest config, split it into its own Vitest project.
- End to end: a new Playwright project `remote` that opens two browser contexts, creates a room in one, joins from the other, plays a 1-point match to the end, and checks both Analyze areas. It needs the Worker running: the Cloudflare Vite plugin's `vite preview` should serve the Worker and Durable Object; if not, this project's `webServer` runs `wrangler dev` instead. The builder verifies which.

### Suggested build order

1. Extract the reducer; no behaviour change.
2. Protocol types and `roomCore` with tests.
3. Worker entry, Durable Object shell, wrangler config; manual check with `wrangler dev`.
4. Remote session with the in-memory transport and loopback tests.
5. Board perspective.
6. Play page `localSides` generalization (hot-seat and vs-computer tests stay green).
7. Route, create, join, waiting and full states.
8. Persistence, resume via room, Progress marker, names.
9. Connection states, reconnection, expiry UI.
10. ADR, glossary, CLAUDE.md, spec.
11. Two-context Playwright run.

## Left to the builder

- All user-facing copy and the visual design of the waiting panel, join screen and connection line, within the existing board styles and HUD.
- Expiry durations, backoff constants, room id alphabet.
- Whether seat tokens are stored hashed in the room.
- The exact `tsconfig` arrangement for sharing `src/rules`, `src/play/reduce.ts` and `src/remote/protocol.ts` with `worker/` under `tsc -b`.
- Whether the Durable Object test lives in the main Vitest run or a separate project.
- How the audit screenshot harness gains a remote-play frame, if at all.

## Calls made in this document without asking

- The creator is White and the joiner is Black. The opening roll still decides who moves first.
- The match starts automatically when the second seat is claimed; there is no separate "ready" step.
- Both players may press "Next game"; the second press is rejected harmlessly.
- Remote matches count toward Progress for the local side.
- Nicknames are out. The link is shared person to person, so both know who they are playing.
- A private link with the seat token in the fragment exists so a player can move devices; it is shown once in the waiting panel as "your private link" and under a HUD menu during play.
- Snapshot on every connect rather than an action log on the server.
- Remote v1 is match play only; money sessions wait for an agreed end-of-session action (raised by the builder check; see Non-goals).
- An expired room never turns the local row into a finished result (builder check).
- Remote play is not supported in the Capacitor shell (builder check, consistent with ADR-0003).
