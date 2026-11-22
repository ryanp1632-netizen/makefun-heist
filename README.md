# makefun-heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/ryanp1632-netizen/makefun-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/ryanp1632-netizen/makefun-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**VELVET HOUR** is an original top-down art-deco night heist for the desktop browser. Plan each
floor on a blueprint, buy tools with the crew's cash, then slip MOTH past guards with ray-cast
vision cones and sweeping wall cameras, lift the loot from its gold plinth and reach the getaway
car before the ALARM meter fills to LOCKDOWN. Three floors, several routes per room (open arch,
vent crawl, lock-pick door, glass you can cut), four tools at a price, and a GHOST / CLEAN / LOUD
rating for every floor.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

- **WASD / arrows** move, **Shift** sneak (silent, slow), **E** (hold) lift · pick a lock · cut glass · crawl a vent · cut a camera wire
- **Lasers** blink on a beat: cross a beam only while it is OFF, or the alarm jumps.
- **Click** throws the selected tool at the cursor, **1-4** pick a tool (smoke, EMP tag, coin, glass cutter), **R** retry the floor
- Shadow pools hide you (cameras cannot see into them at all; guards only up close). Glass stops feet, not eyes.
- A guard who sees you shows a **?** that fills after a short grace, then **!** — a chase and a jump on the alarm.

### How it is built

- `game/` — static files only: `index.html` plus ES modules under `game/src/` (Canvas2D drawing,
  WebAudio-synthesised sound, no libraries, no network requests).
  - rules: `heist.js` (one floor, step order, outcome, results), `actors/` (thief, guards, cameras),
    `systems/` (vision cones, noise, alarm, tools), `floors.js` (the three floor plans), `geometry.js` (ray casts)
  - drawing: `render/` (floor art, cones, actors, HUD, screens), `audio.js`, `input.js`, `main.js` (loop and screen flow)
  - `shots.js` stages the screenshot scenes (`?shot=heist|plan|getaway|results|spotted`) from real game state.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output and writes `dossier.json`
  with the kit's `vendor/makefun-game.ts` (unchanged).
- `tools/` — `sim-test.mjs` (rules test in Node), `play-test.mjs` (plays the game in headless Chrome with real
  key and mouse events), `shots.sh` (renders the screenshots).

```sh
node tools/sim-test.mjs && node tools/play-test.mjs
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed. All names, art and sounds are original to this game.

---

<sub>Entered on [make.fun](https://make.fun/?ref=z79n7aa6&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
