// Plane geometry for the heist: ray casts against walls and smoke, circle-vs-box pushes, angles.

export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** The signed smallest turn from angle a to angle b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/** Turn `from` toward `to` by at most `step` radians. */
export function turnToward(from, to, step) {
  const d = angleDiff(from, to);
  return Math.abs(d) <= step ? to : from + Math.sign(d) * step;
}

/** The four edges of each box, as [x1, y1, x2, y2], for the ray caster. */
export function boxEdges(boxes) {
  const edges = [];
  for (const b of boxes) {
    const x2 = b.x + b.w;
    const y2 = b.y + b.h;
    edges.push([b.x, b.y, x2, b.y], [x2, b.y, x2, y2], [x2, y2, b.x, y2], [b.x, y2, b.x, b.y]);
  }
  return edges;
}

/** Distance along the ray (ox,oy)+t(dx,dy) to segment e, or Infinity. */
function raySegment(ox, oy, dx, dy, e) {
  const sx = e[2] - e[0];
  const sy = e[3] - e[1];
  const den = dx * sy - dy * sx;
  if (Math.abs(den) < 1e-9) return Infinity;
  const t = ((e[0] - ox) * sy - (e[1] - oy) * sx) / den;
  const u = ((e[0] - ox) * dy - (e[1] - oy) * dx) / den;
  return t >= 0 && u >= 0 && u <= 1 ? t : Infinity;
}

/** Distance along a unit ray to the edge of circle c (from outside), or Infinity. */
function rayCircle(ox, oy, dx, dy, c) {
  const fx = ox - c.x;
  const fy = oy - c.y;
  const b = fx * dx + fy * dy;
  const cc = fx * fx + fy * fy - c.r * c.r;
  if (cc < 0) return 0; // starting inside the smoke: blind at once
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
}

/** How far a unit ray travels before a wall edge or a smoke cloud stops it, capped at `max`. */
export function castRay(ox, oy, angle, max, edges, clouds) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = max;
  for (let i = 0; i < edges.length; i += 1) {
    const t = raySegment(ox, oy, dx, dy, edges[i]);
    if (t < best) best = t;
  }
  for (let i = 0; i < clouds.length; i += 1) {
    const t = rayCircle(ox, oy, dx, dy, clouds[i]);
    if (t < best) best = t;
  }
  return best;
}

/** True when nothing in `edges` or `clouds` stands between the two points. */
export function lineOfSight(ax, ay, bx, by, edges, clouds) {
  const d = dist(ax, ay, bx, by);
  if (d < 1) return true;
  return castRay(ax, ay, Math.atan2(by - ay, bx - ax), d, edges, clouds) >= d - 0.5;
}

/** The fan of points a cone of vision reaches: origin first, then the ray ends from one side to the other. */
export function conePolygon(ox, oy, facing, half, range, edges, clouds, rays = 44) {
  const pts = [[ox, oy]];
  for (let i = 0; i <= rays; i += 1) {
    const a = facing - half + (2 * half * i) / rays;
    const r = castRay(ox, oy, a, range, edges, clouds);
    pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]);
  }
  return pts;
}

/** Push a circle out of every box it overlaps; returns true when it touched one. */
export function pushOutOfBoxes(body, radius, boxes) {
  let hit = false;
  for (const b of boxes) {
    const nx = clamp(body.x, b.x, b.x + b.w);
    const ny = clamp(body.y, b.y, b.y + b.h);
    const dx = body.x - nx;
    const dy = body.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      body.x = nx + (dx / d) * radius;
      body.y = ny + (dy / d) * radius;
    } else {
      // centre inside the box: leave by the nearest side
      const left = body.x - b.x;
      const right = b.x + b.w - body.x;
      const top = body.y - b.y;
      const bottom = b.y + b.h - body.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) body.x = b.x - radius;
      else if (m === right) body.x = b.x + b.w + radius;
      else if (m === top) body.y = b.y - radius;
      else body.y = b.y + b.h + radius;
    }
  }
  return hit;
}

export function inCircle(x, y, c) {
  return dist(x, y, c.x, c.y) <= c.r;
}

export function inBox(x, y, b, pad = 0) {
  return x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
}

/** A tiny seeded random source (mulberry32) so screenshots and replays repeat exactly. */
export function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
