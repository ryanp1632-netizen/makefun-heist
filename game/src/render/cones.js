// The danger layer: guard cones that warm from pale gold (PATROL) to orange (SUSPICIOUS) to red
// (ALERT), magenta camera arcs, smoke clouds that cut them, noise rings and EMP sparks.
import { COLOR } from '../config.js';
import { ALERT, INVESTIGATE, SEARCH, SUSPICIOUS } from '../actors/guards.js';
import { cameraCone, guardCone } from '../systems/vision.js';
import { rgba } from './draw-kit.js';

function fillFan(ctx, pts, rgb, alpha, edgeAlpha) {
  const [ox, oy] = pts[0];
  let far = 0;
  for (const [x, y] of pts) far = Math.max(far, Math.hypot(x - ox, y - oy));
  const g = ctx.createRadialGradient(ox, oy, 6, ox, oy, Math.max(20, far));
  g.addColorStop(0, rgba(rgb, alpha));
  g.addColorStop(1, rgba(rgb, alpha * 0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(rgb, edgeAlpha);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function guardConeColor(guard) {
  if (guard.mode === ALERT) return COLOR.coneAlert;
  if (guard.mode === SUSPICIOUS || guard.mode === INVESTIGATE || guard.mode === SEARCH) return COLOR.coneSus;
  return COLOR.coneCalm;
}

export function drawCones(ctx, state) {
  for (const cam of state.cameras) {
    if (cam.cut || cam.offT > 0) continue;
    fillFan(ctx, cameraCone(state, cam), COLOR.coneCam, cam.sees ? 0.5 : 0.28, cam.sees ? 0.95 : 0.6);
  }
  for (const g of state.guards) {
    const rgb = guardConeColor(g);
    fillFan(ctx, guardCone(state, g), rgb, g.sees ? 0.5 : 0.3, g.sees ? 1 : 0.65);
  }
}

export function drawSmokeAndNoise(ctx, state) {
  for (const n of state.noises) {
    if (n.kind === 'step' && n.t > 0.4) continue;
    const k = n.t / n.life;
    ctx.strokeStyle = n.kind === 'coin' ? `rgba(255,216,74,${1 - k})` : `rgba(230,230,255,${0.5 * (1 - k)})`;
    ctx.lineWidth = n.kind === 'coin' ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius * (n.kind === 'step' ? 0.35 + k : k), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const c of state.clouds) {
    for (let i = 0; i < 7; i += 1) {
      const a = i * 0.9 + c.t * 0.4;
      const ox = Math.cos(a) * c.r * 0.35;
      const oy = Math.sin(a) * c.r * 0.35;
      ctx.fillStyle = 'rgba(205,210,230,0.2)';
      ctx.beginPath();
      ctx.arc(c.x + ox, c.y + oy, c.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const e of state.effects) {
    const k = e.t / e.life;
    if (e.kind === 'emp') {
      ctx.strokeStyle = `rgba(122,246,255,${1 - k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10 + 50 * k, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === 'coin') {
      ctx.fillStyle = `rgba(255,216,74,${1 - k})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 18 * Math.sin(k * Math.PI), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
