// Staged screenshot scenes behind ?shot=heist|plan|getaway|results|spotted|title. Each one runs
// the real floor simulation forward, then places the cast at a telling moment, so the frame is
// drawn by the game's own renderers from real game state, the same every time.
import { STEP } from './config.js';
import { floorResults, startFloor, stepFloor, PHASE_ESCAPED, PHASE_SPOTTED } from './heist.js';
import { ALERT, INVESTIGATE, PATROL, SUSPICIOUS } from './actors/guards.js';
import { emitNoise } from './systems/noise.js';
import { useTool } from './systems/tools.js';
import { inShadow } from './systems/vision.js';
import { leaveFootprint } from './actors/thief.js';

const IDLE = { dx: 0, dy: 0 };

function run(state, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) stepFloor(state, IDLE, STEP);
}

function place(guard, x, y, facing, mode, suspicion = 0, bubble = null) {
  Object.assign(guard, { x, y, facing, mode, suspicion, bubble, bubbleT: bubble ? 2 : 0, target: null });
}

/** Lay the footprints Moth would leave walking these points, with the thief's own trail rule. */
function walkTrail(thief, points) {
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4);
    for (let k = 0; k <= n; k += 1) {
      Object.assign(thief, { x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n, facing: Math.atan2(by - ay, bx - ax) });
      leaveFootprint(thief);
    }
  }
}

function byName(state, name) {
  return state.guards.find((g) => g.name === name);
}

/** The cover: Moth, hidden in a shadow pool, cutting the glass under the Clockwork Heart. */
function heistScene(r) {
  const s = startFloor(1, { smoke: 2, emp: 1, coin: 2, cutter: 1 });
  run(s, 3.2);
  walkTrail(s.thief, [[64, 604], [190, 604], [340, 574], [430, 528], [492, 482]]);
  Object.assign(s.thief, { x: 492, y: 478, facing: -Math.PI / 2, sneaking: true, inShadow: true });
  s.thief.job = { kind: 'cut', dur: 1.6, t: 1.0, target: s.glass[0], label: '' };
  useTool(s, 'emp', 860, 646);
  useTool(s, 'smoke', 628, 196);
  s.cameras[1].offT = 6.2;
  s.time = 9.4;
  for (const c of s.cameras) c.angle = c.base + c.sweep * Math.sin((s.time * Math.PI * 2) / c.period);
  s.clouds[0].r = 66;
  s.clouds[0].t = 1.4;
  place(byName(s, 'VANCE'), 372, 470, 0.25, SUSPICIOUS, 0.55, "Who's there?");
  place(byName(s, 'ROSA'), 700, 118, Math.PI * 0.62, PATROL);
  place(byName(s, 'OTTO'), 922, 470, Math.PI * 0.72, INVESTIGATE, 0.2, 'What was that?');
  byName(s, 'OTTO').target = { x: 820, y: 560 };
  emitNoise(s, 820, 560, 260, 'coin');
  s.noises[s.noises.length - 1].t = 0.45;
  s.noises[s.noises.length - 1].heard = true;
  s.effects.push({ kind: 'coin', x: 820, y: 560, t: 0.5, life: 1.2 });
  s.alarm.value = 47;
  s.stats.maxAlarm = 47;
  s.message = { text: 'Glass stops feet, not eyes. Cut it while VANCE looks away.', t: 3 };
  for (const g of s.guards) g.sees = false;
  r.state = s;
  r.screen = 'play';
  r.floorIndex = 1;
  r.cash = 900;
  r.take = 58400;
  r.selected = 'coin';
  r.mouse = { x: 640, y: 560 };
  r.clock = 9.4;
}

function planScene(r) {
  r.screen = 'plan';
  r.floorIndex = 1;
  r.cash = 1200;
  r.kit = { smoke: 2, emp: 1, coin: 2, cutter: 1 };
  r.clock = 0.2;
}

/** The getaway: loot in hand, alarm in ALERT, VANCE giving chase, the car 0:14 away. */
function getawayScene(r) {
  const s = startFloor(2, { smoke: 1, emp: 0, coin: 1, cutter: 0 });
  run(s, 2);
  s.glass[0].cut = true;
  s.doors[0].open = true;
  s.cameras[2].cut = true;
  s.rebuildWalls();
  s.thief.hasLoot = true;
  s.phase = 'getaway';
  Object.assign(s.thief, { x: 96, y: 436, facing: Math.PI * 0.55, sneaking: false });
  s.thief.inShadow = inShadow(s, s.thief.x, s.thief.y);
  s.time = 31.5;
  for (const c of s.cameras) if (!c.cut) c.angle = c.base + c.sweep * Math.sin((s.time * Math.PI * 2) / c.period);
  useTool(s, 'smoke', 196, 372);
  s.clouds[0].r = 58;
  s.clouds[0].t = 1.5;
  place(byName(s, 'LUCIEN'), 300, 322, 2.7, ALERT, 1, 'Stop right there!');
  place(byName(s, 'IVY'), 250, 600, -Math.PI / 2, SUSPICIOUS, 0.4);
  place(byName(s, 'KASPAR'), 300, 120, 0, PATROL);
  place(byName(s, 'DORA'), 830, 110, 0, PATROL);
  s.getawayT = 14.2;
  s.alarm.value = 71;
  s.alarm.floor = 12;
  s.stats.spotted = 1;
  s.message = { text: 'GOT IT! Run for the GETAWAY CAR. Smoke behind you blocks their cones.', t: 3 };
  for (const g of s.guards) g.sees = false;
  r.state = s;
  r.screen = 'play';
  r.floorIndex = 2;
  r.cash = 2400;
  r.take = 131200;
  r.selected = 'smoke';
  r.clock = 31.5;
}

function resultsScene(r) {
  const s = startFloor(1, { smoke: 0, emp: 0, coin: 1, cutter: 0 });
  run(s, 2.5);
  s.thief.hasLoot = true;
  Object.assign(s.thief, { x: 920, y: 120 });
  s.phase = PHASE_ESCAPED;
  s.getawayT = 19.4;
  Object.assign(s.stats, { spotted: 0, toolsUsed: 4, maxAlarm: 29, time: 104 });
  r.state = s;
  r.floorIndex = 1;
  r.results = floorResults(s);
  r.best = [58400, r.results.total];
  r.take = r.best[0] + r.best[1];
  r.cash = 4300;
  r.screen = 'results';
  r.clock = 1;
}

function spottedScene(r) {
  const s = startFloor(0, { smoke: 1, emp: 0, coin: 1, cutter: 1 });
  run(s, 4);
  Object.assign(s.thief, { x: 700, y: 236 - 30, facing: 0 });
  place(byName(s, 'BRUNO'), 640, 186, 0.2, ALERT, 1, 'Got you!');
  s.alarm.value = 62;
  s.phase = PHASE_SPOTTED;
  s.caughtBy = 'BRUNO';
  s.spottedT = 0.6;
  r.state = s;
  r.screen = 'play';
  r.floorIndex = 0;
}

export function stageShot(name, r) {
  if (name === 'heist') heistScene(r);
  else if (name === 'plan') planScene(r);
  else if (name === 'getaway') getawayScene(r);
  else if (name === 'results') resultsScene(r);
  else if (name === 'spotted') spottedScene(r);
  else {
    run(r.state, 6);
    r.clock = 0.2;
  }
}
