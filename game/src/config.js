// VELVET HOUR: every tuning number and colour in one place, so the rules files read as rules.

export const VIEW = { width: 1280, height: 720 };
/** The floor plan is drawn here; the HUD owns the bars and the side panel around it. */
export const PLAY = { x: 0, y: 56, w: 1000, h: 608 };
export const STEP = 1 / 60;

export const THIEF = {
  radius: 10,
  walkSpeed: 150,
  sneakSpeed: 78,
  noiseRadius: 120, // footsteps a guard can hear while walking (sneaking is silent)
  reach: 34, // how close E needs you to a plinth, a grate, a door or a junction box
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 62,
  investigateSpeed: 92,
  chaseSpeed: 138,
  coneRange: 230,
  coneHalf: 0.62, // radians each side of facing
  shadowRange: 0.34, // a thief in a shadow pool is only seen this fraction of the range away
  grace: 0.35, // seconds before suspicion starts to fill: a glance is not a catch
  suspicionRise: 0.85,
  suspicionFall: 0.35,
  loseSight: 3.5, // seconds an alerted guard keeps hunting a thief he lost
  turnRate: 3.2,
  hearing: 1.0,
};

export const CAMERA = {
  range: 270,
  half: 0.38,
  alarmPerSecond: 34, // a camera that sees you pumps the alarm directly
};

export const ALARM = {
  alertAt: 34,
  lockdownAt: 100,
  decayPerSecond: 3,
  guardSpotted: 30, // a guard reaching "!" adds this much at once
  getawaySeconds: 35,
};

export const TOOLS = [
  { id: 'smoke', key: '1', name: 'SMOKE', price: 400, blurb: 'cloud that blocks every cone for 7 s', duration: 7, radius: 74 },
  { id: 'emp', key: '2', name: 'EMP TAG', price: 600, blurb: 'stick on a camera: dark for 9 s', duration: 9, radius: 60 },
  { id: 'coin', key: '3', name: 'COIN', price: 100, blurb: 'clink! guards go look', duration: 1.2, radius: 260 },
  { id: 'cutter', key: '4', name: 'GLASS CUTTER', price: 500, blurb: 'cut a glass wall: new route', duration: 0, radius: 0 },
];
export const THROW_RANGE = 300;
export const START_CASH = 1800;

export const TIMES = { lift: 1.3, pick: 2.2, cut: 1.6, wire: 1.4, vent: 1.8, spotted: 1.25 };

export const COLOR = {
  night: '#0b0a1d',
  floor: '#1a1740',
  floorAlt: '#201c4d',
  inlay: '#3a3274',
  gold: '#f0c25a',
  goldDeep: '#a87a2a',
  wall: '#07060f',
  wallTrim: '#d6a24a',
  glass: 'rgba(150,230,255,0.35)',
  glassEdge: '#9ff0ff',
  door: '#5a3a1e',
  shadow: 'rgba(20,10,70,0.72)',
  shadowEdge: '#6d5cff',
  thief: '#c9a2ff',
  thiefCape: '#6b3fd6',
  loot: '#5fe3ff',
  exit: '#3cf0a0',
  panel: 'rgba(8,7,22,0.92)',
  panelEdge: '#3b336f',
  text: '#f5efe0',
  dim: '#a39fc4',
  calm: '#58e08a',
  alert: '#ffb43c',
  lockdown: '#ff3b4e',
  coneCalm: [255, 222, 130],
  coneSus: [255, 150, 40],
  coneAlert: [255, 45, 60],
  coneCam: [255, 70, 190],
  smoke: 'rgba(200,205,225,0.85)',
  emp: '#7af6ff',
};
