// One floor of the heist, start to finish: builds the floor's live state from its plan, runs every
// system in a fixed order each step, and decides the outcome (SPOTTED freeze, CAUGHT, or ESCAPED
// to the car with the loot) and the results: take, time bonus and a GHOST / CLEAN / LOUD rating.
import { ALARM, STEP, TIMES } from './config.js';
import { boxEdges, inBox } from './geometry.js';
import { FLOORS } from './floors.js';
import { makeThief, stepThief } from './actors/thief.js';
import { ALERT, hearNoise, makeGuards, stepGuard } from './actors/guards.js';
import { makeCameras, stepCamera } from './actors/cameras.js';
import { makeAlarm, stepAlarm } from './systems/alarm.js';
import { stepNoises } from './systems/noise.js';
import { stepClouds } from './systems/tools.js';

export const PHASE_INFIL = 'infil';
export const PHASE_GETAWAY = 'getaway';
export const PHASE_SPOTTED = 'spotted';
export const PHASE_CAUGHT = 'caught';
export const PHASE_ESCAPED = 'escaped';

export function startFloor(floorIndex, kit) {
  const floor = FLOORS[floorIndex];
  const state = {
    floor,
    floorIndex,
    time: 0,
    phase: PHASE_INFIL,
    thief: makeThief(floor),
    guards: makeGuards(floor),
    cameras: makeCameras(floor),
    glass: floor.glass.map((g) => ({ ...g, cut: false })),
    doors: floor.doors.map((d) => ({ ...d, open: false })),
    alarm: makeAlarm(),
    tools: { ...kit },
    clouds: [],
    noises: [],
    effects: [],
    events: [],
    getawayT: ALARM.getawaySeconds,
    stats: { spotted: 0, toolsUsed: 0, maxAlarm: 0, time: 0 },
    caughtBy: '',
    spottedT: 0,
    solids: [],
    sightEdges: [],
    message: { text: floor.tip, t: 9 },
    introT: 2.8, // the floor's title card
  };
  state.rebuildWalls = () => rebuildWalls(state);
  state.catchThief = (by) => catchThief(state, by);
  rebuildWalls(state);
  return state;
}

/** Feet are stopped by walls, uncut glass and closed doors; eyes only by walls and closed doors. */
function rebuildWalls(state) {
  const closedDoors = state.doors.filter((d) => !d.open);
  const wholeGlass = state.glass.filter((g) => !g.cut);
  state.solids = [...state.floor.walls, ...closedDoors, ...wholeGlass];
  state.sightEdges = boxEdges([...state.floor.walls, ...closedDoors]);
}

function catchThief(state, by) {
  if (state.phase === PHASE_SPOTTED || state.phase === PHASE_CAUGHT || state.phase === PHASE_ESCAPED) return;
  state.phase = PHASE_SPOTTED;
  state.caughtBy = by;
  state.spottedT = 0;
  state.thief.job = null;
  state.events.push('caught');
}

/** Advance the floor by one fixed step. */
export function stepFloor(state, input, dt = STEP) {
  state.events.length = 0;
  if (state.phase === PHASE_SPOTTED) {
    state.spottedT += dt;
    if (state.spottedT >= TIMES.spotted) state.phase = PHASE_CAUGHT;
    return;
  }
  if (state.phase !== PHASE_INFIL && state.phase !== PHASE_GETAWAY) return;
  state.time += dt;
  if (state.message.t > 0) state.message.t -= dt;
  if (state.introT > 0) state.introT -= dt;

  const hadLoot = state.thief.hasLoot;
  stepThief(state, input, dt);
  if (!hadLoot && state.thief.hasLoot) {
    state.phase = PHASE_GETAWAY;
    state.alarm.floor = 12;
    state.message = { text: 'GOT IT! Now reach the GETAWAY CAR before the clock runs out.', t: 4 };
  }
  stepClouds(state, dt);
  stepNoises(state, dt, (g, n) => hearNoise(state, g, n));
  for (const g of state.guards) stepGuard(state, g, dt);
  for (const c of state.cameras) stepCamera(state, c, dt);
  if (state.phase === PHASE_SPOTTED) return;

  const watched = state.guards.some((g) => g.sees || g.mode === ALERT) || state.cameras.some((c) => c.sees);
  if (state.phase === PHASE_GETAWAY) {
    state.getawayT = Math.max(0, state.getawayT - dt);
    if (state.getawayT <= 0) state.alarm.value = ALARM.lockdownAt;
    if (inBox(state.thief.x, state.thief.y, state.floor.exit)) {
      state.phase = PHASE_ESCAPED;
      state.stats.time = state.time;
      state.events.push('escape');
      return;
    }
  }
  if (stepAlarm(state, dt, watched)) catchThief(state, 'the LOCKDOWN');
}

/** The floor's payout and rating, read by the results screen. */
export function floorResults(state) {
  const s = state.stats;
  const loot = state.floor.loot.value;
  const bonus = Math.round(state.getawayT) * 400;
  const ghost = s.spotted === 0 && s.maxAlarm < ALARM.alertAt;
  const clean = s.spotted <= 1 && s.maxAlarm < 80;
  const rating = ghost ? 'GHOST' : clean ? 'CLEAN' : 'LOUD';
  const ratingBonus = ghost ? 10000 : clean ? 4000 : 0;
  return { loot, bonus, ratingBonus, total: loot + bonus + ratingBonus, rating, ...s };
}
