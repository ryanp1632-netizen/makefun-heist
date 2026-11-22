// Boot and game loop: the run across the night (cash, kit, take), the screen flow
// TITLE → BLUEPRINT → FLOOR → RESULTS (or CAUGHT) → … → FINALE, and a fixed-step simulation.
import { START_CASH, STEP, TOOLS, VIEW } from './config.js';
import { FLOORS } from './floors.js';
import { PHASE_CAUGHT, PHASE_ESCAPED, PHASE_SPOTTED, floorResults, startFloor, stepFloor } from './heist.js';
import { emptyKit, useTool } from './systems/tools.js';
import { makeInput } from './input.js';
import { playFrame, unlockAudio } from './audio.js';
import { drawFloor, drawLoot } from './render/floor-art.js';
import { drawCones, drawSmokeAndNoise } from './render/cones.js';
import { drawCameras, drawGuards, drawThief } from './render/actors.js';
import { drawHud } from './render/hud.js';
import { drawCaught, drawFinale, drawPlan, drawResults, drawSpotted, drawTitle } from './render/screens.js';
import { stageShot } from './shots.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAN = 'plan';
export const SCREEN_PLAY = 'play';
export const SCREEN_RESULTS = 'results';
export const SCREEN_FINALE = 'finale';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

export function newRun() {
  return {
    screen: SCREEN_TITLE,
    floorIndex: 0,
    cash: START_CASH,
    kit: emptyKit(),
    bought: emptyKit(),
    take: 0,
    best: [],
    log: [],
    selected: 'smoke',
    mouse: null,
    state: startFloor(1, emptyKit()), // the title's living backdrop
    results: null,
    clock: 0,
  };
}

function announce(msg) {
  if (status) status.textContent = msg;
}

function beginFloor(run) {
  run.state = startFloor(run.floorIndex, run.kit);
  run.screen = SCREEN_PLAY;
  announce(`Floor ${run.floorIndex + 1}: ${FLOORS[run.floorIndex].name}`);
}

function finishFloor(run) {
  const res = floorResults(run.state);
  const first = run.best[run.floorIndex] === undefined;
  run.best[run.floorIndex] = Math.max(run.best[run.floorIndex] ?? 0, res.total);
  run.take = run.best.reduce((a, b) => a + (b ?? 0), 0);
  if (first) run.cash += 1500 + Math.round(res.ratingBonus / 4);
  run.kit = { ...run.state.tools };
  run.log[run.floorIndex] = { floor: run.state.floor.name, rating: res.rating, total: run.best[run.floorIndex] };
  run.results = res;
  run.screen = SCREEN_RESULTS;
  announce(`Escaped with ${run.state.floor.loot.name}. Rating ${res.rating}.`);
}

function buy(run, id) {
  const tool = TOOLS.find((t) => t.id === id);
  if (run.cash < tool.price) return;
  run.cash -= tool.price;
  run.kit[id] += 1;
  run.bought[id] += 1;
}

function refund(run) {
  for (const t of TOOLS) {
    run.cash += run.bought[t.id] * t.price;
    run.kit[t.id] -= run.bought[t.id];
    run.bought[t.id] = 0;
  }
}

function handleKeys(run, keys, clicks) {
  const press = (c) => keys.includes(c);
  if (run.screen === SCREEN_TITLE) {
    if (press('Enter') || press('Space') || clicks.length) {
      run.screen = SCREEN_PLAN;
      run.bought = emptyKit();
    }
  } else if (run.screen === SCREEN_PLAN) {
    TOOLS.forEach((t, i) => press(`Digit${i + 1}`) && buy(run, t.id));
    if (press('Backspace')) refund(run);
    if (press('Enter') || press('Space')) beginFloor(run);
  } else if (run.screen === SCREEN_PLAY) {
    const st = run.state;
    TOOLS.forEach((t, i) => press(`Digit${i + 1}`) && (run.selected = t.id));
    if (press('KeyR')) beginFloor(run);
    for (const c of clicks) if (st.phase !== PHASE_SPOTTED && st.phase !== PHASE_CAUGHT) {
      const msg = useTool(st, run.selected, c.x, c.y);
      if (msg) st.message = { text: msg, t: 1.8 };
    }
    if (st.phase === PHASE_CAUGHT && (press('KeyR') || press('Enter'))) beginFloor(run);
  } else if (run.screen === SCREEN_RESULTS) {
    if (press('KeyR')) beginFloor(run);
    else if (press('Enter') || press('Space')) {
      if (run.floorIndex >= FLOORS.length - 1) run.screen = SCREEN_FINALE;
      else {
        run.floorIndex += 1;
        run.bought = emptyKit();
        run.screen = SCREEN_PLAN;
      }
    }
  } else if (run.screen === SCREEN_FINALE && press('KeyR')) {
    Object.assign(run, newRun(), { screen: SCREEN_PLAN });
  }
}

export function render(run) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (run.screen === SCREEN_PLAN) {
    drawPlan(ctx, run, run.clock);
    return;
  }
  const st = run.state;
  drawFloor(ctx, st);
  drawCones(ctx, st);
  drawLoot(ctx, st);
  drawSmokeAndNoise(ctx, st);
  drawGuards(ctx, st);
  drawCameras(ctx, st);
  drawThief(ctx, st);
  if (run.screen === SCREEN_TITLE) {
    drawTitle(ctx, run.clock);
    return;
  }
  drawHud(ctx, st, run);
  if (st.phase === PHASE_SPOTTED) drawSpotted(ctx, st);
  if (st.phase === PHASE_CAUGHT) drawCaught(ctx, st);
  if (run.screen === SCREEN_RESULTS) drawResults(ctx, st, run.results, run);
  if (run.screen === SCREEN_FINALE) drawFinale(ctx, run, run.clock);
}

function tick(run, input) {
  const keys = input.takePressed();
  const clicks = input.takeClicks();
  if (keys.length || clicks.length) unlockAudio();
  run.mouse = input.mouse;
  handleKeys(run, keys, clicks);
  run.clock += STEP;
  if (run.screen === SCREEN_TITLE) {
    stepFloor(run.state, { dx: 0, dy: 0 }, STEP);
  } else if (run.screen === SCREEN_PLAY) {
    const st = run.state;
    // during the SPOTTED freeze frame stepFloor only runs its timer
    stepFloor(st, input.controls(keys), STEP);
    playFrame(st, STEP);
    if (st.phase === PHASE_ESCAPED) finishFloor(run);
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const run = newRun();
if (shot) {
  stageShot(shot, run);
  render(run);
  document.title = `VELVET HOUR · ${shot}`;
} else {
  const input = makeInput(canvas);
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      tick(run, input);
      acc -= STEP;
    }
    render(run);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.__heist = run; // for play-testing from the console
}
