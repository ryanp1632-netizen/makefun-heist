// Sounds guards can hear: Moth's footsteps, a picked lock, a thrown coin. Each noise is a ring
// that grows and fades; a guard inside it turns to investigate (walls halve how far it carries).
import { lineOfSight } from '../geometry.js';

export function emitNoise(state, x, y, radius, kind) {
  state.noises.push({ x, y, radius, kind, t: 0, life: kind === 'coin' ? 1.2 : 0.6, heard: false });
  if (kind === 'coin') state.events.push('coin');
  else if (kind === 'step') state.events.push('step');
}

/** Hand fresh noises to every guard in earshot, then age the rings. */
export function stepNoises(state, dt, onHeard) {
  for (const n of state.noises) {
    if (!n.heard) {
      n.heard = true;
      for (const g of state.guards) {
        const d = Math.hypot(g.x - n.x, g.y - n.y);
        const carry = lineOfSight(g.x, g.y, n.x, n.y, state.sightEdges, []) ? n.radius : n.radius * 0.5;
        if (d <= carry) onHeard(g, n);
      }
    }
    n.t += dt;
  }
  state.noises = state.noises.filter((n) => n.t < n.life);
}
