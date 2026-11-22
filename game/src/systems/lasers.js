// Laser tripwires: red beams strung between two emitters that blink on and off on a fixed beat.
// Crossing a live beam trips it: the alarm jumps and the nearest guard comes running. Read the
// beat, wait for the gap, slip through.
import { raiseAlarm } from './alarm.js';
import { radioGuards } from '../actors/guards.js';

export const LASER_TRIP = 22;

export function makeLasers(floor) {
  return (floor.lasers ?? []).map((l, i) => ({ ...l, id: `LASER ${String.fromCharCode(65 + i)}`, live: true, tripT: 0 }));
}

/** Is the beam live at this moment of the floor's clock? */
export function laserLive(laser, time) {
  const cycle = laser.on + laser.off;
  return ((time + (laser.phase ?? 0)) % cycle) < laser.on;
}

/** Seconds until the beam next switches (for the on-screen beat). */
export function laserSwitchIn(laser, time) {
  const cycle = laser.on + laser.off;
  const t = (time + (laser.phase ?? 0)) % cycle;
  return t < laser.on ? laser.on - t : cycle - t;
}

function segmentDistance(px, py, [ax, ay], [bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const k = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + vx * k), py - (ay + vy * k));
}

export function stepLasers(state, dt) {
  const t = state.thief;
  for (const l of state.lasers) {
    l.live = laserLive(l, state.time);
    if (l.tripT > 0) l.tripT -= dt;
    if (!l.live || t.hidden || l.tripT > 0) continue;
    if (segmentDistance(t.x, t.y, l.a, l.b) < 9) {
      l.tripT = 1.5;
      state.stats.lasersTripped = (state.stats.lasersTripped ?? 0) + 1;
      raiseAlarm(state, LASER_TRIP);
      radioGuards(state, t.x, t.y);
      state.events.push('laser');
      state.message = { text: `${l.id} TRIPPED! Watch the beat: beams blink off for a moment.`, t: 2.5 };
    }
  }
}
