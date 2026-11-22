// Keyboard and mouse, mapped to the 1280x720 game view whatever the window size.
import { VIEW } from './config.js';

export function makeInput(canvas) {
  const held = new Set();
  const pressed = [];
  const input = { mouse: null, clicks: [] };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Backspace'].includes(e.key)) e.preventDefault();
    if (!held.has(e.code)) pressed.push(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  const toView = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW.width, y: ((e.clientY - r.top) / r.height) * VIEW.height };
  };
  canvas.addEventListener('mousemove', (e) => (input.mouse = toView(e)));
  canvas.addEventListener('mousedown', (e) => {
    input.mouse = toView(e);
    input.clicks.push(input.mouse);
  });
  input.held = (code) => held.has(code);
  /** The keys pressed since the last call, then forgotten. */
  input.takePressed = () => pressed.splice(0, pressed.length);
  input.takeClicks = () => input.clicks.splice(0, input.clicks.length);
  /** The thief's controls for one step. */
  input.controls = (pressedNow) => {
    const h = (a, b) => held.has(a) || held.has(b);
    return {
      dx: (h('KeyD', 'ArrowRight') ? 1 : 0) - (h('KeyA', 'ArrowLeft') ? 1 : 0),
      dy: (h('KeyS', 'ArrowDown') ? 1 : 0) - (h('KeyW', 'ArrowUp') ? 1 : 0),
      sneak: h('ShiftLeft', 'ShiftRight'),
      interact: held.has('KeyE'),
      interactPressed: pressedNow.includes('KeyE'),
    };
  };
  return input;
}
