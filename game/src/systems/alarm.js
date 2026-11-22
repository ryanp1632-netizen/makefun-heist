// The alarm meter: CALM, ALERT, LOCKDOWN. Being seen raises it; it drains slowly while nobody
// is watching, but never below the floor the getaway sets. LOCKDOWN ends the floor.
import { ALARM, COLOR } from '../config.js';

export function makeAlarm() {
  return { value: 0, floor: 0, flash: 0 };
}

export function raiseAlarm(state, amount) {
  state.alarm.value = Math.min(ALARM.lockdownAt, state.alarm.value + amount);
  state.alarm.flash = 0.4;
  state.stats.maxAlarm = Math.max(state.stats.maxAlarm, state.alarm.value);
}

export function alarmLevel(value) {
  if (value >= ALARM.lockdownAt) return { name: 'LOCKDOWN', color: COLOR.lockdown };
  if (value >= ALARM.alertAt) return { name: 'ALERT', color: COLOR.alert };
  return { name: 'CALM', color: COLOR.calm };
}

/** Drain when unwatched; report true the moment the meter hits LOCKDOWN. */
export function stepAlarm(state, dt, watched) {
  const a = state.alarm;
  if (a.flash > 0) a.flash -= dt;
  if (!watched) a.value = Math.max(a.floor, a.value - ALARM.decayPerSecond * dt);
  return a.value >= ALARM.lockdownAt;
}
