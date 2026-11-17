# pg-backgammon

A personal, browser-only backgammon training platform: play full matches
against the computer at five difficulties, review every finished game with an
analyzer that scores each play and cube decision, and drill practice puzzles.
Play the computer solo, or a friend in a remote match via an invite link. No accounts; all your data stays local in your browser, and the only server is a relay that holds a live match room until it expires (ADR-0004).

## Getting started

Requires Node.js 20+.

```sh
npm install
npm run dev      # serve the app locally
npm test         # run the test suite once
npm run build    # type-check and build for production
npm run lint     # lint and check formatting (Biome)
npm run format   # fix lint and formatting issues
```

## Areas

- **Play** — match play (1–25 points, doubling cube, Crawford) against gnubg
  compiled to WebAssembly, from Beginner to World-class.
- **Analyze** — post-game review: every play and cube decision scored for
  equity loss, classified, and browsable with alternatives.
- **Puzzles** — checker-play and cube-decision drills, curated and mined from
  your own blunders.
- **Progress** — error rate per match over time.

See `GLOSSARY.md` for domain vocabulary and `docs/adr/` for load-bearing
decisions.

## License and gnubg provenance

This project is licensed under the **GNU General Public License v3.0** — see
[LICENSE](LICENSE).

The app embeds [GNU Backgammon](https://www.gnu.org/software/gnubg/) (gnubg)
compiled to WebAssembly as its playing and analysis engine, following the
[hwatheod/gnubg-web](https://github.com/hwatheod/gnubg-web) Emscripten build
(see `docs/adr/0001-gnubg-wasm-single-engine-gpl.md`). gnubg is GPL-3.0, and
serving its WASM build is distribution: **the corresponding source for the
gnubg WASM artifacts must remain obtainable** wherever this app is hosted.
Keep this section — including the links above to the gnubg source and the
gnubg-web build provenance — intact in any fork or deployment, and if you
modify or rebuild the engine artifacts, publish the modified source alongside
them.
