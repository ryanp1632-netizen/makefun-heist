// The kit bag: smoke, EMP tags, coins and glass cutters, bought on the blueprint with the
// crew's cash, then thrown at the cursor (the cutter is used with E at a glass wall).
import { THROW_RANGE, TOOLS } from '../config.js';
import { dist } from '../geometry.js';
import { emitNoise } from './noise.js';

export function toolById(id) {
  return TOOLS.find((t) => t.id === id);
}

export function emptyKit() {
  return { smoke: 0, emp: 0, coin: 0, cutter: 0 };
}

/** Clamp a throw target to the thief's arm. */
export function throwPoint(thief, x, y) {
  const d = dist(thief.x, thief.y, x, y);
  if (d <= THROW_RANGE) return { x, y };
  const k = THROW_RANGE / d;
  return { x: thief.x + (x - thief.x) * k, y: thief.y + (y - thief.y) * k };
}

/** Use the selected tool at (x, y); returns a short message for the HUD. */
export function useTool(state, id, x, y) {
  const tool = toolById(id);
  if (!tool) return '';
  if (state.tools[id] <= 0) return `No ${tool.name} left`;
  const p = throwPoint(state.thief, x, y);
  if (id === 'cutter') return 'Walk up to a glass wall and HOLD E to cut it';
  if (id === 'emp') {
    const cam = state.cameras.find((c) => !c.cut && dist(c.x, c.y, p.x, p.y) < tool.radius);
    if (!cam) return 'Aim the EMP TAG at a camera';
    cam.offT = tool.duration;
    state.effects.push({ kind: 'emp', x: cam.x, y: cam.y, t: 0, life: 0.8 });
    state.events.push('emp');
  } else if (id === 'smoke') {
    state.clouds.push({ x: p.x, y: p.y, r: 10, full: tool.radius, t: 0, life: tool.duration });
    state.events.push('smoke');
  } else if (id === 'coin') {
    emitNoise(state, p.x, p.y, tool.radius, 'coin');
    state.effects.push({ kind: 'coin', x: p.x, y: p.y, t: 0, life: 1.2 });
  }
  state.tools[id] -= 1;
  state.stats.toolsUsed += 1;
  return `${tool.name} used`;
}

/** Grow and fade the smoke clouds. */
export function stepClouds(state, dt) {
  for (const c of state.clouds) {
    c.t += dt;
    c.r = Math.min(c.full, 10 + c.t * 160);
    if (c.life - c.t < 1) c.r = c.full * Math.max(0.05, c.life - c.t);
  }
  state.clouds = state.clouds.filter((c) => c.t < c.life);
  for (const e of state.effects) e.t += dt;
  state.effects = state.effects.filter((e) => e.t < e.life);
}
