// Headless rules test: runs each floor's simulation in Node with scripted inputs and checks the
// heist plays out (patrols move, a careless walk gets noticed, a lift-and-run escape pays out).
import { startFloor, stepFloor, floorResults } from '../game/src/heist.js';
import { FLOORS } from '../game/src/floors.js';
import { emitNoise } from '../game/src/systems/noise.js';

let fails = 0;
const check = (c, m) => {
  console.log((c ? 'PASS ' : 'FAIL ') + m);
  if (!c) fails += 1;
};

for (let f = 0; f < FLOORS.length; f += 1) {
  // 1. idle: guards walk their routes, nobody gets stuck
  const s = startFloor(f, { smoke: 1, emp: 1, coin: 1, cutter: 1 });
  const moved = s.guards.map(() => 0);
  for (let i = 0; i < 60 * 40; i += 1) {
    const before = s.guards.map((g) => [g.x, g.y]);
    stepFloor(s, { dx: 0, dy: 0 });
    s.guards.forEach((g, k) => (moved[k] += Math.hypot(g.x - before[k][0], g.y - before[k][1])));
  }
  s.guards.forEach((g, k) => check(moved[k] > 300, `floor ${f} ${g.name} patrols (${Math.round(moved[k])} px in 40 s, wp ${g.wp})`));
  check(s.phase === 'infil', `floor ${f} idle thief at start is safe (phase ${s.phase}, alarm ${s.alarm.value.toFixed(0)})`);

  // 2. stand in the open right in front of a guard: the "?" fills after the grace, then "!"
  const w = startFloor(f, { smoke: 0, emp: 0, coin: 0, cutter: 0 });
  const loot = w.floor.loot;
  const g0 = w.guards[0];
  Object.assign(w.thief, { x: g0.x + Math.cos(g0.facing) * 120, y: g0.y + Math.sin(g0.facing) * 120 });
  let firstSus = -1;
  for (let i = 0; i < 60 * 6 && w.stats.spotted === 0; i += 1) {
    stepFloor(w, { dx: 0, dy: 0 });
    if (firstSus < 0 && g0.suspicion > 0) firstSus = i / 60;
  }
  check(firstSus >= 0.3, `floor ${f} grace before suspicion (${firstSus.toFixed(2)} s)`);
  check(w.stats.spotted > 0 && w.alarm.value >= 30, `floor ${f} guard spots a thief in plain view (spotted ${w.stats.spotted}, alarm ${w.alarm.value.toFixed(0)})`);
  // ...and the same spot inside smoke is safe
  const sm = startFloor(f, { smoke: 1, emp: 0, coin: 0, cutter: 0 });
  const g1 = sm.guards[0];
  Object.assign(sm.thief, { x: g1.x + Math.cos(g1.facing) * 120, y: g1.y + Math.sin(g1.facing) * 120 });
  sm.clouds.push({ x: g1.x + Math.cos(g1.facing) * 60, y: g1.y + Math.sin(g1.facing) * 60, r: 40, full: 40, t: 0, life: 99 });
  for (let i = 0; i < 60; i += 1) stepFloor(sm, { dx: 0, dy: 0 });
  check(g1.suspicion === 0, `floor ${f} smoke blocks the cone (suspicion ${g1.suspicion.toFixed(2)})`);

  // a coin thrown into the vault draws guards, who give up and go back to patrol (never stuck on a wall)
  const c = startFloor(f, { smoke: 0, emp: 0, coin: 1, cutter: 0 });
  c.thief.hidden = true;
  emitNoise(c, c.floor.loot.x, c.floor.loot.y, 600, 'coin');
  stepFloor(c, { dx: 0, dy: 0 });
  const drawn = c.guards.filter((g) => g.mode === 'INVESTIGATE').length;
  for (let i = 0; i < 60 * 25; i += 1) stepFloor(c, { dx: 0, dy: 0 });
  check(drawn > 0 && c.guards.every((g) => g.mode === 'PATROL'), `floor ${f} coin draws ${drawn} guard(s), all back on patrol after 25 s (${c.guards.map((g) => g.mode).join(',')})`);

  // 3. stand by the loot, lift it, step into the car bay: escape and results
  const e = startFloor(f, { smoke: 0, emp: 0, coin: 0, cutter: 0 });
  e.guards.forEach((g) => Object.assign(g, { x: -999, y: -999, route: [[-999, -999], [-998, -999]] }));
  e.cameras.forEach((c) => (c.cut = true));
  Object.assign(e.thief, { x: loot.x + 20, y: loot.y });
  stepFloor(e, { dx: 0, dy: 0, interact: true, interactPressed: true });
  for (let i = 0; i < 100; i += 1) stepFloor(e, { dx: 0, dy: 0, interact: true });
  check(e.thief.hasLoot && e.phase === 'getaway', `floor ${f} lift works (phase ${e.phase})`);
  Object.assign(e.thief, { x: e.floor.exit.x + e.floor.exit.w / 2, y: e.floor.exit.y + e.floor.exit.h / 2 });
  stepFloor(e, { dx: 0, dy: 0 });
  check(e.phase === 'escaped', `floor ${f} escape works (phase ${e.phase})`);
  const r = floorResults(e);
  check(r.total > loot.value && r.rating === 'GHOST', `floor ${f} results ${r.rating} $${r.total}`);

  // 4. every interactable stands clear of the walls
  const inWall = (x, y) => e.floor.walls.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
  for (const v of e.floor.vents) check(!inWall(v.a.x, v.a.y) && !inWall(v.b.x, v.b.y), `floor ${f} vent grates clear`);
  for (const c of e.floor.cameras) check(!inWall(c.box.x, c.box.y), `floor ${f} ${c.id} junction box clear (${c.box.x},${c.box.y})`);
  check(!inWall(e.floor.start.x, e.floor.start.y), `floor ${f} start clear`);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
