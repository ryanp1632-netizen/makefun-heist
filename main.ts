// VELVET HOUR's hand-in program (Node 22, standard library only). The game itself is game/, plain
// static files (index.html + ES modules, Canvas2D, WebAudio synth, no library, no network). This
// program copies game/ and screenshots/ to /output (MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json with the vendored make.fun buildDossier, unchanged.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The cover is the first screenshot by name; the scorer wants 3 or 4 of them.
const shots = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
if (shots.length < 3 || shots.length > 4) console.error(`main.ts: expected 3-4 screenshots, found ${shots.length}`);

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
