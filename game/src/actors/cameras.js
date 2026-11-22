// Wall cameras: each sweeps an arc on a timer, pumps the alarm while it sees Moth, radios the
// nearest guard, and can be blinded for a while with an EMP tag or for good at its junction box.
import { CAMERA } from '../config.js';
import { cameraSeesThief } from '../systems/vision.js';
import { raiseAlarm } from '../systems/alarm.js';
import { radioGuards } from './guards.js';

export function makeCameras(floor) {
  return floor.cameras.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    base: c.facing,
    sweep: c.sweep,
    period: c.period,
    angle: c.facing,
    box: c.box,
    offT: 0,
    cut: false,
    sees: false,
    radioT: 0,
  }));
}

export function cameraStatus(cam) {
  if (cam.cut) return 'WIRE CUT';
  if (cam.offT > 0) return `EMP ${Math.ceil(cam.offT)}s`;
  return cam.sees ? 'RECORDING!' : 'SWEEPING';
}

export function stepCamera(state, cam, dt) {
  if (cam.offT > 0) cam.offT = Math.max(0, cam.offT - dt);
  if (!cam.cut && cam.offT <= 0) cam.angle = cam.base + cam.sweep * Math.sin((state.time * Math.PI * 2) / cam.period);
  cam.sees = cameraSeesThief(state, cam);
  if (cam.radioT > 0) cam.radioT -= dt;
  if (cam.sees) {
    raiseAlarm(state, CAMERA.alarmPerSecond * dt);
    if (cam.radioT <= 0) {
      cam.radioT = 2.5;
      radioGuards(state, state.thief.x, state.thief.y);
      state.events.push('camera');
    }
  }
}
