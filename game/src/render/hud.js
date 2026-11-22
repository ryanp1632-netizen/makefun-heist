// The heads-up display around the floor: the ALARM meter (CALM / ALERT / LOCKDOWN) top centre,
// floor and target, the objective checklist, the ON THE FLOOR roster of guards and cameras, a
// legend, the tool bar with prices, the getaway clock and the hold-E prompt.
import { ALARM, COLOR, PLAY, THROW_RANGE, TOOLS, VIEW } from '../config.js';
import { alarmLevel } from '../systems/alarm.js';
import { cameraStatus } from '../actors/cameras.js';
import { findInteraction } from '../actors/thief.js';
import { ALERT } from '../actors/guards.js';
import { guardConeColor } from './cones.js';
import { DECO, money, panel, pill, roundRect, text } from './draw-kit.js';

function alarmMeter(ctx, state) {
  const x = 372;
  const y = 10;
  const w = 380;
  const h = 22;
  const v = state.alarm.value;
  const lvl = alarmLevel(v);
  text(ctx, 'ALARM', x - 10, y + 17, { size: 15, color: COLOR.text, align: 'right' });
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = '#120f26';
  ctx.fill();
  const calmW = (w * ALARM.alertAt) / 100;
  ctx.fillStyle = 'rgba(88,224,138,0.18)';
  ctx.fillRect(x, y, calmW, h);
  ctx.fillStyle = 'rgba(255,180,60,0.16)';
  ctx.fillRect(x + calmW, y, w - calmW - 40, h);
  ctx.fillStyle = 'rgba(255,59,78,0.22)';
  ctx.fillRect(x + w - 40, y, 40, h);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, COLOR.calm);
  grad.addColorStop(0.34, COLOR.alert);
  grad.addColorStop(1, COLOR.lockdown);
  ctx.fillStyle = grad;
  roundRect(ctx, x + 2, y + 2, Math.max(0, (w - 4) * (v / 100)), h - 4, 4);
  ctx.fill();
  ctx.strokeStyle = state.alarm.flash > 0 ? '#fff' : COLOR.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();
  text(ctx, 'CALM', x + 6, y + 37, { size: 11, color: COLOR.calm });
  text(ctx, 'ALERT', x + calmW + 6, y + 37, { size: 11, color: COLOR.alert });
  text(ctx, 'LOCKDOWN', x + w, y + 37, { size: 11, color: COLOR.lockdown, align: 'right' });
  text(ctx, `${lvl.name} ${Math.round(v)}%`, x + w / 2, y + 16, { size: 14, color: '#fff', align: 'center' });
}

function topBar(ctx, state, run) {
  ctx.fillStyle = '#07061a';
  ctx.fillRect(0, 0, VIEW.width, PLAY.y);
  ctx.strokeStyle = COLOR.wallTrim;
  ctx.beginPath();
  ctx.moveTo(0, PLAY.y - 0.5);
  ctx.lineTo(VIEW.width, PLAY.y - 0.5);
  ctx.stroke();
  text(ctx, 'VELVET HOUR', 14, 24, { size: 20, color: COLOR.gold, font: DECO });
  text(ctx, `FLOOR ${state.floorIndex + 1}/3 · ${state.floor.name}`, 14, 45, { size: 12, color: COLOR.dim });
  alarmMeter(ctx, state);
  const loot = state.floor.loot;
  text(ctx, 'TARGET', 790, 22, { size: 11, color: COLOR.dim });
  text(ctx, money(loot.value), 1000, 22, { size: 13, color: COLOR.gold, align: 'right' });
  text(ctx, `${loot.name}`, 790, 42, { size: 14, color: '#ffe9a8' });
  text(ctx, 'CREW CASH', 1030, 22, { size: 11, color: COLOR.dim });
  text(ctx, money(run.cash), 1030, 40, { size: 15, color: COLOR.calm });
  text(ctx, 'TAKE', 1170, 22, { size: 11, color: COLOR.dim });
  text(ctx, money(run.take), 1170, 40, { size: 15, color: COLOR.gold });
}

function sidePanel(ctx, state) {
  const x = PLAY.x + PLAY.w + 8;
  const w = VIEW.width - x - 8;
  let y = PLAY.y + 8;
  // objective
  panel(ctx, x, y, w, 112);
  text(ctx, 'OBJECTIVE', x + 12, y + 20, { size: 13, color: COLOR.gold });
  const lifted = state.thief.hasLoot;
  text(ctx, `${lifted ? '☑' : '☐'} 1  Lift ${state.floor.loot.name}`, x + 12, y + 42, { size: 12, color: lifted ? COLOR.calm : COLOR.text });
  text(ctx, `☐ 2  Reach the GETAWAY CAR`, x + 12, y + 61, { size: 12, color: lifted ? COLOR.text : COLOR.dim });
  text(ctx, 'WIN: loot + car before LOCKDOWN', x + 12, y + 83, { size: 11, color: COLOR.calm });
  text(ctx, 'LOSE: caught, or ALARM hits 100%', x + 12, y + 101, { size: 11, color: COLOR.lockdown });
  y += 120;
  // roster
  const rows = state.guards.length + state.cameras.length;
  const rh = 21;
  panel(ctx, x, y, w, 34 + rows * rh);
  text(ctx, 'ON THE FLOOR', x + 12, y + 21, { size: 13, color: COLOR.gold });
  text(ctx, `${state.guards.length} guards · ${state.cameras.length} cam${state.cameras.length === 1 ? '' : 's'}`, x + w - 12, y + 21, { size: 11, color: COLOR.dim, align: 'right' });
  y += 34;
  for (const g of state.guards) {
    const c = guardConeColor(g);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 10);
    ctx.arc(x + 14, y + 10, 9, -0.6, 0.6);
    ctx.closePath();
    ctx.fill();
    text(ctx, `GUARD ${g.name}`, x + 30, y + 14, { size: 12 });
    const pct = g.mode === ALERT ? '!' : g.suspicion > 0.02 ? `? ${Math.round(g.suspicion * 100)}%` : '';
    text(ctx, `${g.mode} ${pct}`, x + w - 12, y + 14, { size: 11, color: `rgb(${c[0]},${c[1]},${c[2]})`, align: 'right' });
    y += rh;
  }
  for (const cam of state.cameras) {
    const dead = cam.cut || cam.offT > 0;
    ctx.fillStyle = dead ? COLOR.emp : '#ff5abe';
    ctx.fillRect(x + 8, y + 5, 12, 10);
    text(ctx, `CAMERA ${cam.id}`, x + 30, y + 14, { size: 12 });
    text(ctx, cameraStatus(cam), x + w - 12, y + 14, { size: 11, color: dead ? COLOR.emp : cam.sees ? COLOR.lockdown : '#ffb3e6', align: 'right' });
    y += rh;
  }
  y += 8;
  // legend
  const items = [
    ['shadow', 'SHADOW POOL = safe, cams blind'],
    ['cone', 'GUARD CONE = danger, walls cut it'],
    ['cam', 'CAMERA ARC = alarm rises fast'],
    ['vent', 'VENT = hidden crawl (E)'],
    ['glass', 'GLASS = see-through, cut it (4)'],
    ['box', 'JUNCTION BOX = cut cam wire (E)'],
    ['loot', 'LOOT PLINTH · then GETAWAY CAR'],
  ];
  const lh = Math.min(22, (PLAY.y + PLAY.h - y - 40) / items.length);
  panel(ctx, x, y, w, 32 + items.length * lh);
  text(ctx, 'LEGEND', x + 12, y + 20, { size: 13, color: COLOR.gold });
  y += 30;
  for (const [kind, label] of items) {
    const ix = x + 16;
    const iy = y + lh / 2;
    if (kind === 'shadow') {
      ctx.fillStyle = 'rgba(30,14,110,0.95)';
      ctx.beginPath();
      ctx.arc(ix, iy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8f7dff';
      ctx.stroke();
    } else if (kind === 'cone' || kind === 'cam') {
      ctx.fillStyle = kind === 'cone' ? 'rgba(255,190,90,0.9)' : 'rgba(255,70,190,0.9)';
      ctx.beginPath();
      ctx.moveTo(ix - 7, iy);
      ctx.lineTo(ix + 8, iy - 7);
      ctx.lineTo(ix + 8, iy + 7);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'vent') {
      ctx.strokeStyle = '#7ab8ff';
      ctx.strokeRect(ix - 7, iy - 7, 14, 14);
    } else if (kind === 'glass') {
      ctx.fillStyle = COLOR.glass;
      ctx.fillRect(ix - 8, iy - 4, 16, 8);
      ctx.strokeStyle = COLOR.glassEdge;
      ctx.strokeRect(ix - 8, iy - 4, 16, 8);
    } else if (kind === 'box') {
      ctx.fillStyle = '#4b1d3d';
      ctx.fillRect(ix - 6, iy - 6, 12, 12);
      ctx.strokeStyle = '#ff5abe';
      ctx.strokeRect(ix - 6, iy - 6, 12, 12);
    } else {
      ctx.fillStyle = COLOR.gold;
      ctx.fillRect(ix - 6, iy - 6, 12, 12);
    }
    text(ctx, label, x + 32, iy + 4, { size: 11, color: COLOR.text, weight: 'normal' });
    y += lh;
  }
  // the blueprint's routes, as a reminder of the plan
  y += 12;
  const room = PLAY.y + PLAY.h - 6 - y;
  if (room < 84) return;
  panel(ctx, x, y, w, 30 + state.floor.routes.length * 20);
  text(ctx, 'ROUTES TO THE LOOT', x + 12, y + 20, { size: 13, color: COLOR.gold });
  state.floor.routes.forEach((r, i) => {
    ctx.fillStyle = r.color;
    ctx.fillRect(x + 12, y + 31 + i * 20, 12, 8);
    text(ctx, r.label, x + 32, y + 40 + i * 20, { size: 11, weight: 'normal' });
  });
}

function toolBar(ctx, state, run) {
  const y = PLAY.y + PLAY.h;
  ctx.fillStyle = '#07061a';
  ctx.fillRect(0, y, VIEW.width, VIEW.height - y);
  ctx.strokeStyle = COLOR.wallTrim;
  ctx.beginPath();
  ctx.moveTo(0, y + 0.5);
  ctx.lineTo(VIEW.width, y + 0.5);
  ctx.stroke();
  text(ctx, 'TOOLS', 14, y + 34, { size: 13, color: COLOR.gold });
  TOOLS.forEach((tool, i) => {
    const x = 70 + i * 168;
    const sel = run.selected === tool.id;
    const n = state.tools[tool.id];
    panel(ctx, x, y + 8, 160, 40, sel ? COLOR.gold : COLOR.panelEdge);
    text(ctx, `${tool.key}`, x + 12, y + 34, { size: 16, color: sel ? COLOR.gold : COLOR.dim });
    text(ctx, tool.name, x + 30, y + 26, { size: 12, color: n > 0 ? COLOR.text : COLOR.dim });
    text(ctx, `x${n}`, x + 150, y + 26, { size: 13, color: n > 0 ? COLOR.calm : COLOR.dim, align: 'right' });
    text(ctx, `${money(tool.price)} each`, x + 30, y + 42, { size: 10, color: COLOR.dim, weight: 'normal' });
  });
  text(ctx, 'WASD move · SHIFT sneak · E hold to act · CLICK throw tool · 1-4 pick tool · R retry', 1266, y + 24, { size: 11, color: COLOR.dim, align: 'right', weight: 'normal' });
  text(ctx, 'Seen by a cone = ? fills (short grace). Full ? = ! chase + alarm.', 1266, y + 42, { size: 11, color: COLOR.dim, align: 'right', weight: 'normal' });
}

function getawayClock(ctx, state) {
  if (!state.thief.hasLoot) return;
  const t = Math.ceil(state.getawayT);
  const urgent = t <= 10;
  pill(ctx, `GETAWAY  0:${String(t).padStart(2, '0')}  → CAR`, 500, PLAY.y + 26, {
    size: 18,
    color: urgent ? '#ffd0d4' : '#bfffe2',
    bg: urgent ? 'rgba(90,10,20,0.92)' : 'rgba(6,40,28,0.92)',
    edge: urgent ? COLOR.lockdown : COLOR.exit,
  });
}

/** A gold chevron beside Moth pointing at the current objective: the loot, then the car. */
function objectiveArrow(ctx, state) {
  const t = state.thief;
  if (t.hidden) return;
  const e = state.floor.exit;
  const goal = t.hasLoot ? { x: e.x + e.w / 2, y: e.y + e.h / 2, label: 'CAR' } : { x: state.floor.loot.x, y: state.floor.loot.y, label: 'LOOT' };
  const d = Math.hypot(goal.x - t.x, goal.y - t.y);
  if (d < 70) return;
  const a = Math.atan2(goal.y - t.y, goal.x - t.x);
  const pulse = 34 + 3 * Math.sin(state.time * 6);
  ctx.save();
  ctx.translate(t.x + Math.cos(a) * pulse, t.y + Math.sin(a) * pulse);
  ctx.rotate(a);
  ctx.fillStyle = t.hasLoot ? COLOR.exit : COLOR.gold;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-5, -7);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The floor's title card, fading out over the first seconds. */
function introCard(ctx, state) {
  if (!(state.introT > 0)) return;
  const k = Math.min(1, state.introT / 0.6);
  ctx.save();
  ctx.globalAlpha = k;
  const cx = PLAY.x + PLAY.w / 2;
  const cy = PLAY.y + 150;
  panel(ctx, cx - 300, cy - 58, 600, 116, COLOR.gold);
  text(ctx, `FLOOR ${state.floorIndex + 1}/3 · ${state.floor.name}`, cx, cy - 18, { size: 26, color: COLOR.gold, align: 'center', font: DECO });
  text(ctx, `Lift ${state.floor.loot.name} (${money(state.floor.loot.value)}) and reach the GETAWAY CAR`, cx, cy + 12, { size: 15, color: COLOR.text, align: 'center' });
  text(ctx, `${state.guards.length} guards · ${state.cameras.length} camera${state.cameras.length === 1 ? '' : 's'} · follow the gold arrow`, cx, cy + 38, { size: 13, color: COLOR.dim, align: 'center', weight: 'normal' });
  ctx.restore();
}

function prompts(ctx, state, run) {
  objectiveArrow(ctx, state);
  const it = findInteraction(state);
  if (it && !state.thief.job) pill(ctx, it.label, state.thief.x, state.thief.y - 44, { size: 12, color: '#fff3c4', edge: COLOR.gold });
  if (state.message.t > 0) pill(ctx, state.message.text, PLAY.x + PLAY.w / 2, PLAY.y + PLAY.h - 22, { size: 13, color: '#fff', edge: COLOR.panelEdge });
  if (run.mouse && run.selected !== 'cutter' && state.tools[run.selected] > 0) {
    const t = state.thief;
    const d = Math.hypot(run.mouse.x - t.x, run.mouse.y - t.y);
    const k = Math.min(1, THROW_RANGE / Math.max(1, d));
    const x = t.x + (run.mouse.x - t.x) * k;
    const y = t.y + (run.mouse.y - t.y) * k;
    ctx.strokeStyle = 'rgba(255,233,168,0.8)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Danger creeping in from the edges while a "?" fills or a camera records, with who is onto you. */
function tension(ctx, state) {
  let worst = null;
  for (const g of state.guards) if (g.suspicion > 0.05 && (!worst || g.suspicion > worst.suspicion)) worst = g;
  const cam = state.cameras.find((c) => c.sees);
  const k = Math.max(worst ? Math.min(1, worst.suspicion) : 0, cam ? 0.8 : 0, state.alarm.value >= ALARM.alertAt ? 0.35 : 0);
  if (k <= 0) return;
  const cx = PLAY.x + PLAY.w / 2;
  const cy = PLAY.y + PLAY.h / 2;
  const g = ctx.createRadialGradient(cx, cy, PLAY.h * 0.42, cx, cy, PLAY.w * 0.62);
  g.addColorStop(0, 'rgba(255,40,60,0)');
  g.addColorStop(1, `rgba(255,40,60,${0.32 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  let warn = '';
  if (cam) warn = `${cam.id} IS RECORDING YOU: get out of the pink arc!`;
  else if (worst && worst.mode !== ALERT) warn = `${worst.name} is getting suspicious (${Math.round(worst.suspicion * 100)}%): break line of sight`;
  else if (worst) warn = `${worst.name} IS CHASING YOU: smoke, shadows or run`;
  if (warn) pill(ctx, warn, cx + 90, PLAY.y + (state.thief.hasLoot ? 62 : 26), { size: 13, color: '#ffd9a8', bg: 'rgba(60,8,14,0.9)', edge: COLOR.lockdown });
}

export function drawHud(ctx, state, run) {
  tension(ctx, state);
  topBar(ctx, state, run);
  sidePanel(ctx, state);
  toolBar(ctx, state, run);
  getawayClock(ctx, state);
  introCard(ctx, state);
  prompts(ctx, state, run);
}
