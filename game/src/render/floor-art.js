// The art-deco floor plan: marble with gold sunburst inlay, black-and-gold walls, display cases,
// glass walls, doors, indigo shadow pools (safe), vent grates and ducts, junction boxes, the loot
// plinth and the getaway car bay.
import { COLOR, PLAY } from '../config.js';
import { pill, rgba } from './draw-kit.js';

function marble(ctx) {
  ctx.fillStyle = COLOR.floor;
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  const s = 64;
  for (let y = PLAY.y; y < PLAY.y + PLAY.h; y += s) {
    for (let x = PLAY.x; x < PLAY.x + PLAY.w; x += s) {
      if (((x / s) + (y - PLAY.y) / s) % 2 === 0) {
        ctx.fillStyle = COLOR.floorAlt;
        ctx.fillRect(x, y, s, s);
      }
    }
  }
  // gold diamond inlay at every tile corner
  ctx.strokeStyle = 'rgba(240,194,90,0.13)';
  ctx.lineWidth = 1;
  for (let y = PLAY.y; y <= PLAY.y + PLAY.h; y += s) {
    for (let x = PLAY.x; x <= PLAY.x + PLAY.w; x += s) {
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x - 9, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/** A sunburst rug under the loot: the room's centrepiece. */
function sunburst(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 24; i += 1) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = i % 2 ? 'rgba(240,194,90,0.10)' : 'rgba(240,194,90,0.04)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(96, -13);
    ctx.lineTo(96, 13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadows(ctx, floor, time) {
  for (const s of floor.shadows) {
    const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.2, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(4,2,20,0.95)');
    g.addColorStop(0.8, 'rgba(10,4,40,0.88)');
    g.addColorStop(1, 'rgba(30,16,100,0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = -time * 8;
    ctx.strokeStyle = 'rgba(150,130,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function walls(ctx, floor) {
  for (const w of floor.walls) {
    if (w.style === 'case') {
      // a display case: dark wood, a lit glass top and a small exhibit
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = 'rgba(160,220,255,0.18)';
      ctx.fillRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);
      ctx.strokeStyle = COLOR.wallTrim;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
      ctx.fillStyle = 'rgba(240,194,90,0.7)';
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = COLOR.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = COLOR.wallTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  }
}

function glassAndDoors(ctx, state) {
  for (const g of state.glass) {
    if (g.cut) {
      ctx.strokeStyle = 'rgba(159,240,255,0.5)';
      ctx.setLineDash([3, 4]);
      ctx.strokeRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2);
      ctx.setLineDash([]);
      continue;
    }
    ctx.fillStyle = COLOR.glass;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = COLOR.glassEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1);
    ctx.beginPath();
    ctx.moveTo(g.x + 6, g.y + g.h - 3);
    ctx.lineTo(g.x + Math.min(22, g.w - 4), g.y + 3);
    ctx.stroke();
  }
  for (const d of state.doors) {
    if (d.open) {
      ctx.strokeStyle = 'rgba(214,162,74,0.45)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
      ctx.setLineDash([]);
      continue;
    }
    ctx.fillStyle = COLOR.door;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = COLOR.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
    ctx.fillStyle = COLOR.gold;
    ctx.beginPath();
    ctx.arc(d.x + d.w / 2, d.y + d.h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function vents(ctx, floor) {
  for (const v of floor.vents) {
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = 'rgba(122,184,255,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(v.a.x, v.a.y);
    ctx.lineTo(v.b.x, v.b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of [v.a, v.b]) {
      ctx.fillStyle = '#26314f';
      ctx.fillRect(p.x - 13, p.y - 13, 26, 26);
      ctx.strokeStyle = '#7ab8ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 13, p.y - 13, 26, 26);
      ctx.lineWidth = 1.5;
      for (let i = -8; i <= 8; i += 5) {
        ctx.beginPath();
        ctx.moveTo(p.x - 9, p.y + i);
        ctx.lineTo(p.x + 9, p.y + i);
        ctx.stroke();
      }
    }
  }
}

function junctionBoxes(ctx, state) {
  for (const c of state.cameras) {
    const b = c.box;
    ctx.strokeStyle = c.cut ? 'rgba(120,120,140,0.4)' : 'rgba(255,90,190,0.45)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.cut ? '#3a3a48' : '#4b1d3d';
    ctx.fillRect(b.x - 9, b.y - 9, 18, 18);
    ctx.strokeStyle = c.cut ? '#777' : '#ff5abe';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 9, b.y - 9, 18, 18);
    ctx.fillStyle = c.cut ? '#777' : '#ffd84a';
    ctx.beginPath();
    ctx.moveTo(b.x + 2, b.y - 6);
    ctx.lineTo(b.x - 4, b.y + 1);
    ctx.lineTo(b.x, b.y + 1);
    ctx.lineTo(b.x - 2, b.y + 6);
    ctx.lineTo(b.x + 4, b.y - 1);
    ctx.lineTo(b.x, b.y - 1);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawLoot(ctx, state) {
  const loot = state.floor.loot;
  const gem = hexToRgb(loot.gem);
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
  const glow = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 60);
  glow.addColorStop(0, rgba(gem, 0.55 * pulse));
  glow.addColorStop(1, rgba(gem, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(loot.x, loot.y, 60, 0, Math.PI * 2);
  ctx.fill();
  // gold plinth
  ctx.fillStyle = COLOR.goldDeep;
  ctx.fillRect(loot.x - 17, loot.y - 17, 34, 34);
  ctx.fillStyle = COLOR.gold;
  ctx.fillRect(loot.x - 13, loot.y - 13, 26, 26);
  if (!state.thief.hasLoot) {
    ctx.fillStyle = loot.gem;
    ctx.beginPath();
    ctx.moveTo(loot.x, loot.y - 11);
    ctx.lineTo(loot.x + 9, loot.y - 2);
    ctx.lineTo(loot.x, loot.y + 10);
    ctx.lineTo(loot.x - 9, loot.y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    pill(ctx, `LOOT: ${loot.name}  $${loot.value.toLocaleString('en-US')}`, loot.x, loot.y - 34, { size: 12, color: '#ffe9a8', edge: COLOR.gold });
  } else {
    pill(ctx, 'EMPTY PLINTH', loot.x, loot.y - 30, { size: 11, color: COLOR.dim });
  }
}

function car(ctx, state) {
  const e = state.floor.exit;
  const live = state.thief.hasLoot;
  const pulse = live ? 0.55 + 0.45 * Math.sin(state.time * 6) : 0.25;
  ctx.fillStyle = `rgba(60,240,160,${0.12 + 0.18 * pulse})`;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = `rgba(60,240,160,${0.5 + 0.5 * pulse})`;
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  ctx.setLineDash([]);
  // the getaway car, a long deco coupe seen from above
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2 + 6;
  ctx.fillStyle = '#0f3b2c';
  ctx.fillRect(cx - 34, cy - 15, 68, 30);
  ctx.fillStyle = '#1fbf7f';
  ctx.fillRect(cx - 30, cy - 12, 60, 24);
  ctx.fillStyle = '#0b1f19';
  ctx.fillRect(cx - 6, cy - 10, 20, 20);
  ctx.fillStyle = '#fff6b0';
  ctx.fillRect(cx + 28, cy - 11, 5, 5);
  ctx.fillRect(cx + 28, cy + 6, 5, 5);
  pill(ctx, live ? 'GETAWAY CAR  GO!' : 'GETAWAY CAR', cx, e.y + 12, { size: 11, color: '#bfffe2', edge: live ? COLOR.exit : null });
}

/** Deco rugs, potted palms and warm lamp pools: the gallery by night, for looks only. */
function decor(ctx, floor, layer) {
  for (const d of floor.decor ?? []) {
    if (layer === 'under' && d.kind === 'rug') {
      ctx.fillStyle = 'rgba(120,24,48,0.55)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = 'rgba(240,194,90,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(d.x + 5, d.y + 5, d.w - 10, d.h - 10);
      ctx.lineWidth = 1;
      ctx.strokeRect(d.x + 10, d.y + 10, d.w - 20, d.h - 20);
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx + 16, cy);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 16, cy);
      ctx.closePath();
      ctx.stroke();
    } else if (layer === 'under' && d.kind === 'lamp') {
      const g = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, 90);
      g.addColorStop(0, 'rgba(255,205,120,0.30)');
      g.addColorStop(1, 'rgba(255,205,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 90, 0, Math.PI * 2);
      ctx.fill();
    } else if (layer === 'over' && d.kind === 'lamp') {
      ctx.fillStyle = '#ffe2a0';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLOR.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    } else if (layer === 'over' && d.kind === 'plant') {
      ctx.fillStyle = '#5a3a1e';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2fae6a';
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(d.x + Math.cos(a) * 9, d.y + Math.sin(a) * 9, 9, 3.5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Laser tripwires: a hot red beam while live, a faint dotted line and a countdown while off. */
export function drawLasers(ctx, state) {
  for (const l of state.lasers ?? []) {
    const [ax, ay] = l.a;
    const [bx, by] = l.b;
    if (l.live) {
      ctx.strokeStyle = 'rgba(255,40,70,0.35)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#ffd0d8';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(255,90,110,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const [x, y] of [l.a, l.b]) {
      ctx.fillStyle = '#2a0a12';
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeStyle = l.live ? '#ff3b5c' : '#7a3a48';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 6, y - 6, 12, 12);
    }
    pill(ctx, l.live ? `${l.id} · LIVE` : `${l.id} · OFF`, (ax + bx) / 2, (ay + by) / 2 - 14, { size: 10, color: l.live ? '#ffb3c0' : '#c9c3dd' });
  }
}

export function drawFloor(ctx, state) {
  marble(ctx);
  decor(ctx, state.floor, 'under');
  sunburst(ctx, state.floor.loot.x, state.floor.loot.y, hexToRgb(state.floor.loot.gem));
  shadows(ctx, state.floor, state.time);
  vents(ctx, state.floor);
  car(ctx, state);
  walls(ctx, state.floor);
  glassAndDoors(ctx, state);
  junctionBoxes(ctx, state);
  decor(ctx, state.floor, 'over');
}
