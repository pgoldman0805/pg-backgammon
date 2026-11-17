# Remote Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two people on two devices play a match through the existing board, relayed by a Durable Object room reached through a single game URL, with no accounts.

**Architecture:** The play store's reducer is extracted so the same pure function runs on the client and in a Cloudflare Durable Object. The room owns the dice, validates every action against the rules and the current actor, and broadcasts applied actions with the dice they drew; clients apply only what the room broadcasts. A `RemoteSession` satisfies the existing `PlayStore` interface so the Play page, autoplay, persistence and auto-analysis work unchanged, and one `localSides` value generalizes "the human is White".

**Tech Stack:** TypeScript, React 19, Vite 8 with `@cloudflare/vite-plugin` (already installed), Cloudflare Workers + Durable Objects (SQLite backend, WebSocket Hibernation API), Vitest (jsdom) plus `@cloudflare/vitest-pool-workers` for the Durable Object shell, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-remote-play-design.md`

## Global Constraints

- Stay on the Workers Free plan: SQLite-backed Durable Object class only (`new_sqlite_classes`), WebSocket Hibernation API, one storage `put` per accepted action, `setAlarm` only at creation, match end and from the alarm handler, no client heartbeats beyond protocol pings, `deleteAll` at expiry. (Spec: Cost analysis.)
- Remote v1 is match play only, lengths 1 to 25. Money sessions are not offered remotely.
- No accounts, no names, no server-side user data beyond the live room record. Seat tokens never appear in a shared URL.
- The server runs `src/rules` and `src/play/reduce.ts` unmodified. No second rules implementation.
- `takeback`, `tutor-assisted` and client-sent `start` are always rejected by the room.
- Tutor mode, hints, takeback and race autopilot stay gated to `mode === 'computer'`.
- Room ids: 20 characters, base32 alphabet `abcdefghijklmnopqrstuvwxyz234567`, from `crypto.getRandomValues`. Seat tokens: 32 hex characters (128 bits).
- Expiry: 7 days after last activity while waiting or playing, 24 hours after match end. Constants `ROOM_TTL_MS`, `FINISHED_TTL_MS`.
- Protocol version 1. Close codes: 4001 bad token, 4002 version mismatch, 4003 room expired, 4004 room full.
- Follow repo conventions: Biome formatting (`npm run lint`), one `.test.ts` beside each module, module header comment explaining the responsibility, GLOSSARY terms (Remote match, Room, Seat, Invite link, Private link).
- Commit after every task with the attribution line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. Both players press "Next game" within the same second. The second press must be rejected quietly and both boards must show the new game identically. (Task 2 test `rejects a second next-game`, Task 3 test `a rejection triggers one resync and no visible error`.)
2. A player reloads with uncommitted movements in their turn. The snapshot must restore the half-played turn, not reset it. (Task 3 test `snapshot restores an in-progress turn with movements`.)
3. A device with auto-roll set to "always" must never roll for the opponent, even though the hot-seat autoplay controller drives both sides today. (Task 8 test `auto-roll never fires for the remote opponent's pre-roll`.)
4. A phone backgrounds the tab and the socket dies silently. Returning to the tab must reconnect at once and resync from a snapshot. (Task 12 test `reconnects immediately on visibilitychange`.)
5. A third device opens the invite link during play, or a device returns after the room expired. Both must land on a calm message, never a blank board or a crash. (Task 9 test `a full room shows "already has two players"`, Task 11 test `an expired room offers Review and Discard`.)

---

### Task 1: Extract the shared reducer

**Files:**
- Create: `src/play/reduce.ts`
- Create: `src/play/reduce.test.ts`
- Modify: `src/play/store.ts` (the `reduce` closure, `currentActor`, the `PlayAction` type)

**Interfaces:**
- Produces:
  - `export type PlayAction` (moved from `store.ts`; `store.ts` re-exports it so existing imports compile).
  - `export function reduceMatch(match: MatchState | null, action: PlayAction, dice: DiceSource): MatchState | null` in `reduce.ts`. Returns null for any illegal action, exactly as the store's inline `reduce` does today (catching rules-engine throws).
  - `export function currentActor(match: MatchState): Player | null` (moved, same semantics: turn player or `toRoll`, else null).
  - `export function decisionOwner(match: MatchState): Player | 'either' | null`: `turn` → turn player; `pre-roll` → `toRoll`; `cube-offered` → `opponent(toRoll)`; `resign-offered` → `opponent(pendingResignation.by)`; `game-over` → `'either'`; `match-over` → null.
  - `createPlayStore` additionally exposes a sibling factory `export function createReplaceablePlayStore(options?: PlayStoreOptions): PlayStore & { replace(match: MatchState | null): void }`. `createPlayStore` keeps its current signature and is implemented by calling the replaceable one and dropping `replace`.

- [ ] **Step 1: Write the failing tests in `src/play/reduce.test.ts`**

```ts
import { createMatch, createGame, createBoard } from '../rules';
import { scriptedDice } from '../test/dice';
import { decisionOwner, reduceMatch } from './reduce';

it('starts a match from null with the opening roll from the dice', () => {
  const match = reduceMatch(null, { type: 'start', length: 5 }, scriptedDice(6, 3));
  expect(match?.length).toBe(5);
  expect(match?.game.turn?.roll).toEqual([6, 3]);
});
it('returns null for an illegal action instead of throwing', () => {
  const match = reduceMatch(null, { type: 'start' }, scriptedDice(6, 3));
  expect(reduceMatch(match, { type: 'take' }, scriptedDice())).toBeNull();
});
it('returns null for any action before start', () => {
  expect(reduceMatch(null, { type: 'roll' }, scriptedDice())).toBeNull();
});
it('names the decision owner per phase', () => {
  // build matches in 'turn', 'pre-roll', 'cube-offered', 'resign-offered', 'game-over'
  // using reduceMatch from a started match; assert white/black/'either'/null as the spec table says
});
```

- [ ] **Step 2: Run `npx vitest run src/play/reduce.test.ts`; expect FAIL: module not found**

- [ ] **Step 3: Create `src/play/reduce.ts`** by moving the `PlayAction` union, `currentActor`, and the body of the store's `reduce` into `reduceMatch(match, action, dice)`. Add `decisionOwner`. Keep `forcedPlay` import from `./selectors`.

- [ ] **Step 4: Rewire `src/play/store.ts`**: import `reduceMatch` and `PlayAction` from `./reduce`, re-export `PlayAction`, implement `createReplaceablePlayStore` (adds `replace(match)` which sets state and notifies) and make `createPlayStore` delegate to it.

- [ ] **Step 5: Run `npx vitest run src/play`; expect all PASS (store, opponent, autoplay, autopilot tests unchanged)**

- [ ] **Step 6: Run `npm run lint`; expect clean. Commit: `refactor(play): extract reduceMatch and decisionOwner for the remote room`**

---

### Task 2: Protocol and the pure room core

**Files:**
- Create: `src/remote/protocol.ts`
- Create: `src/remote/roomCore.ts`
- Create: `src/remote/roomCore.test.ts`
- Modify: `src/rules/dice.ts` (add `createCryptoDice`), `src/rules/index.ts` (export it)

**Interfaces:**
- Consumes: `reduceMatch`, `decisionOwner`, `PlayAction` from Task 1.
- Produces, in `protocol.ts`:

```ts
export const PROTOCOL_VERSION = 1;
export type Side = Player;
export interface RoomConfig { readonly length: number; }
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'expired';
export interface Presence { readonly white: boolean; readonly black: boolean; }
export type RejectReason = 'not-your-turn' | 'illegal' | 'not-allowed' | 'not-playing' | 'busy';
export type ClientMessage =
  | { type: 'hello'; version: number }
  | { type: 'act'; action: PlayAction }
  | { type: 'resync' };
export type ServerMessage =
  | { type: 'snapshot'; seq: number; match: MatchState | null; status: RoomStatus; presence: Presence }
  | { type: 'applied'; seq: number; side: Side; action: PlayAction; dice: readonly Die[] }
  | { type: 'rejected'; seq: number; reason: RejectReason }
  | { type: 'presence'; presence: Presence };
export interface RoomSummary { readonly roomId: string; readonly config: RoomConfig; readonly status: RoomStatus; readonly seats: Presence; }
export interface CreateRoomResponse { readonly roomId: string; readonly side: 'white'; readonly seatToken: string; }
export interface JoinRoomResponse { readonly side: 'black'; readonly seatToken: string; }
export const CLOSE_BAD_TOKEN = 4001, CLOSE_VERSION = 4002, CLOSE_EXPIRED = 4003, CLOSE_FULL = 4004;
export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const FINISHED_TTL_MS = 24 * 60 * 60 * 1000;
```

  The seat token travels in the WebSocket URL query (`?seat=`), not in `hello`, so the host maps socket to side before any message is parsed.

- Produces, in `roomCore.ts` (pure, no I/O):

```ts
export interface Seat { readonly side: Side; readonly token: string; }
export interface RoomState {
  readonly roomId: string; readonly config: RoomConfig; readonly seats: readonly Seat[];
  readonly seq: number; readonly match: MatchState | null; readonly status: RoomStatus;
  readonly lastActivity: number; readonly finishedAt: number | null;
}
export type RoomEffect =
  | { type: 'send'; to: Side; message: ServerMessage }
  | { type: 'broadcast'; message: ServerMessage };
export interface RoomStep { readonly room: RoomState; readonly effects: readonly RoomEffect[]; readonly changed: boolean; }
export function createRoom(roomId: string, config: RoomConfig, whiteToken: string, now: number): RoomState;
export function joinRoom(room: RoomState, blackToken: string, dice: DiceSource, now: number): RoomStep | { readonly error: 'full' | 'expired' };
export function seatForToken(room: RoomState, token: string): Side | null;
export function handleMessage(room: RoomState, from: Side, message: ClientMessage, dice: DiceSource, now: number, presence: Presence): RoomStep;
export function summarize(room: RoomState): RoomSummary;
export function expiryAt(room: RoomState): number;
export function isExpired(room: RoomState, now: number): boolean;
export function recordingDice(source: DiceSource): { readonly dice: DiceSource; readonly drawn: Die[] };
```

  `changed` is true only when the room record must be written (an accepted action, a join). `joinRoom` applies `start` with the room's dice, sets status `playing`, seq 1, and broadcasts a `snapshot`. `handleMessage` for `act`: rejects `start`, `takeback`, `tutor-assisted` with `not-allowed`; rejects when status is not `playing` with `not-playing`; rejects when `decisionOwner(match)` is neither `from` nor `'either'` with `not-your-turn`; otherwise `reduceMatch` with `recordingDice`; null → `illegal`; success → seq + 1, `broadcast applied` with `drawn`; when the new match phase is `match-over`, status `finished` and `finishedAt = now`. `hello` and `resync` → `send snapshot` to `from`, `changed: false`.

- Produces, in `dice.ts`: `export function createCryptoDice(): DiceSource` using `crypto.getRandomValues(new Uint32Array(1))` with the same rejection limit as `createSeededDice`.

- [ ] **Step 1: Write failing tests in `src/remote/roomCore.test.ts`**

```ts
it('creates a waiting room with White seated', ...)                     // status 'waiting', seats [{white}], seq 0, match null
it('joining starts the match with the room dice and snapshots both', ...) // scriptedDice(6,3): match.turn.roll [6,3], status 'playing', one broadcast snapshot seq 1, changed true
it('rejects a second join as full', ...)
it('maps tokens to seats and unknown tokens to null', ...)
it('applies the actor\'s movement and broadcasts it with no dice', ...)  // applied.dice []
it('attaches two dice to a roll', ...)                                   // pre-roll → act roll → applied.dice length 2, match.turn.roll matches
it('rejects an action from the non-actor with not-your-turn and changed false', ...)
it('rejects takeback, tutor-assisted and start with not-allowed', ...)
it('rejects an illegal movement with illegal', ...)
it('rejects a second next-game', ...)                                    // Review Focus 1: game-over, either may act; after one next-game the second returns 'illegal'
it('hello and resync answer the sender with a snapshot and change nothing', ...)
it('marks the room finished with finishedAt at match-over', ...)         // 1-point match, drive to the end with scripted dice or a prepared match via createMatch
it('expires 7 days after activity and 24 hours after finishing', ...)
it('createCryptoDice yields only 1..6', ...)                            // 1000 draws
```

- [ ] **Step 2: Run `npx vitest run src/remote/roomCore.test.ts`; expect FAIL: module not found**

- [ ] **Step 3: Write `protocol.ts`, `roomCore.ts`, and `createCryptoDice`** per the interfaces above.

- [ ] **Step 4: Run `npx vitest run src/remote src/rules`; expect PASS**

- [ ] **Step 5: Lint and commit: `feat(remote): protocol and pure room core`**

---

### Task 3: Room host, queue dice and the client session

**Files:**
- Create: `src/remote/roomHost.ts`
- Create: `src/remote/queueDice.ts`
- Create: `src/remote/session.ts`
- Create: `src/remote/testing/loopback.ts`
- Create: `src/remote/session.test.ts`
- Create: `src/remote/roomHost.test.ts`
- Create: `src/remote/index.ts` (public exports)

**Interfaces:**
- Consumes: Task 1 `createReplaceablePlayStore`, `reduceMatch`; Task 2 `roomCore`, protocol types.
- Produces, `roomHost.ts` (the I/O-free shell both the Durable Object and the loopback use):

```ts
export interface Sink { send(data: string): void; close(code: number): void; }
export interface RoomHostOptions {
  readonly room: RoomState; readonly dice: DiceSource; readonly now: () => number;
  /** Persist the record; reject to signal storage failure (busy). */
  readonly save: (room: RoomState) => Promise<void>;
}
export interface RoomHost {
  readonly room: RoomState;
  /** Attach a socket by token; returns the side or closes with CLOSE_BAD_TOKEN / CLOSE_EXPIRED. */
  attach(token: string, sink: Sink): Side | null;
  detach(sink: Sink): void;
  message(sink: Sink, raw: string): Promise<void>;
  join(blackToken: string): Promise<JoinRoomResponse | { error: 'full' | 'expired' }>;
  presence(): Presence;
}
export function createRoomHost(options: RoomHostOptions): RoomHost;
```

  `message` parses JSON, ignores malformed input, calls `handleMessage`, awaits `save` when `changed`, and on save rejection sends `{ type: 'rejected', seq, reason: 'busy' }` to the sender without applying. Effects route to all sinks of a side (a side may hold more than one socket during a reconnect overlap). Attach and detach broadcast `presence`.

- Produces, `queueDice.ts`: `export function createQueueDice(): DiceSource & { push(dice: readonly Die[]): void; pending(): number }`. `rollDie` throws `QueueDiceUnderflow` when empty.

- Produces, `session.ts`:

```ts
export interface Transport {
  send(data: string): void; close(): void;
  onOpen(cb: () => void): void; onMessage(cb: (data: string) => void): void; onClose(cb: (code: number) => void): void;
}
export type TransportFactory = (url: string) => Transport;
export interface ConnectionState {
  readonly status: 'connecting' | 'open' | 'reconnecting' | 'closed';
  readonly roomStatus: RoomStatus | null; readonly opponentPresent: boolean; readonly seq: number;
  readonly error: 'bad-token' | 'version' | 'expired' | 'busy' | null;
}
export interface RemoteSessionOptions {
  readonly roomId: string; readonly seatToken: string; readonly side: Side;
  readonly transport?: TransportFactory;            // default: WebSocket
  readonly baseUrl?: string;                        // default: location.origin, ws(s) scheme
  readonly pace?: (ms: number) => Promise<void>;    // backoff waits, injectable
  readonly backoffMs?: readonly number[];           // default [1000, 2000, 4000, 8000, 16000, 30000]
}
export interface RemoteSession extends PlayStore {
  readonly side: Side; readonly roomId: string;
  getConnection(): ConnectionState; subscribeConnection(listener: () => void): () => void;
  reconnectNow(): void; dispose(): void;
}
export function createRemoteSession(options: RemoteSessionOptions): RemoteSession;
export function socketUrl(baseUrl: string, roomId: string, seatToken: string): string; // `${ws}/api/rooms/${roomId}/ws?seat=${token}`
```

  Behaviour: on open send `hello`; `snapshot` → `replace(match)`, clear the dice queue, set seq; `applied` → if `seq !== state.seq + 1` request `resync`, else push dice, `reduceMatch` through the inner store's dispatch path, and if the inner reduce yields null (or the queue underflows) request `resync`; `rejected` → request `resync` (and surface `busy` in `error` for 5 s); `dispatch(action)` → if `decisionOwner(match)` is this side or `'either'`, send `act`, else ignore. Reconnect in Task 12; here a close sets `status: 'closed'`.

- Produces, `testing/loopback.ts`:

```ts
export interface Loopback {
  readonly host: RoomHost; readonly whiteToken: string; readonly blackToken: string;
  transport(): TransportFactory;         // connects a session to the host in memory, async delivery via queueMicrotask
  join(): Promise<void>;                 // seats Black
  flush(): Promise<void>;                // drain pending deliveries
}
export function createLoopback(config: RoomConfig, dice: DiceSource, options?: { save?: (room: RoomState) => Promise<void> }): Loopback;
```

- [ ] **Step 1: Write failing tests in `src/remote/roomHost.test.ts`**

```ts
it('attaches a known token and broadcasts presence', ...)
it('closes an unknown token with CLOSE_BAD_TOKEN', ...)
it('routes a broadcast to every socket of both sides', ...)
it('answers busy and keeps the room unchanged when save rejects', ...)   // Global Constraint: no broadcast on failed write
it('ignores malformed JSON', ...)
```

- [ ] **Step 2: Write failing tests in `src/remote/session.test.ts`** (two sessions over one loopback, `scriptedDice` for the room, `pace: () => Promise.resolve()`):

```ts
it('White sees a waiting room, then both see the opening position after Black joins', ...)
it('a movement dispatched by the actor lands on both boards in order', ...)   // compare getState().match.game.board of both sessions
it('a dispatch by the non-actor is ignored and sends nothing', ...)
it('roll dice come from the room, not the client', ...)                      // scriptedDice(6,3, 5,2): after roll both show [5,2]
it('a rejection triggers one resync and no visible error', ...)              // Review Focus 1: both press next-game at game-over
it('snapshot restores an in-progress turn with movements', ...)              // Review Focus 2: make one movement, create a third session for White, expect turn.movements length 1
it('a sequence gap requests a resync', ...)                                  // drop one applied in the transport
it('a full match drives to match-over on both sides', ...)                   // 1-point match, play "first legal movement" from both sessions using movableOrigins/destinationsFrom
```

- [ ] **Step 3: Run `npx vitest run src/remote`; expect FAIL: modules not found**

- [ ] **Step 4: Write `queueDice.ts`, `roomHost.ts`, `session.ts`, `testing/loopback.ts`, `index.ts`**

- [ ] **Step 5: Run `npx vitest run src/remote`; expect PASS**

- [ ] **Step 6: Lint and commit: `feat(remote): room host, queue dice and the client session`**

---

### Task 4: The Worker, the Durable Object and wrangler config

**Files:**
- Create: `worker/index.ts`
- Create: `worker/room.ts`
- Create: `worker/ids.ts`
- Create: `worker/room.test.ts`
- Create: `vitest.worker.config.ts`
- Create: `tsconfig.worker.json`
- Modify: `wrangler.jsonc`, `tsconfig.json` (add the reference), `package.json` (scripts `test:worker`, `types:worker`; dev deps `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types`)

**Interfaces:**
- Consumes: Task 2 `roomCore`, Task 3 `createRoomHost`, protocol types.
- Produces: HTTP and WebSocket API exactly as the spec's "Server" section:
  - `POST /api/rooms` body `{ length: number }` → 201 `CreateRoomResponse`; 400 when length is not an integer 1..25.
  - `GET /api/rooms/:id` → 200 `RoomSummary`; 404 when unknown or expired.
  - `POST /api/rooms/:id/join` → 200 `JoinRoomResponse`; 409 full; 404 unknown/expired.
  - `GET /api/rooms/:id/ws?seat=<token>` → 101 upgrade; otherwise 426.
  - `worker/ids.ts`: `export function newRoomId(): string` (20 base32 chars), `export function newSeatToken(): string` (32 hex).
  - Durable Object class `RoomObject`, binding `ROOMS`, `idFromName(roomId)`. Storage key `'room'` holds `RoomState`. Hibernation handlers `webSocketMessage`, `webSocketClose`, `webSocketError`; `ctx.acceptWebSocket(ws, [side])`; `ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))`; `alarm()` deletes the record (`deleteAll`) when `isExpired`, else reschedules to `expiryAt`.
  - An unknown room (no record) answers 404 and never creates a record.

- [ ] **Step 1: Install and configure**

```bash
npm i -D @cloudflare/vitest-pool-workers @cloudflare/workers-types
```

  `wrangler.jsonc` additions:

```jsonc
"main": "worker/index.ts",
"durable_objects": { "bindings": [{ "name": "ROOMS", "class_name": "RoomObject" }] },
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["RoomObject"] }],
"assets": { "directory": "./dist", "not_found_handling": "single-page-application", "run_worker_first": ["/api/*"] }
```

  `tsconfig.worker.json`: `include: ["worker", "src/remote/protocol.ts", "src/remote/roomCore.ts", "src/remote/roomHost.ts", "src/play/reduce.ts", "src/play/selectors.ts", "src/rules"]` (never `session.ts` or the test helpers, which use browser globals), `exclude: ["**/*.test.ts"]`, `types: ["@cloudflare/workers-types/experimental"]`, `lib: ["ES2023"]`, same strictness flags as `tsconfig.app.json`, `noEmit`. Add it to the root `references`. `vitest.worker.config.ts` uses `defineWorkersConfig` with `wrangler: { configPath: './wrangler.jsonc' }` and `include: ['worker/**/*.test.ts']`. Script `"test:worker": "vitest run -c vitest.worker.config.ts"`.

- [ ] **Step 2: Write failing tests in `worker/room.test.ts`** using `SELF` from `cloudflare:test`:

```ts
it('creates a room and reports it waiting', ...)       // POST → 201, GET summary status 'waiting', seats {white:true, black:false}
it('rejects a bad length with 400', ...)
it('joins once, then 409', ...)
it('404s an unknown room', ...)
it('upgrades a WebSocket with a valid seat and answers hello with a snapshot', ...)
it('closes a WebSocket with 4001 for a bad seat token', ...)
it('relays an applied action from White to Black', ...)  // two sockets; White sends act roll (after join the match is in 'turn' for the opening roll winner; choose the action that is legal for White, or drive via a resync-first approach)
```

- [ ] **Step 3: Run `npm run test:worker`; expect FAIL**

- [ ] **Step 4: Write `worker/ids.ts`, `worker/room.ts`, `worker/index.ts`**. The DO keeps `host: RoomHost | null` in memory, built from storage on first use; `save` is `ctx.storage.put('room', room)`. Sinks wrap `WebSocket` objects; on hibernation wake, `ctx.getWebSockets()` and their tags rebuild the sink set. The Worker routes by path and forwards room requests to `env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(request)`.

- [ ] **Step 5: Run `npm run test:worker`; expect PASS. Run `npm run build` (tsc -b now includes the worker project) and `npm test`; expect PASS**

- [ ] **Step 6: Manual check: `npm run dev`, then `curl -X POST localhost:5173/api/rooms -d '{"length":1}' -H 'content-type: application/json'`; expect a 201 JSON body with `roomId` and `seatToken`.**

  Deployment note for the owner (not code): after the first `npm run deploy`, add a Cloudflare rate limiting rule on `POST /api/rooms` (for example 10 per minute per IP) in the dashboard. The Free plan includes basic rate limiting rules.

- [ ] **Step 7: Lint and commit: `feat(worker): room Durable Object and /api/rooms`**

---

### Task 5: Seat storage and the HTTP client

**Files:**
- Create: `src/remote/seats.ts`, `src/remote/seats.test.ts`
- Create: `src/remote/api.ts`, `src/remote/api.test.ts`
- Modify: `src/remote/index.ts`

**Interfaces:**
- Produces, `seats.ts`:

```ts
export const SEAT_KEY_PREFIX = 'pg-backgammon.room.';
export interface StoredSeat { readonly side: Side; readonly token: string; }
export function readSeat(roomId: string): StoredSeat | null;
export function writeSeat(roomId: string, seat: StoredSeat): void;
export function clearSeat(roomId: string): void;
/** `#seat=<token>&side=<white|black>` → store it and strip the fragment via history.replaceState. */
export function adoptSeatFromFragment(roomId: string, hash: string): StoredSeat | null;
export function inviteLink(origin: string, roomId: string): string;          // `${origin}/play/${roomId}`
export function privateLink(origin: string, roomId: string, seat: StoredSeat): string; // invite + `#seat=…&side=…`
```

- Produces, `api.ts`:

```ts
export interface RemoteApi {
  createRoom(length: number): Promise<CreateRoomResponse>;
  getRoom(roomId: string): Promise<RoomSummary | null>;        // null on 404
  joinRoom(roomId: string): Promise<JoinRoomResponse | 'full' | null>;
}
export function createRemoteApi(fetchFn?: typeof fetch, baseUrl?: string): RemoteApi;
```

- [ ] **Step 1: Write failing tests** (`seats.test.ts`: round trip, fragment adoption strips hash and stores, bad fragment ignored, `privateLink` never equals `inviteLink`; `api.test.ts`: fake fetch returning 201/404/409 shapes).

- [ ] **Step 2: Run `npx vitest run src/remote/seats.test.ts src/remote/api.test.ts`; expect FAIL**

- [ ] **Step 3: Implement both modules**, wrapping every `localStorage` access in try/catch like `src/storage/liveMatch.ts`.

- [ ] **Step 4: Run tests; expect PASS. Lint and commit: `feat(remote): seat storage and room API client`**

---

### Task 6: Board perspective

**Files:**
- Modify: `src/play/geometry.ts`, `src/play/geometry.test.ts`
- Modify: `src/play/Board.tsx`, `src/play/Board.test.tsx`
- Check callers: `src/play/drag.ts`, `src/play/checkerTravel.ts`, `src/play/animation.ts` (any that call geometry with a point must take the perspective through)

**Interfaces:**
- Produces: `export type Perspective = Player;` and a perspective-aware geometry layer in `geometry.ts`:

```ts
/** The point drawn at `point`'s slot under the given perspective: identity for white, 25 - point for black. */
export function viewPoint(point: Point, perspective: Perspective): Point;
export function pointAnchorX(point: Point, perspective?: Perspective): number;   // default 'white' keeps every caller valid
export function isTopRow(point: Point, perspective?: Perspective): boolean;
export function checkerCenter(point: Point, index: number, count: number, perspective?: Perspective): { x: number; y: number };
export function barCheckerCenter(player: Player, index: number, perspective?: Perspective): { x: number; y: number };
export function traySlabY(player: Player, index: number, perspective?: Perspective): number;
export function targetAt(x: number, y: number, perspective?: Perspective): BoardTarget | null;
```

  Under `'black'` the layout is the white layout rotated 180 degrees: a point renders at the slot of `25 - point`, white's and black's bar halves swap, and the trays swap. `Board` gains `readonly perspective?: Perspective` (default `'white'`) and passes it to every geometry call, including point labels, drag hit-testing and travel animation.

- [ ] **Step 1: Write failing tests**

  `geometry.test.ts` (fast-check is installed):
```ts
it('black perspective places point p where white places 25 - p', () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 24 }), (p) => {
    expect(pointAnchorX(p, 'black')).toBe(pointAnchorX(25 - p, 'white'));
    expect(isTopRow(p, 'black')).toBe(isTopRow(25 - p, 'white'));
  }));
});
it('targetAt inverts checkerCenter under both perspectives', ...)        // for each p and perspective, targetAt(checkerCenter(p,0,1,persp), persp) === p
it('swaps bar halves and trays for black', ...)                            // barCheckerCenter('white',0,'black').y === barCheckerCenter('black',0,'white').y; same for traySlabY
```

  `Board.test.tsx`: `it('renders Black\'s home points bottom right under the black perspective', ...)` by reading the `y` attribute of point 19's label (bottom row) and point 6's (top row).

- [ ] **Step 2: Run `npx vitest run src/play/geometry.test.ts src/play/Board.test.tsx`; expect FAIL**

- [ ] **Step 3: Implement** `viewPoint` and thread `perspective` through the geometry functions and `Board.tsx`. Hot-seat and vs-computer callers pass nothing.

- [ ] **Step 4: Run `npx vitest run src/play`; expect PASS (existing drag, animation and containment tests unchanged)**

- [ ] **Step 5: Lint and commit: `feat(board): perspective prop, black sees own home bottom right`**

---

### Task 7: `localSides` in the Play page (no remote yet)

**Files:**
- Modify: `src/pages/play/playFormat.ts`, `src/pages/play/playFormat.test.ts` (create if absent)
- Modify: `src/pages/Play.tsx` (`humanSide`, the autoplay `players`, the auto-roll pre-roll effect, `interactive`, `thinking`)

**Interfaces:**
- Produces: `export type PlayMode = 'computer' | 'hotseat' | 'remote';` and

```ts
export function localSidesFor(mode: PlayMode, localSide: Player | null): readonly Player[];
// 'computer' → ['white']; 'hotseat' → ['white','black']; 'remote' → localSide ? [localSide] : []
```

  In `Play.tsx` one `const localSides = localSidesFor(setup.mode, localSide)` (with `localSide` null until Task 8 supplies it) replaces every "white unless hot-seat" decision. `vsComputer` stays for the engine-only gates. The pre-roll auto-roll effect fires only when `match.toRoll` is in `localSides`.

- [ ] **Step 1: Write failing test** `localSidesFor` table in `playFormat.test.ts`, plus a `setupFromConfig` case: `{ mode: 'remote', length: 7 }` → mode `'remote'`.

- [ ] **Step 2: Run; expect FAIL (type error on 'remote')**

- [ ] **Step 3: Implement and refactor `Play.tsx`** to use `localSides`. No behaviour change for `computer` and `hotseat`.

- [ ] **Step 4: Run `npx vitest run src/pages src/play`; expect PASS, including all six `Play.*.test.tsx` files**

- [ ] **Step 5: Lint and commit: `refactor(play): localSides replaces the White-is-human assumption`**

---

### Task 8: The Play page in remote mode

**Files:**
- Create: `src/pages/play/useRemoteRoom.ts`, `src/pages/play/useRemoteRoom.test.tsx`
- Create: `src/pages/play/RemotePanel.tsx`
- Create: `src/pages/Play.remote.test.tsx`
- Modify: `src/pages/Play.tsx` (props `roomId?`, `remote?` injection; store swap; `RemotePanel`; board `perspective` and `interactive`; `thinking` false in remote)
- Modify: `src/pages/play/PlayHud.tsx` (optional `connection` line)
- Modify: `src/pages/play/playFormat.ts` (`statusText` takes `mode: PlayMode` instead of `vsComputer`)
- Modify: `src/storage/types.ts` (`MatchConfig.mode` adds `'remote'`; documented optional `roomId?: string; localSide?: Player`)
- Modify: `src/storage/useMatchPersistence.ts` (expose `ready: boolean`)
- Modify: `src/play/board.css` (the remote panel and connection line)

**Interfaces:**
- Consumes: Task 3 `createRemoteSession`, `ConnectionState`; Task 5 `RemoteApi`, seats; Task 6 `perspective`; Task 7 `localSidesFor`.
- Produces:

```ts
// useRemoteRoom.ts
export type RemoteRoomView =
  | { kind: 'loading' }
  | { kind: 'join'; summary: RoomSummary; join: () => Promise<void>; joining: boolean }
  | { kind: 'full' }
  | { kind: 'ended' }                                   // 404 / expired
  | { kind: 'seated'; session: RemoteSession; side: Side; connection: ConnectionState; inviteLink: string; privateLink: string };
export interface RemoteDeps { readonly api: RemoteApi; readonly transport?: TransportFactory; readonly origin: string; }
export function useRemoteRoom(roomId: string | undefined, deps: RemoteDeps): RemoteRoomView | null;  // null when no roomId
```

  `Play` props add `roomId?: string` and `remote?: RemoteDeps` (default `createRemoteApi()` and `location.origin`). When the view is `seated`, `Play` uses `view.session` as its store (`setStore(view.session)` once per session identity), sets `setup.mode = 'remote'`, `localSide = view.side`, passes `perspective={view.side}` to `Board`, and `interactive={humanTurn && view.connection.status === 'open'}`. Persistence: when `persistence.ready` and the session has a non-null match, adopt the stored row whose `config.roomId === roomId` if present, else `begin({ mode: 'remote', length, roomId, localSide: side })`, once.

  `RemotePanel` renders `loading`, `join`, `full`, `ended`, and the `seated` waiting state (match null: invite link, Copy, Share when `navigator.share` exists, "your private link" disclosure). `PlayHud` gains `connection?: ConnectionState | null` and renders a `<p className="remote-line" role="status">` with "Waiting for your opponent to join" (room `waiting`), "Opponent disconnected" (`!opponentPresent` while `playing`), "Reconnecting…" (`status !== 'open'`).

- [ ] **Step 1: Write failing tests**

  `useRemoteRoom.test.tsx` (renderHook, fake api, loopback transport):
```ts
it('shows join for a waiting room without a seat', ...)
it('joining stores the seat and yields a seated Black view', ...)
it('a stored seat connects straight away', ...)
it('a full room shows full; a 404 shows ended', ...)
it('adopts a seat from the URL fragment', ...)
```

  `Play.remote.test.tsx` (render `Play` with `roomId`, `remote` deps over one loopback, a second `Play` or a bare session as the opponent):
```ts
it('White waits with the invite link until Black joins', ...)                 // link text contains `/play/${roomId}`
it('the board is inert on the opponent\'s turn and live on mine', ...)        // no movable origins rendered for the opponent's turn
it('a local movement reaches the opponent session', ...)
it('auto-roll never fires for the remote opponent\'s pre-roll', ...)          // Review Focus 3: AUTO_ROLL_KEY 'always'; opponent at pre-roll with a cube decision; assert the session sent no act
it('Black sees the board from the black perspective', ...)                    // point 19 label in the bottom row
it('no tutor strip, hint, takeback or Finish race in remote mode', ...)
it('persists the match with mode remote, roomId and localSide', ...)          // memory storage list()
it('the HUD shows Opponent disconnected when the other socket closes', ...)
```

- [ ] **Step 2: Run `npx vitest run src/pages/play/useRemoteRoom.test.tsx src/pages/Play.remote.test.tsx`; expect FAIL**

- [ ] **Step 3: Implement** the hook, panel, HUD line, `Play.tsx` wiring, `statusText(match, thinking, mode)`, `MatchConfig` widening, `ready` on persistence.

- [ ] **Step 4: Run `npx vitest run src/pages src/storage src/play`; expect PASS (update `statusText` callers in tests for the new `mode` argument)**

- [ ] **Step 5: Lint and commit: `feat(play): remote mode on the Play page`**

---

### Task 9: Route, create flow and the setup card button

**Files:**
- Modify: `src/App.tsx` (route `/play/:roomId`), `src/App.test.tsx`
- Modify: `src/pages/Play.tsx` (third start button, money gate), `src/pages/Play.remote.test.tsx`
- Modify: `src/pages/play/playFormat.ts` (`storedMatchName` remote wording "7-point match online")

**Interfaces:**
- Consumes: Task 5 `RemoteApi.createRoom`, `writeSeat`; Task 8 `Play` `roomId` prop.
- Produces: `PlayRoute` reads `useParams().roomId` and passes it. A "Play a friend online" button (`play-button play-button--quiet`) beside the two existing start buttons; on click `createRoom(setup.length)` → `writeSeat(roomId, { side: 'white', token })` → `navigate(`/play/${roomId}`)`. Disabled with hint text "Online play is match play only" when `setup.gameType === 'money'`. On failure (network, 5xx) show "Couldn't create the game. Check your connection and try again." in the setup card.

- [ ] **Step 1: Write failing tests**

  `App.test.tsx`: `it('routes /play/:roomId to the Play area', ...)` (MemoryRouter initialEntries, expects the loading or join panel).
  `Play.remote.test.tsx`:
```ts
it('Play a friend online creates a room, stores the White seat and navigates', ...)
it('the online button is disabled for a money session', ...)
it('a full room shows "already has two players"', ...)                       // Review Focus 5a
it('a failed create shows the retry note and stays on the setup card', ...)
```

- [ ] **Step 2: Run; expect FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run `npx vitest run src/App.test.tsx src/pages`; expect PASS**

- [ ] **Step 5: Lint and commit: `feat(play): create and join rooms from a game URL`**

---

### Task 10: The user's side across Progress, mining and Analyze

**Files:**
- Create: `src/storage/userSide.ts`, `src/storage/userSide.test.ts`
- Modify: `src/storage/index.ts` (export)
- Modify: `src/progress/series.ts`, `src/progress/series.test.ts`
- Modify: `src/puzzles/blunderMining.ts`, `src/puzzles/blunderMining.test.ts`
- Modify: `src/pages/analyze/reviewFormat.ts`, `src/pages/analyze/reviewFormat.test.ts` (or `Analyze.test.tsx`)

**Interfaces:**
- Produces: `export function userSide(config: MatchConfig): Player | null` ('computer' → 'white'; 'remote' → `config.localSide` when it is 'white' or 'black', else null; otherwise null).
- `series.ts` `pointOf`: replace the mode check with `const side = userSide(stored.config); if (!side) return null;` and read `analyzed[side]`. `ProgressPoint.difficulty` becomes `'online'` for remote rows.
- `blunderMining.ts`: replace `HUMAN` with `const hero = userSide(match.config)`; skip the match when null; pass `hero` to `buildPlayPuzzle`/`buildCubePuzzle` (hero field and `applyMovement`).
- `reviewFormat.ts` `matchName`: `remote` → `${length} match online`.

- [ ] **Step 1: Write failing tests**

```ts
// userSide.test.ts
it.each([...])('computer→white, remote black→black, remote without localSide→null, hotseat→null, imported→null')
// series.test.ts
it('counts a remote match for the local side', ...)        // localSide 'black', analysis with distinct white/black summaries, expect Black's numbers
it('still excludes hot-seat', ...)
// blunderMining.test.ts
it('mines the local side\'s blunders as Black-hero puzzles for a remote Black player', ...)
// reviewFormat
it('names a remote match "7-point match online"', ...)
```

- [ ] **Step 2: Run; expect FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run `npx vitest run src/storage src/progress src/puzzles src/pages/analyze src/pages/Analyze.test.tsx`; expect PASS**

- [ ] **Step 5: Lint and commit: `feat(progress,puzzles): the user's side comes from the match config`**

---

### Task 11: Resume, expiry and the local record

**Files:**
- Modify: `src/pages/Play.tsx` (resume prompt for remote rows; `ended` panel actions), `src/pages/play/RemotePanel.tsx`, `src/pages/Play.remote.test.tsx`

**Interfaces:**
- Consumes: Task 8 `RemoteRoomView` `'ended'`; `MatchStorage.delete`.
- Produces: in the resume prompt, a `remote` row shows "An online match is waiting: 7-point match online, White 2 · Black 1" with a "Return to online match" button that navigates to `/play/<roomId>` (never `resume(stored)`). The `ended` panel, when a stored row for this `roomId` exists and is in progress, offers "Review in Analyze" (`Link to="/analyze"`) and "Discard" (`storage.delete(id)` then navigate to `/`). The row is never marked finished.

- [ ] **Step 1: Write failing tests**

```ts
it('the resume prompt sends a remote row back to its room URL', ...)
it('an expired room offers Review and Discard', ...)               // Review Focus 5b: api.getRoom → null, memory storage holds the in-progress remote row
it('Discard deletes the local row', ...)
it('an expired room never writes status finished', ...)
```

- [ ] **Step 2: Run; expect FAIL. Step 3: Implement. Step 4: Run `npx vitest run src/pages`; expect PASS**

- [ ] **Step 5: Lint and commit: `feat(play): remote resume returns to the room; expired rooms stay reviewable`**

---

### Task 12: Reconnection and connection states

**Files:**
- Modify: `src/remote/session.ts`, `src/remote/session.test.ts`
- Modify: `src/pages/play/PlayHud.tsx` (copy for `busy`, `expired`, `bad-token`), `src/pages/Play.remote.test.tsx`

**Interfaces:**
- Consumes: Task 3 `RemoteSession`, `ConnectionState`, `backoffMs`, `pace`.
- Produces: on close with a non-terminal code, `status: 'reconnecting'`, wait `backoffMs[min(attempt, last)]` via `pace`, reconnect, send `hello`, reset attempts on a received snapshot. Terminal codes set `error` (`4001 → 'bad-token'`, `4002 → 'version'`, `4003 → 'expired'`) and `status: 'closed'` with no retry. `reconnectNow()` skips the wait; the session subscribes to `window` `online` and `document` `visibilitychange` (visible) and calls it. `dispose()` removes listeners and closes the socket.

- [ ] **Step 1: Write failing tests** (fake transport whose factory records each connection; `pace` resolves immediately but records requested waits):

```ts
it('reconnects with the configured backoff after an unexpected close', ...)   // waits [1000, 2000] then open
it('resets the backoff after a snapshot', ...)
it('does not retry after 4001, 4002 or 4003 and sets the matching error', ...)
it('reconnects immediately on visibilitychange', ...)                         // Review Focus 4: close silently, dispatch visibilitychange, expect a new connection with no wait
it('reconnects on the online event', ...)
it('dispose stops reconnecting', ...)
```

  `Play.remote.test.tsx`: `it('shows Reconnecting… and disables the board while the socket is down', ...)`.

- [ ] **Step 2: Run; expect FAIL. Step 3: Implement. Step 4: Run `npx vitest run src/remote src/pages`; expect PASS**

- [ ] **Step 5: Lint and commit: `feat(remote): reconnection with backoff and terminal close codes`**

---

### Task 13: Documentation

**Files:**
- Create: `docs/adr/0004-relay-only-backend-for-remote-play.md`
- Modify: `GLOSSARY.md` (intro sentence; terms Remote match, Room, Seat, Invite link, Private link under Play)
- Modify: `CLAUDE.md` (first paragraph)
- Modify: `.scratch/backgammon-platform/spec.md` (out-of-scope list; add stories 60 to 64: create, join, play, resume, review)
- Modify: `README.md` if it states "no backend"

**Interfaces:** none.

- [ ] **Step 1: Write ADR-0004** in the style of ADR-0003: title, the decision (a relay-only Durable Object room, no accounts, no user data, expiring state), alternatives rejected (WebRTC + signaling, third-party realtime, shared seed, dumb relay), consequences (a server to operate; the Free plan limits and the one write per action rule; Capacitor shell unsupported; money sessions excluded until an end-of-session action exists).

- [ ] **Step 2: Update GLOSSARY.md, CLAUDE.md, spec.md** with the wording from the spec's Vocabulary section.

- [ ] **Step 3: Run `grep -rn "no backend" CLAUDE.md GLOSSARY.md README.md`; expect no stale hits**

- [ ] **Step 4: Commit: `docs: ADR-0004 relay-only backend, glossary and spec for remote play`**

---

### Task 14: Two-browser end-to-end run

**Files:**
- Create: `e2e/remote.spec.ts`
- Modify: `e2e/helpers.ts` (add `playRemoteUntilMatchOver(white: Page, black: Page)`)
- Modify: `playwright.config.ts` (project `remote`), `package.json` (`e2e:remote`)

**Interfaces:**
- Consumes: the built app served by `vite preview` through the Cloudflare plugin, which runs the Worker and Durable Object in workerd (the plugin README states preview support; if the room API 404s under preview, switch this project's `webServer.command` to `npm run build && npx wrangler dev --port 4173`).
- Produces: `playRemoteUntilMatchOver` alternates between the two pages, clicking whichever has an enabled Roll, highlighted origin, Commit play, Continue or Next game control, until "wins the match" appears on both.

- [ ] **Step 1: Write `e2e/remote.spec.ts`**

```ts
test('two browsers play a 1-point match over a room link', async ({ browser }) => {
  const white = await (await browser.newContext()).newPage();
  const black = await (await browser.newContext()).newPage();
  await white.goto('/');
  await white.getByLabel('Match length').selectOption({ label: '1 point' });
  await white.getByRole('button', { name: 'Play a friend online' }).click();
  await expect(white).toHaveURL(/\/play\/[a-z2-7]{20}$/);
  const link = await white.getByRole('textbox', { name: 'Invite link' }).inputValue();
  await black.goto(link);
  await black.getByRole('button', { name: 'Join as Black' }).click();
  await playRemoteUntilMatchOver(white, black);
  await expect(white.getByText(/wins the match/).first()).toBeVisible();
  await expect(black.getByText(/wins the match/).first()).toBeVisible();
  // both Analyze ledgers list a finished "1-point match online"
});
test('a third visitor sees the room is full', ...)
```

- [ ] **Step 2: Add the `remote` project and script; run `npm run e2e:remote`; expect PASS (allow up to 5 minutes)**

- [ ] **Step 3: Run `npm run e2e` and `npm run e2e:pwa` to confirm the Worker-enabled preview did not break the existing projects**

- [ ] **Step 4: Commit: `test(e2e): two-browser remote match`**

---

## Self-review notes

- Spec coverage: lifecycle steps 1 to 9 map to Tasks 8, 9, 11 and 12; server section to Tasks 2 and 4; shared reducer to Task 1; protocol to Task 2; client session to Tasks 3 and 12; Play page changes to Tasks 7 and 8; board perspective to Task 6; routing to Task 9; persistence and Progress to Tasks 8, 10 and 11; documentation to Task 13; testing section to every task plus Task 14; cost rules to Tasks 2, 3 and 4 (one write per action, busy on failed save, alarm policy, autoResponse pings).
- Names used consistently: `reduceMatch`, `decisionOwner`, `createReplaceablePlayStore`, `RoomState`, `createRoomHost`, `createRemoteSession`, `ConnectionState`, `localSidesFor`, `useRemoteRoom`, `userSide`, `Perspective`.
- Left to the builder as the spec allows: copy, CSS, backoff tuning beyond the defaults, whether seat tokens are hashed at rest, exact `tsconfig.worker.json` flags, whether `worker/env.d.ts` comes from `wrangler types`.
