// Full-screen moments: the title card, the planning blueprint with routes and the tool shop,
// the SPOTTED freeze frame, the CAUGHT card, each floor's results and the night's finale.
import { COLOR, PLAY, TOOLS, VIEW, CAMERA, GUARD } from '../config.js';
import { FLOORS } from '../floors.js';
import { guardCone } from '../systems/vision.js';
import { DECO, money, panel, pill, roundRect, text } from './draw-kit.js';

function dim(ctx, a) {
  ctx.fillStyle = `rgba(5,4,14,${a})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function decoFrame(ctx, x, y, w, h) {
  ctx.strokeStyle = COLOR.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.beginPath();
    for (let i = 1; i <= 3; i += 1) {
      ctx.moveTo(cx + sx * 6 * i, cy + sy * 6);
      ctx.lineTo(cx + sx * 6, cy + sy * 6 * i);
    }
    ctx.stroke();
  }
}

function logo(ctx, x, y, size) {
  text(ctx, 'VELVET HOUR', x, y, { size, color: COLOR.gold, align: 'center', font: DECO });
  ctx.strokeStyle = COLOR.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - size * 3.6, y + 12);
  ctx.lineTo(x + size * 3.6, y + 12);
  ctx.stroke();
}

export function drawTitle(ctx, time) {
  dim(ctx, 0.72);
  decoFrame(ctx, 150, 40, 980, 640);
  logo(ctx, 640, 130, 64);
  text(ctx, 'One night. Three floors of the Marlowe Grand. One thief called MOTH.', 640, 172, { size: 18, color: COLOR.text, align: 'center', weight: 'normal' });
  const cols = [
    ['THE JOB', ['Plan each floor on the blueprint and', 'buy tools with the crew\'s cash.', 'Slip past guards and cameras, lift', 'the loot from its gold plinth, then', 'run for the GETAWAY CAR.']],
    ['THE RULES', ['WIN a floor: loot in hand + reach the car.', 'LOSE it: a guard catches you, or the', 'ALARM meter fills to LOCKDOWN.', 'Shadow pools hide you; cameras', 'cannot see into them at all.']],
    ['CONTROLS', ['WASD / arrows  move', 'SHIFT  sneak (silent, slow)', 'E (hold)  lift · pick · cut · vent', 'CLICK  throw the selected tool', '1-4  smoke · EMP · coin · cutter']],
  ];
  cols.forEach(([head, lines], i) => {
    const x = 200 + i * 300;
    panel(ctx, x, 210, 280, 210);
    text(ctx, head, x + 16, 240, { size: 17, color: COLOR.gold });
    lines.forEach((l, j) => text(ctx, l, x + 16, 272 + j * 27, { size: 14, color: COLOR.text, weight: 'normal' }));
  });
  panel(ctx, 200, 440, 880, 120);
  text(ctx, 'TONIGHT\'S FLOORS', 220, 470, { size: 15, color: COLOR.gold });
  FLOORS.forEach((f, i) => {
    const x = 220 + i * 290;
    text(ctx, `${i + 1}. ${f.name}`, x, 500, { size: 14 });
    text(ctx, `${f.loot.name}`, x, 522, { size: 13, color: '#ffe9a8', weight: 'normal' });
    text(ctx, `${money(f.loot.value)} · ${f.guards.length} guards · ${f.cameras.length} cam${f.cameras.length === 1 ? '' : 's'}`, x, 543, { size: 12, color: COLOR.dim, weight: 'normal' });
  });
  const blink = Math.sin(time * 4) > -0.3;
  if (blink) pill(ctx, 'PRESS ENTER TO PLAN THE JOB', 640, 610, { size: 20, color: '#1a1030', bg: COLOR.gold });
}

/** The blueprint of a floor: walls, guard routes, camera arcs, the loot, and routes A/B/C. */
function blueprint(ctx, floor, ox, oy, scale) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.translate(-PLAY.x, -PLAY.y);
  ctx.fillStyle = '#0d2f5e';
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  ctx.strokeStyle = 'rgba(160,210,255,0.13)';
  ctx.lineWidth = 1;
  for (let x = PLAY.x; x <= PLAY.x + PLAY.w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, PLAY.y);
    ctx.lineTo(x, PLAY.y + PLAY.h);
    ctx.stroke();
  }
  for (let y = PLAY.y; y <= PLAY.y + PLAY.h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(PLAY.x, y);
    ctx.lineTo(PLAY.x + PLAY.w, y);
    ctx.stroke();
  }
  for (const s of floor.shadows) {
    ctx.fillStyle = 'rgba(40,20,120,0.6)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of floor.cameras) {
    ctx.fillStyle = 'rgba(255,70,190,0.22)';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.arc(c.x, c.y, CAMERA.range, c.facing - c.sweep - CAMERA.half, c.facing + c.sweep + CAMERA.half);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5abe';
    ctx.fillRect(c.x - 7, c.y - 7, 14, 14);
    pill(ctx, `${c.id} sweeps`, c.x + Math.cos(c.facing) * 46, c.y + Math.sin(c.facing) * 36, { size: 13, color: '#ffb3e6' });
  }
  ctx.strokeStyle = '#e8f4ff';
  ctx.lineWidth = 3;
  for (const w of floor.walls) ctx.strokeRect(w.x, w.y, w.w, w.h);
  ctx.strokeStyle = '#9ff0ff';
  ctx.setLineDash([6, 4]);
  for (const g of floor.glass) ctx.strokeRect(g.x, g.y, g.w, g.h);
  ctx.strokeStyle = '#f0c25a';
  for (const d of floor.doors) ctx.strokeRect(d.x, d.y, d.w, d.h);
  ctx.setLineDash([]);
  for (const g of floor.guards) {
    ctx.strokeStyle = 'rgba(255,222,130,0.9)';
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    g.route.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (g.route.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    const [x, y] = g.route[0];
    ctx.fillStyle = 'rgba(255,222,130,0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    const [nx, ny] = g.route[1];
    const f = Math.atan2(ny - y, nx - x);
    ctx.arc(x, y, GUARD.coneRange * 0.6, f - GUARD.coneHalf, f + GUARD.coneHalf);
    ctx.closePath();
    ctx.fill();
    pill(ctx, `${g.name}`, x, y - 22, { size: 14, color: '#ffe9a8' });
  }
  for (const r of floor.routes) {
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 8]);
    ctx.beginPath();
    r.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    const [mx, my] = r.points[Math.floor(r.points.length / 2)];
    pill(ctx, r.label.split('  ')[0], mx, my, { size: 18, color: '#08142a', bg: r.color });
  }
  for (const v of floor.vents) for (const p of [v.a, v.b]) {
    ctx.strokeStyle = '#7ab8ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x - 12, p.y - 12, 24, 24);
  }
  ctx.fillStyle = COLOR.gold;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 9 : 22;
    ctx.lineTo(floor.loot.x + Math.cos(a) * r, floor.loot.y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  pill(ctx, `LOOT ${money(floor.loot.value)}`, floor.loot.x, floor.loot.y + 36, { size: 15, color: '#1a1030', bg: COLOR.gold });
  const e = floor.exit;
  ctx.strokeStyle = COLOR.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  pill(ctx, 'CAR', e.x + e.w / 2, e.y + e.h / 2, { size: 15, color: '#04261a', bg: COLOR.exit });
  pill(ctx, 'START', floor.start.x, floor.start.y, { size: 15, color: '#1a1030', bg: '#c9a2ff' });
  ctx.restore();
}

export function drawPlan(ctx, run, time) {
  const floor = FLOORS[run.floorIndex];
  ctx.fillStyle = '#071a36';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, `BLUEPRINT · FLOOR ${run.floorIndex + 1}/3 · ${floor.name}`, 24, 38, { size: 22, color: '#e8f4ff', font: DECO });
  text(ctx, `Target: ${floor.loot.name} (${money(floor.loot.value)}). Pick a route, buy tools, then go.`, 24, 62, { size: 14, color: '#9cc3ef', weight: 'normal' });
  const scale = 0.82;
  blueprint(ctx, floor, 24, 80, scale);
  ctx.strokeStyle = '#e8f4ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 80, PLAY.w * scale, PLAY.h * scale);
  const x = 860;
  panel(ctx, x, 80, 396, 160, '#3f6fb0');
  text(ctx, 'ROUTES TO THE LOOT', x + 16, 106, { size: 15, color: '#e8f4ff' });
  floor.routes.forEach((r, i) => {
    ctx.fillStyle = r.color;
    ctx.fillRect(x + 16, 120 + i * 26, 18, 12);
    text(ctx, r.label, x + 44, 131 + i * 26, { size: 14 });
  });
  text(ctx, `${floor.guards.length} guards · ${floor.cameras.length} camera${floor.cameras.length === 1 ? '' : 's'} · getaway clock 35 s`, x + 16, 222, { size: 12, color: '#9cc3ef', weight: 'normal' });
  panel(ctx, x, 252, 396, 340, COLOR.gold);
  text(ctx, 'TOOL SHOP', x + 16, 280, { size: 16, color: COLOR.gold });
  text(ctx, `CASH ${money(run.cash)}`, x + 380, 280, { size: 16, color: COLOR.calm, align: 'right' });
  TOOLS.forEach((tool, i) => {
    const y = 300 + i * 64;
    roundRect(ctx, x + 12, y, 372, 56, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    text(ctx, `[${tool.key}]`, x + 22, y + 24, { size: 16, color: COLOR.gold });
    text(ctx, tool.name, x + 62, y + 24, { size: 15 });
    text(ctx, money(tool.price), x + 300, y + 24, { size: 15, color: COLOR.gold, align: 'right' });
    text(ctx, `own ${run.kit[tool.id]}`, x + 372, y + 24, { size: 14, color: run.kit[tool.id] ? COLOR.calm : COLOR.dim, align: 'right' });
    text(ctx, tool.blurb, x + 62, y + 45, { size: 12, color: COLOR.dim, weight: 'normal' });
  });
  text(ctx, '1-4 buy one · BACKSPACE refund all', x + 16, 576, { size: 12, color: COLOR.dim, weight: 'normal' });
  if (Math.sin(time * 4) > -0.3) pill(ctx, 'ENTER  START THE HEIST', x + 198, 625, { size: 20, color: '#1a1030', bg: COLOR.gold });
  text(ctx, 'Gold dashes = guard patrols · pink fans = camera sweeps · purple = shadow (safe) · blue squares = vent grates', 24, 700, { size: 13, color: '#9cc3ef', weight: 'normal' });
}

export function drawSpotted(ctx, state) {
  const k = Math.min(1, state.spottedT / 0.25);
  ctx.fillStyle = `rgba(80,0,10,${0.35 * k})`;
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  const g = state.guards.find((x) => x.name === state.caughtBy);
  if (g) {
    const pts = guardCone(state, g);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.strokeStyle = COLOR.lockdown;
  ctx.lineWidth = 8;
  ctx.strokeRect(PLAY.x + 4, PLAY.y + 4, PLAY.w - 8, PLAY.h - 8);
  pill(ctx, 'SPOTTED!', PLAY.x + PLAY.w / 2, PLAY.y + 120, { size: 44, color: '#fff', bg: 'rgba(170,10,30,0.95)' });
  pill(ctx, `by ${state.caughtBy}`, PLAY.x + PLAY.w / 2, PLAY.y + 172, { size: 18, color: '#ffd0d4' });
}

export function drawCaught(ctx, state) {
  dim(ctx, 0.6);
  panel(ctx, 340, 200, 600, 300, COLOR.lockdown);
  text(ctx, 'CAUGHT', 640, 268, { size: 52, color: COLOR.lockdown, align: 'center', font: DECO });
  text(ctx, `${state.caughtBy} ended the job on ${state.floor.name}.`, 640, 310, { size: 16, color: COLOR.text, align: 'center', weight: 'normal' });
  text(ctx, `Spotted ${state.stats.spotted}× · alarm peaked at ${Math.round(state.stats.maxAlarm)}%`, 640, 340, { size: 14, color: COLOR.dim, align: 'center', weight: 'normal' });
  text(ctx, 'Tip: wait in a shadow pool until the cone sweeps past.', 640, 380, { size: 14, color: '#ffe9a8', align: 'center', weight: 'normal' });
  pill(ctx, 'R  RETRY THIS FLOOR (same tools)', 640, 440, { size: 18, color: '#1a1030', bg: COLOR.gold });
}

export function drawResults(ctx, state, res, run) {
  dim(ctx, 0.66);
  decoFrame(ctx, 290, 90, 700, 540);
  text(ctx, 'CLEAN GETAWAY', 640, 160, { size: 42, color: COLOR.exit, align: 'center', font: DECO });
  text(ctx, `${state.floor.name} · ${state.floor.loot.name}`, 640, 192, { size: 16, color: '#ffe9a8', align: 'center' });
  // rating stamp
  const stampColor = res.rating === 'GHOST' ? '#9f8cff' : res.rating === 'CLEAN' ? COLOR.calm : COLOR.alert;
  ctx.save();
  ctx.translate(830, 300);
  ctx.rotate(-0.18);
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 5;
  roundRect(ctx, -96, -40, 192, 80, 10);
  ctx.stroke();
  text(ctx, res.rating, 0, 16, { size: 44, color: stampColor, align: 'center', font: DECO });
  ctx.restore();
  const rows = [
    ['Loot', money(res.loot)],
    [`Time bonus (${Math.round(state.getawayT)} s left on the clock)`, money(res.bonus)],
    [`${res.rating} bonus`, money(res.ratingBonus)],
  ];
  rows.forEach(([a, b], i) => {
    text(ctx, a, 340, 250 + i * 34, { size: 17, weight: 'normal' });
    text(ctx, b, 690, 250 + i * 34, { size: 17, color: COLOR.gold, align: 'right' });
  });
  ctx.strokeStyle = COLOR.gold;
  ctx.beginPath();
  ctx.moveTo(340, 360);
  ctx.lineTo(690, 360);
  ctx.stroke();
  text(ctx, 'FLOOR TAKE', 340, 392, { size: 20 });
  text(ctx, money(res.total), 690, 392, { size: 24, color: COLOR.gold, align: 'right' });
  const m = Math.floor(res.time / 60);
  const s = Math.floor(res.time % 60);
  const stats = [`Time ${m}:${String(s).padStart(2, '0')}`, `Spotted ${res.spotted}×`, `Tools used ${res.toolsUsed}`, `Peak alarm ${Math.round(res.maxAlarm)}%`];
  stats.forEach((st, i) => pill(ctx, st, 400 + i * 160, 440, { size: 14, color: COLOR.text, edge: COLOR.panelEdge }));
  text(ctx, `Night's take so far ${money(run.take)} · crew cash ${money(run.cash)}`, 640, 494, { size: 16, color: COLOR.calm, align: 'center' });
  text(ctx, 'GHOST: never spotted, alarm stayed CALM · CLEAN: spotted at most once · LOUD: the rest', 640, 524, { size: 12, color: COLOR.dim, align: 'center', weight: 'normal' });
  const last = run.floorIndex >= FLOORS.length - 1;
  pill(ctx, last ? 'ENTER  SEE THE NIGHT\'S HAUL' : 'ENTER  PLAN THE NEXT FLOOR', 640, 572, { size: 18, color: '#1a1030', bg: COLOR.gold });
  text(ctx, 'R  replay this floor for a better rating', 640, 606, { size: 13, color: COLOR.dim, align: 'center', weight: 'normal' });
}

export function drawFinale(ctx, run, time) {
  dim(ctx, 0.8);
  decoFrame(ctx, 240, 80, 800, 560);
  logo(ctx, 640, 150, 44);
  text(ctx, 'THE NIGHT\'S HAUL', 640, 200, { size: 22, color: COLOR.text, align: 'center' });
  run.log.forEach((r, i) => {
    const y = 260 + i * 56;
    panel(ctx, 300, y - 30, 680, 46);
    text(ctx, `${i + 1}. ${r.floor}`, 320, y, { size: 16 });
    text(ctx, r.rating, 760, y, { size: 16, color: r.rating === 'GHOST' ? '#9f8cff' : r.rating === 'CLEAN' ? COLOR.calm : COLOR.alert, align: 'center' });
    text(ctx, money(r.total), 960, y, { size: 16, color: COLOR.gold, align: 'right' });
  });
  text(ctx, `TOTAL ${money(run.take)}`, 640, 470, { size: 34, color: COLOR.gold, align: 'center', font: DECO });
  const ghosts = run.log.filter((r) => r.rating === 'GHOST').length;
  text(ctx, ghosts === 3 ? 'Three ghosts. The Marlowe Grand will never know you were there.' : 'The papers will call it the heist of the year.', 640, 512, { size: 16, color: COLOR.text, align: 'center', weight: 'normal' });
  if (Math.sin(time * 4) > -0.3) pill(ctx, 'R  PLAN A NEW NIGHT', 640, 580, { size: 20, color: '#1a1030', bg: COLOR.gold });
}
