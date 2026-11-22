// Every sound is synthesised with WebAudio at play time (no audio files): soft footsteps, a
// heartbeat while a guard's "?" fills, camera chirps, the coin clink, smoke hiss, EMP zap, the
// alarm siren in ALERT, a chime for the loot and the car's roar at the getaway.
let ac = null;
let master = null;

export function unlockAudio() {
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.35;
  master.connect(ac.destination);
}

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur, vol = 0.2, hp = 800) {
  if (!ac) return;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < n; i += 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x7fffffff) * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  src.connect(f).connect(g).connect(master);
  src.start();
}

const SOUNDS = {
  step: () => tone(90, 0.06, { type: 'triangle', vol: 0.12 }),
  coin: () => {
    tone(1900, 0.12, { type: 'square', vol: 0.08 });
    tone(2600, 0.25, { type: 'sine', vol: 0.1, delay: 0.06 });
  },
  smoke: () => hiss(1.2, 0.25, 500),
  emp: () => tone(1200, 0.35, { type: 'sawtooth', vol: 0.12, slide: -1100 }),
  camera: () => {
    tone(1500, 0.08, { type: 'square', vol: 0.06 });
    tone(1500, 0.08, { type: 'square', vol: 0.06, delay: 0.12 });
  },
  spotted: () => {
    tone(440, 0.18, { type: 'square', vol: 0.15 });
    tone(660, 0.3, { type: 'square', vol: 0.15, delay: 0.16 });
  },
  caught: () => tone(300, 0.9, { type: 'sawtooth', vol: 0.18, slide: -220 }),
  lift: () => [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.4, { vol: 0.12, delay: i * 0.07 })),
  laser: () => {
    tone(1800, 0.15, { type: 'square', vol: 0.12 });
    tone(1400, 0.3, { type: 'square', vol: 0.12, delay: 0.15 });
  },
  door: () => tone(220, 0.12, { type: 'square', vol: 0.1 }),
  glass: () => hiss(0.4, 0.15, 3000),
  wire: () => tone(160, 0.25, { type: 'sawtooth', vol: 0.12, slide: -100 }),
  vent: () => hiss(0.5, 0.08, 300),
  escape: () => {
    tone(70, 1.4, { type: 'sawtooth', vol: 0.2, slide: 90 });
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, { vol: 0.1, delay: 0.3 + i * 0.1 }));
  },
};

let beatT = 0;
let sirenT = 0;

/** Play the step's events, plus the heartbeat and siren that follow the state. */
export function playFrame(state, dt) {
  if (!ac) return;
  for (const e of state.events) if (SOUNDS[e]) SOUNDS[e]();
  const worry = Math.max(0, ...state.guards.map((g) => g.suspicion));
  beatT -= dt;
  if (worry > 0.15 && beatT <= 0) {
    beatT = 1.0 - worry * 0.6;
    tone(55, 0.12, { vol: 0.25 });
    tone(50, 0.12, { vol: 0.2, delay: 0.14 });
  }
  sirenT -= dt;
  if (state.alarm.value >= 34 && sirenT <= 0) {
    sirenT = 1.1;
    tone(620, 0.5, { type: 'triangle', vol: 0.05, slide: 260 });
    tone(880, 0.5, { type: 'triangle', vol: 0.05, slide: -260, delay: 0.5 });
  }
}
