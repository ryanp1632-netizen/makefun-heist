// Browser play-test: serves game/, opens it in headless Chrome over the DevTools protocol, and
// plays with real key and mouse events: title → blueprint (buy tools) → floor → walk, sneak,
// throw smoke, lift the loot, reach the car → results → next floor … → finale. Fails on any page
// error. Usage: node tools/play-test.mjs [outDir for screenshots]
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8095;
const DEVTOOLS = 9337;
const out = process.argv[2] ?? mkdtempSync(join(tmpdir(), 'heist-play-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'heist-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEVTOOLS}`, `--user-data-dir=${profile}`, '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });

let fails = 0;
const check = (c, m) => {
  console.log((c ? 'PASS ' : 'FAIL ') + m);
  if (!c) fails += 1;
};

async function main() {
  let targets = [];
  for (let i = 0; i < 40 && !targets.length; i += 1) {
    await sleep(250);
    try {
      targets = (await (await fetch(`http://127.0.0.1:${DEVTOOLS}/json/list`)).json()).filter((t) => t.type === 'page');
    } catch {}
  }
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
    else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(JSON.stringify(msg.params.args));
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      id += 1;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
  const KEYS = { Enter: 13, Space: 32, KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyE: 69, KeyR: 82, ShiftLeft: 16, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Backspace: 8 };
  const keyName = (code) => (code.startsWith('Key') ? code.slice(3).toLowerCase() : code.startsWith('Digit') ? code.slice(5) : code === 'ShiftLeft' ? 'Shift' : code);
  const down = (code) => send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: keyName(code), windowsVirtualKeyCode: KEYS[code] });
  const up = (code) => send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyName(code), windowsVirtualKeyCode: KEYS[code] });
  const tap = async (code) => {
    await down(code);
    await sleep(60);
    await up(code);
    await sleep(80);
  };
  const hold = async (codes, ms) => {
    for (const c of codes) await down(c);
    await sleep(ms);
    for (const c of codes) await up(c);
  };
  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(80);
  };
  const snap = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(out, `${name}.png`), Buffer.from(r.result.data, 'base64'));
  };
  const S = (expr) => evaluate(`(() => { const r = window.__heist; const s = r.state; return ${expr}; })()`);

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(1500);
  check((await S('r.screen')) === 'title', 'boots to the title screen');
  await snap('01-title');
  await tap('Enter');
  check((await S('r.screen')) === 'plan', 'ENTER opens the blueprint');
  await tap('Digit1');
  await tap('Digit4');
  await tap('Digit3');
  const kit = await S('r.kit');
  check(kit.smoke === 1 && kit.cutter === 1 && kit.coin === 1, `shop buys tools (${JSON.stringify(kit)}, cash ${await S('r.cash')})`);
  await snap('02-plan');
  await tap('Enter');
  check((await S('r.screen')) === 'play' && (await S('s.floorIndex')) === 0, 'ENTER starts floor 1');

  for (let floor = 0; floor < 3; floor += 1) {
    const x0 = await S('s.thief.x');
    const y0 = await S('s.thief.y');
    await hold(['KeyW'], 500);
    const y1 = await S('s.thief.y');
    check(y1 < y0 - 30, `floor ${floor + 1}: W walks up (${y0.toFixed(0)} → ${y1.toFixed(0)})`);
    await hold(['ShiftLeft', 'KeyD'], 500);
    const x1 = await S('s.thief.x');
    check(x1 > x0 + 10 && x1 - x0 < 60, `floor ${floor + 1}: SHIFT+D sneaks slowly right (${x0.toFixed(0)} → ${x1.toFixed(0)})`);
    await tap('Digit1');
    if ((await S('s.tools.smoke')) > 0) {
      await click(Math.round(x1 + 80), Math.round(y1));
      check((await S('s.clouds.length')) === 1, `floor ${floor + 1}: click throws smoke`);
    }
    await snap(`0${3 + floor * 2}-floor${floor + 1}`);
    // to the plinth (teleport: route-finding is the player's job), hold E to lift
    await S('(() => { r.state.guards.forEach(g => { g.route = [[-500,-500],[-490,-500]]; g.x = -500; g.y = -500; }); r.state.cameras.forEach(c => c.cut = true); Object.assign(r.state.thief, { x: s.floor.loot.x + 22, y: s.floor.loot.y }); return 1; })()');
    await sleep(100);
    await hold(['KeyE'], 1700);
    check((await S('s.thief.hasLoot')) && (await S('s.phase')) === 'getaway', `floor ${floor + 1}: holding E lifts the loot (getaway clock ${(await S('s.getawayT')).toFixed(1)})`);
    await S('(() => { const e = s.floor.exit; Object.assign(s.thief, { x: e.x + e.w / 2, y: e.y + e.h / 2 }); return 1; })()');
    await sleep(200);
    check((await S('r.screen')) === 'results', `floor ${floor + 1}: reaching the car shows results (${await S('r.results && r.results.rating')})`);
    await snap(`0${4 + floor * 2}-results${floor + 1}`);
    await tap('Enter');
    if (floor < 2) {
      check((await S('r.screen')) === 'plan', `floor ${floor + 1}: ENTER plans the next floor`);
      await tap('Digit1');
      await tap('Enter');
    }
  }
  check((await S('r.screen')) === 'finale', `the night ends on the finale (take ${await S('r.take')})`);
  await snap('09-finale');
  // caught path: a fresh run, stand in front of a guard
  await tap('KeyR');
  await tap('Enter');
  await S('(() => { const g = s.guards[0]; Object.assign(s.thief, { x: g.x + Math.cos(g.facing) * 60, y: g.y + Math.sin(g.facing) * 60 }); return 1; })()');
  await sleep(4500);
  const phase = await S('s.phase');
  check(phase === 'caught' || phase === 'spotted', `standing in a cone gets you caught (phase ${phase}, spotted ${await S('s.stats.spotted')})`);
  await snap('10-caught');
  await tap('KeyR');
  check((await S('s.phase')) === 'infil', 'R retries the floor');
  check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  ws.close();
}

main()
  .catch((e) => {
    console.log('FAIL ' + e.stack);
    fails += 1;
  })
  .finally(() => {
    chrome.kill();
    server.kill();
    console.log(`screens in ${out}`);
    console.log(fails ? `${fails} FAILED` : 'ALL PASS');
    process.exit(fails ? 1 : 0);
  });
