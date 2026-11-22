// The cast, drawn from above: Moth in a violet moth-wing cape, guards in navy caps with a
// suspicion pip ("?" filling, then "!") and speech bubbles, and the wall cameras.
import { COLOR, PLAY } from '../config.js';
import { ALERT } from '../actors/guards.js';
import { pill, roundRect, text, FONT } from './draw-kit.js';
import { guardConeColor } from './cones.js';

/** Soft violet footprints, fading with age: the route Moth has taken so far. */
function drawFootprints(ctx, t) {
  const n = t.trail.length;
  t.trail.forEach((p, i) => {
    const side = p.left ? -1 : 1;
    ctx.save();
    ctx.translate(p.x + Math.cos(p.a + Math.PI / 2) * 4 * side, p.y + Math.sin(p.a + Math.PI / 2) * 4 * side);
    ctx.rotate(p.a);
    ctx.fillStyle = `rgba(201,162,255,${0.12 + 0.5 * (i / n)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function drawThief(ctx, state) {
  const t = state.thief;
  drawFootprints(ctx, t);
  if (t.hidden) {
    pill(ctx, 'IN THE VENT...', t.x, t.y - 24, { size: 11, color: '#bcd8ff' });
    return;
  }
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.globalAlpha = t.inShadow ? 0.62 : 1;
  ctx.rotate(t.facing + Math.PI / 2);
  ctx.scale(1.35, 1.35);
  // moth-wing cape
  ctx.fillStyle = COLOR.thiefCape;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-19, 4, -15, 16);
  ctx.quadraticCurveTo(0, 10, 15, 16);
  ctx.quadraticCurveTo(19, 4, 0, -2);
  ctx.fill();
  ctx.fillStyle = COLOR.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(-7, -4, 14, 4); // the mask
  ctx.fillStyle = '#fff';
  ctx.fillRect(-5, -3, 3, 2);
  ctx.fillRect(2, -3, 3, 2);
  if (t.hasLoot) {
    ctx.fillStyle = state.floor.loot.gem;
    ctx.beginPath();
    ctx.arc(0, 11, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = t.inShadow ? 'rgba(160,140,255,0.9)' : 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
  ctx.stroke();
  const tag = t.inShadow ? 'MOTH (you) · HIDDEN' : t.sneaking ? 'MOTH (you) · sneaking' : 'MOTH (you)';
  pill(ctx, tag, t.x, t.y + 27, { size: 11, color: t.inShadow ? '#cbbcff' : '#fff' });
  if (t.job) {
    const k = t.job.t / t.job.dur;
    ctx.strokeStyle = COLOR.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    ctx.stroke();
  }
}

function suspicionPip(ctx, g) {
  if (g.suspicion <= 0.01 && g.mode !== ALERT) return;
  const x = g.x;
  const y = g.y - 30;
  const alert = g.mode === ALERT;
  ctx.fillStyle = 'rgba(6,5,16,0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alert ? COLOR.lockdown : COLOR.alert;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (alert ? 1 : g.suspicion));
  ctx.stroke();
  text(ctx, alert ? '!' : '?', x, y + 6, { size: 17, color: alert ? COLOR.lockdown : COLOR.alert, align: 'center' });
}

function bubble(ctx, g) {
  if (!g.bubble || g.bubbleT <= 0) return;
  ctx.font = `bold 12px ${FONT}`;
  const w = ctx.measureText(g.bubble).width + 16;
  const flip = g.x + 16 + w > PLAY.x + PLAY.w - 6; // keep the bubble on the floor plan
  const x = flip ? g.x - 16 - w : g.x + 16;
  const y = g.y - 62;
  roundRect(ctx, x, y, w, 22, 6);
  ctx.fillStyle = '#fbf3dc';
  ctx.fill();
  ctx.beginPath();
  const tx = flip ? x + w - 6 : x + 6;
  ctx.moveTo(tx, y + 22);
  ctx.lineTo(flip ? tx + 4 : tx - 4, y + 32);
  ctx.lineTo(flip ? tx - 10 : tx + 10, y + 22);
  ctx.fill();
  text(ctx, g.bubble, x + 8, y + 15, { size: 12, color: '#1a1030' });
}

export function drawGuards(ctx, state) {
  for (const g of state.guards) {
    // patrol route: a faint dotted loop so routes can be read before moving
    ctx.setLineDash([2, 8]);
    ctx.strokeStyle = 'rgba(255,222,130,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    g.route.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (g.route.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const g of state.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.facing);
    ctx.scale(1.3, 1.3);
    ctx.fillStyle = '#1d2a55';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9c39b';
    ctx.beginPath();
    ctx.arc(2, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1430';
    ctx.beginPath();
    ctx.arc(0, 0, 7, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    // flashlight
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(10, 5, 7, 4);
    ctx.restore();
    const c = guardConeColor(g);
    pill(ctx, `${g.name} · ${g.mode}`, g.x, g.y + 25, { size: 10, color: `rgb(${c[0]},${c[1]},${c[2]})` });
    suspicionPip(ctx, g);
    bubble(ctx, g);
  }
}

export function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    const dead = cam.cut || cam.offT > 0;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = dead ? '#3d3d4a' : '#2b0f2a';
    ctx.fillRect(-8, -8, 22, 16);
    ctx.strokeStyle = dead ? '#777' : '#ff5abe';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 22, 16);
    ctx.fillStyle = dead ? '#555' : cam.sees || Math.sin(state.time * 8) > 0 ? '#ff2a4a' : '#5a1020';
    ctx.beginPath();
    ctx.arc(10, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const label = cam.cut ? `${cam.id} · CUT` : cam.offT > 0 ? `${cam.id} · EMP ${Math.ceil(cam.offT)}s` : `${cam.id}`;
    const ox = Math.cos(cam.base) * 30;
    const oy = Math.sin(cam.base) * 22;
    pill(ctx, label, cam.x + ox, cam.y + oy, { size: 10, color: dead ? COLOR.emp : '#ffb3e6' });
    if (cam.offT > 0) {
      ctx.strokeStyle = COLOR.emp;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        const a = state.time * 9 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.lineTo(cam.x + Math.cos(a) * 16, cam.y + Math.sin(a) * 16);
        ctx.stroke();
      }
    }
  }
}
