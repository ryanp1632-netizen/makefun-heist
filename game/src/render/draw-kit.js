// Small drawing helpers shared by every renderer: rounded panels, pills, labelled text.
import { COLOR } from '../config.js';

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const DECO = 'Georgia, "Times New Roman", serif';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, edge = COLOR.panelEdge) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = COLOR.panel;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function text(ctx, str, x, y, { size = 14, color = COLOR.text, align = 'left', weight = 'bold', font = FONT, base = 'alphabetic' } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(str, x, y);
}

/** A dark pill with bright text, centred on (x, y): world labels and popups. */
export function pill(ctx, str, x, y, { size = 12, color = COLOR.text, bg = 'rgba(6,5,16,0.86)', edge = null } = {}) {
  ctx.font = `bold ${size}px ${FONT}`;
  const w = ctx.measureText(str).width + size * 1.1;
  const h = size + 9;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

export function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function rgba([r, g, b], a) {
  return `rgba(${r},${g},${b},${a})`;
}
