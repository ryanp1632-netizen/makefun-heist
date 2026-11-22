// The night watch: patrols with pauses and look-arounds, a suspicion pip that fills only after a
// short grace ("?"), the alert chase ("!"), investigating noises, and a search before giving up.
import { ALARM, GUARD, THIEF } from '../config.js';
import { dist, pushOutOfBoxes, turnToward } from '../geometry.js';
import { guardSeesThief } from '../systems/vision.js';
import { raiseAlarm } from '../systems/alarm.js';

export const PATROL = 'PATROL';
export const SUSPICIOUS = 'SUSPICIOUS';
export const INVESTIGATE = 'INVESTIGATE';
export const ALERT = 'ALERT';
export const SEARCH = 'SEARCH';

const SAYINGS = {
  [SUSPICIOUS]: ['Hm?', 'Who\'s there?', 'Something moved...'],
  [INVESTIGATE]: ['What was that?', 'Checking it out.', 'Heard something.'],
  [ALERT]: ['THIEF!', 'Stop right there!', 'Got you!'],
  [SEARCH]: ['Where did you go?', 'Lost them...'],
};

export function makeGuards(floor) {
  return floor.guards.map((g, i) => {
    const [x, y] = g.route[0];
    const [nx, ny] = g.route[1 % g.route.length];
    return {
      name: g.name,
      route: g.route,
      pause: g.pause,
      x,
      y,
      facing: Math.atan2(ny - y, nx - x),
      wp: 1 % g.route.length,
      pauseT: 0,
      lookBase: 0,
      mode: PATROL,
      suspicion: 0,
      seeT: 0,
      target: null,
      lostT: 0,
      searchT: 0,
      bubble: null,
      bubbleT: 0,
      sees: false,
      index: i,
    };
  });
}

function say(guard, mode) {
  const lines = SAYINGS[mode];
  guard.bubble = lines[(guard.index + Math.floor(guard.x + guard.y)) % lines.length];
  guard.bubbleT = 2.2;
}

function setMode(guard, mode) {
  if (guard.mode === mode) return;
  guard.mode = mode;
  if (SAYINGS[mode]) say(guard, mode);
}

/** Walk toward (x, y); returns true on arrival. */
function walkTo(state, guard, x, y, speed, dt) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  guard.x += (dx / d) * step;
  guard.y += (dy / d) * step;
  pushOutOfBoxes(guard, GUARD.radius, state.solids);
  guard.facing = turnToward(guard.facing, Math.atan2(dy, dx), GUARD.turnRate * dt);
  return false;
}

/** A guard heard a noise: patrols and searches turn to check it; a chase ignores it. */
export function hearNoise(state, guard, noise) {
  if (guard.mode === ALERT) return;
  if (noise.kind === 'step') guard.suspicion = Math.min(0.9, guard.suspicion + 0.18);
  guard.target = { x: noise.x, y: noise.y };
  guard.searchT = 2.4;
  setMode(guard, INVESTIGATE);
}

/** A camera radioed movement: the nearest free guard comes to look. */
export function radioGuards(state, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const g of state.guards) {
    if (g.mode === ALERT) continue;
    const d = dist(g.x, g.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  if (best) {
    best.target = { x, y };
    best.searchT = 2.4;
    setMode(best, INVESTIGATE);
  }
}

export function stepGuard(state, guard, dt) {
  const thief = state.thief;
  const hurry = state.alarm.value >= ALARM.alertAt ? 1.15 : 1;
  guard.sees = guardSeesThief(state, guard);
  if (guard.bubbleT > 0) guard.bubbleT -= dt;

  // Suspicion: a short grace, then it fills faster the closer the thief is.
  if (guard.sees && guard.mode !== ALERT) {
    guard.seeT += dt;
    if (guard.seeT > GUARD.grace) {
      const d = dist(guard.x, guard.y, thief.x, thief.y);
      const close = 1 - Math.min(1, d / GUARD.coneRange);
      guard.suspicion += GUARD.suspicionRise * (0.55 + 1.6 * close) * dt;
    }
    if (guard.suspicion > 0.2 && guard.mode !== INVESTIGATE) setMode(guard, SUSPICIOUS);
    if (guard.suspicion >= 1) {
      guard.suspicion = 1;
      setMode(guard, ALERT);
      guard.lostT = 0;
      state.stats.spotted += 1;
      raiseAlarm(state, ALARM.guardSpotted);
      state.events.push('spotted');
    }
  } else if (!guard.sees) {
    guard.seeT = 0;
    if (guard.mode !== ALERT) guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionFall * dt);
  }

  switch (guard.mode) {
    case ALERT: {
      if (guard.sees) {
        guard.target = { x: thief.x, y: thief.y };
        guard.lostT = 0;
      } else guard.lostT += dt;
      if (guard.target) walkTo(state, guard, guard.target.x, guard.target.y, GUARD.chaseSpeed * hurry, dt);
      if (!thief.hidden && dist(guard.x, guard.y, thief.x, thief.y) < GUARD.radius + THIEF.radius + 3) {
        state.catchThief(guard.name);
      }
      if (guard.lostT > GUARD.loseSight) {
        guard.suspicion = 0.6;
        guard.searchT = 3;
        setMode(guard, SEARCH);
      }
      break;
    }
    case SUSPICIOUS: {
      // freeze and stare toward the movement
      guard.facing = turnToward(guard.facing, Math.atan2(thief.y - guard.y, thief.x - guard.x), GUARD.turnRate * 0.6 * dt);
      if (guard.suspicion <= 0.05) setMode(guard, PATROL);
      break;
    }
    case INVESTIGATE:
    case SEARCH: {
      const arrived = !guard.target || walkTo(state, guard, guard.target.x, guard.target.y, GUARD.investigateSpeed * hurry, dt);
      if (arrived) {
        guard.searchT -= dt;
        guard.facing += dt * 2.1;
        if (guard.searchT <= 0) {
          guard.target = null;
          setMode(guard, PATROL);
        }
      }
      break;
    }
    default: {
      if (guard.pauseT > 0) {
        guard.pauseT -= dt;
        guard.facing = guard.lookBase + Math.sin((guard.pause - guard.pauseT) * 2.4) * 0.7;
        break;
      }
      const [x, y] = guard.route[guard.wp];
      if (walkTo(state, guard, x, y, GUARD.patrolSpeed * hurry, dt)) {
        guard.pauseT = guard.pause;
        guard.lookBase = guard.facing;
        guard.wp = (guard.wp + 1) % guard.route.length;
      }
    }
  }
}
