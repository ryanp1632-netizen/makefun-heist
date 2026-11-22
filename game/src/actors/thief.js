// Moth, the thief: walking and sneaking, footsteps guards can hear, and the hold-E jobs
// (lift the loot, crawl a vent, pick a door, cut glass, cut a camera's wire).
import { THIEF, TIMES } from '../config.js';
import { clamp, dist, pushOutOfBoxes } from '../geometry.js';
import { inShadow } from '../systems/vision.js';
import { emitNoise } from '../systems/noise.js';

export function makeThief(floor) {
  return {
    x: floor.start.x,
    y: floor.start.y,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    inShadow: false,
    hidden: false,
    hasLoot: false,
    job: null, // { kind, t, dur, target, label }
    stepT: 0,
  };
}

/** Distance from a point to the nearest edge of a box. */
function boxDistance(x, y, b) {
  const nx = clamp(x, b.x, b.x + b.w);
  const ny = clamp(y, b.y, b.y + b.h);
  return Math.hypot(x - nx, y - ny);
}

/** The nearest thing E can work on from here, or null: the label is shown as a prompt. */
export function findInteraction(state) {
  const t = state.thief;
  const R = THIEF.reach;
  const loot = state.floor.loot;
  if (!t.hasLoot && dist(t.x, t.y, loot.x, loot.y) < R + 14) return { kind: 'lift', dur: TIMES.lift, target: loot, label: `HOLD E  lift ${loot.name}` };
  for (const v of state.floor.vents) {
    if (dist(t.x, t.y, v.a.x, v.a.y) < R) return { kind: 'vent', dur: TIMES.vent, target: v.b, label: 'HOLD E  crawl through the vent' };
    if (dist(t.x, t.y, v.b.x, v.b.y) < R) return { kind: 'vent', dur: TIMES.vent, target: v.a, label: 'HOLD E  crawl back through the vent' };
  }
  for (const d of state.doors) if (!d.open && boxDistance(t.x, t.y, d) < R) return { kind: 'pick', dur: TIMES.pick, target: d, label: 'HOLD E  pick the lock (makes a little noise)' };
  for (const g of state.glass) {
    if (g.cut || boxDistance(t.x, t.y, g) >= R) continue;
    if (state.tools.cutter > 0) return { kind: 'cut', dur: TIMES.cut, target: g, label: 'HOLD E  cut the glass (uses 1 GLASS CUTTER)' };
    return { kind: 'none', dur: 0, target: g, label: 'Glass wall: buy a GLASS CUTTER to cut through' };
  }
  for (const c of state.cameras) if (!c.cut && dist(t.x, t.y, c.box.x, c.box.y) < R) return { kind: 'wire', dur: TIMES.wire, target: c, label: `HOLD E  cut ${c.id}'s wire` };
  return null;
}

function finishJob(state, job) {
  const t = state.thief;
  if (job.kind === 'lift') {
    t.hasLoot = true;
    state.events.push('lift');
  } else if (job.kind === 'vent') {
    t.x = job.target.x;
    t.y = job.target.y;
    state.events.push('vent');
  } else if (job.kind === 'pick') {
    job.target.open = true;
    emitNoise(state, t.x, t.y, 90, 'lock');
    state.events.push('door');
  } else if (job.kind === 'cut') {
    job.target.cut = true;
    state.tools.cutter -= 1;
    state.stats.toolsUsed += 1;
    state.events.push('glass');
  } else if (job.kind === 'wire') {
    job.target.cut = true;
    state.events.push('wire');
  }
  state.rebuildWalls();
}

/** One step of the thief: the job in hand, else movement, footsteps and the shadow test. */
export function stepThief(state, input, dt) {
  const t = state.thief;
  t.sneaking = !!input.sneak;
  if (t.job) {
    if (!input.interact || input.dx || input.dy) {
      t.job = null;
      t.hidden = false;
    } else {
      t.job.t += dt;
      t.hidden = t.job.kind === 'vent';
      if (t.job.t >= t.job.dur) {
        const job = t.job;
        t.job = null;
        t.hidden = false;
        finishJob(state, job);
      }
      t.moving = false;
      t.inShadow = inShadow(state, t.x, t.y);
      return;
    }
  }
  if (input.interactPressed) {
    const it = findInteraction(state);
    if (it && it.kind !== 'none') t.job = { ...it, t: 0 };
  }
  let dx = input.dx;
  let dy = input.dy;
  const len = Math.hypot(dx, dy);
  t.moving = len > 0;
  if (t.moving) {
    dx /= len;
    dy /= len;
    const speed = t.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    t.x += dx * speed * dt;
    pushOutOfBoxes(t, THIEF.radius, state.solids);
    t.y += dy * speed * dt;
    pushOutOfBoxes(t, THIEF.radius, state.solids);
    t.facing = Math.atan2(dy, dx);
    t.stepT += dt;
    if (!t.sneaking && t.stepT > 0.32) {
      t.stepT = 0;
      emitNoise(state, t.x, t.y, THIEF.noiseRadius, 'step');
    }
  }
  t.inShadow = inShadow(state, t.x, t.y);
}
