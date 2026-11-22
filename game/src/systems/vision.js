// Who can see Moth: guard cones (shortened in shadow pools) and camera arcs (blind to shadows),
// all cut by walls, closed doors and smoke. Glass walls block feet, never eyes.
import { CAMERA, GUARD } from '../config.js';
import { angleDiff, conePolygon, dist, inCircle, lineOfSight } from '../geometry.js';

/** Is the thief standing in one of the floor's shadow pools? */
export function inShadow(state, x, y) {
  for (const s of state.floor.shadows) if (inCircle(x, y, s)) return true;
  return false;
}

/** The distance at which this guard would notice the thief right now (0 when he cannot). */
export function guardReach(state) {
  const t = state.thief;
  if (t.hidden) return 0;
  let reach = GUARD.coneRange;
  if (t.inShadow) reach *= t.sneaking ? GUARD.shadowRange * 0.7 : GUARD.shadowRange;
  else if (t.sneaking) reach *= 0.85;
  return reach;
}

/** True when the guard's cone covers the thief and nothing stands between them. */
export function guardSeesThief(state, guard) {
  const t = state.thief;
  const reach = guardReach(state);
  if (reach <= 0) return false;
  const d = dist(guard.x, guard.y, t.x, t.y);
  if (d > reach) return false;
  if (d > GUARD.radius + 16 && Math.abs(angleDiff(guard.facing, Math.atan2(t.y - guard.y, t.x - guard.x))) > GUARD.coneHalf) return false;
  return lineOfSight(guard.x, guard.y, t.x, t.y, state.sightEdges, state.clouds);
}

/** True when a working camera's arc covers the thief outside the shadows. */
export function cameraSeesThief(state, cam) {
  const t = state.thief;
  if (cam.cut || cam.offT > 0 || t.hidden || t.inShadow) return false;
  const d = dist(cam.x, cam.y, t.x, t.y);
  if (d > CAMERA.range) return false;
  if (Math.abs(angleDiff(cam.angle, Math.atan2(t.y - cam.y, t.x - cam.x))) > CAMERA.half) return false;
  return lineOfSight(cam.x, cam.y, t.x, t.y, state.sightEdges, state.clouds);
}

/** The visible fan of a guard's cone, for drawing. */
export function guardCone(state, guard) {
  return conePolygon(guard.x, guard.y, guard.facing, GUARD.coneHalf, GUARD.coneRange, state.sightEdges, state.clouds);
}

export function cameraCone(state, cam) {
  return conePolygon(cam.x, cam.y, cam.angle, CAMERA.half, CAMERA.range, state.sightEdges, state.clouds, 30);
}
