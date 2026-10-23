# gnubg WASM engine artifacts — provenance

The files `gnubg.js`, `gnubg.wasm`, and `gnubg.data` in this directory are a
WebAssembly build of **GNU Backgammon 1.05.000** (May 31 2021 build), produced
by the [gnubg-web](https://github.com/hwatheod/gnubg-web) project (Theodore
Hwa's Emscripten port of gnubg; GTK GUI removed, changes marked `#ifdef WEB`).

They are licensed under the **GNU General Public License v3.0**, the same
license as this repository (see `LICENSE` and ADR-0001,
`docs/adr/0001-gnubg-wasm-single-engine-gpl.md`). Corresponding source:
<https://github.com/hwatheod/gnubg-web> (gnubg 1.05.000 C source + glib 2.62.0,
bundled in that repo).

## Where these exact files came from

Obtained 2026-10-22 from the deployed
[skeptrunedev/backgammon](https://github.com/skeptrunedev/backgammon) site:

- `https://bg.skeptrune.com/engine/gnubg.js` (106,611 bytes)
- `https://bg.skeptrune.com/engine/gnubg.wasm` (951,472 bytes)
- `https://bg.skeptrune.com/engine/gnubg.data` (2,035,611 bytes)

That project in turn fetches them verbatim (see its `scripts/fetch-engine.sh`)
from gnubg-web's hosted demo, `http://xenon.stanford.edu/~hwatheod/gnubg_web/`,
which was unreachable at vendoring time.

SHA-256:

```
85c2ffffea3537abc558ae6225d990229286e46bc76a256ab67ce4ebc9dea43a  gnubg.js
7633b9e4df99b8f63e4e6bf40d9dbd46d465c3f5286a692ae453f2631c87cf78  gnubg.wasm
0f529b347be0a69af5bab144f22cf34574822c896bd4a0ea208bc82d1cc5cf73  gnubg.data
```

## How to rebuild from source

Clone <https://github.com/hwatheod/gnubg-web> and run `./build.sh` with the
Emscripten SDK installed (the repo's README documents the tested emsdk
version). The script compiles `gnubg/*.c` + bundled glib with
`-s EXPORTED_FUNCTIONS=["_malloc","_free"]` and packs `packaged_files/`
(neural-net weights `gnubg.wd`, one-sided bearoff DB `gnubg_os0.bd`, match
equity tables `met/*.xml`, and `/.gnubg/gnubgrc`) into `gnubg.data`. The
two-sided bearoff database is intentionally not packaged (too large).

## What the build exposes

`Module._start()` (replaces `main`), `Module._run_command(ptr)` (runs one gnubg
CLI command; output arrives via `Module.print`/`printErr` lines),
`Module._doNextTurn()`, `Module._malloc`/`_free`, runtime methods
`getValue`/`setValue`/`HEAPU8`, and the Emscripten `FS` API. The packaged
`gnubgrc` sets `set output rawboard on` and `set sound enable off` at startup.
