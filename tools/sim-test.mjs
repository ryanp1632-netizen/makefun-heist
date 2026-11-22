// Headless rules test: runs each floor's simulation in Node with scripted inputs and checks the
// heist plays out (patrols move, a careless walk gets noticed, a lift-and-run escape pays out).
import { startFloor, stepFloor, floorResults } from '../game/src/heist.js';
import { FLOORS } from '../game/src/floors.js';
import { emitNoise } from '../game/src/systems/noise.js';
import { useTool } from '../game/src/systems/tools.js';

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
// Lasers: a live beam trips the alarm, the same beam while off does not
{
  const s = startFloor(1, { smoke: 0, emp: 0, coin: 0, cutter: 0 });
  const l = s.lasers[0];
  const mid = [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2];
  s.guards.forEach((g) => Object.assign(g, { x: -999, y: -999, route: [[-999, -999], [-998, -999]] }));
  Object.assign(s.thief, { x: mid[0], y: mid[1] });
  stepFloor(s, { dx: 0, dy: 0 });
  check(s.alarm.value >= 20 && s.stats.lasersTripped === 1, `live laser trips the alarm (${s.alarm.value.toFixed(0)}%)`);
  const o = startFloor(1, { smoke: 0, emp: 0, coin: 0, cutter: 0 });
  o.guards.forEach((g) => Object.assign(g, { x: -999, y: -999, route: [[-999, -999], [-998, -999]] }));
  o.time = l.on + 0.2; // inside the off gap
  Object.assign(o.thief, { x: mid[0], y: mid[1] });
  stepFloor(o, { dx: 0, dy: 0 });
  check(o.alarm.value === 0, `laser in its off gap lets you through (${o.alarm.value.toFixed(0)}%)`);
}

// Walk-throughs with real inputs (sneak, hold E, tools): each floor can be beaten clean.
const WALKS = [
  [{ to: [40, 400] }, { to: [40, 110] }, { to: [56, 110] }, { e: 2 }, { to: [680, 330] }, { e: 1.5 }, { to: [700, 250] }, { e: 2.4 }, { to: [700, 200], run: 1 }, { to: [920, 120], run: 1 }],
  [{ to: [230, 612] }, { e: 2 }, { tool: 'emp', at: [616, 274] }, { to: [500, 352] }, { e: 1.5 }, { to: [530, 232] }, { wait: 1 }, { to: [700, 180], run: 1 }, { to: [920, 120], run: 1 }],
  [{ wait: 4 }, { to: [960, 340] }, { e: 2 }, { to: [520, 168] }, { e: 1.5 }, { tool: 'smoke', at: [250, 300] }, { tool: 'coin', at: [800, 560] }, { to: [420, 172], run: 1 }, { to: [300, 172], run: 1 }, { to: [260, 320], run: 1 }, { to: [120, 420], run: 1 }, { to: [120, 480], run: 1 }, { to: [70, 600], run: 1 }],
];
WALKS.forEach((plan, f) => {
  const s = startFloor(f, { smoke: 2, emp: 1, coin: 2, cutter: 1 });
  for (const step of plan) {
    if (step.tool) useTool(s, step.tool, step.at[0], step.at[1]);
    else if (step.wait) for (let k = 0; k < step.wait * 60; k += 1) stepFloor(s, { dx: 0, dy: 0, sneak: true });
    else if (step.e) {
      stepFloor(s, { dx: 0, dy: 0, interact: true, interactPressed: true });
      for (let k = 0; k < step.e * 60; k += 1) stepFloor(s, { dx: 0, dy: 0, interact: true });
    } else {
      for (let k = 0; k < 60 * 30 && (s.phase === 'infil' || s.phase === 'getaway'); k += 1) {
        const dx = step.to[0] - s.thief.x;
        const dy = step.to[1] - s.thief.y;
        if (Math.hypot(dx, dy) < 5) break;
        stepFloor(s, { dx: Math.abs(dx) > 3 ? Math.sign(dx) : 0, dy: Math.abs(dy) > 3 ? Math.sign(dy) : 0, sneak: !step.run });
      }
    }
  }
  check(s.phase === 'escaped' && s.stats.spotted === 0, `floor ${f} walk-through escapes unseen (phase ${s.phase}, ${s.time.toFixed(1)} s, rating ${floorResults(s).rating})`);
});

console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
