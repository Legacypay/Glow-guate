// Renders tools/og/social-preview.html to img/og-image.png (1200x630) with headless Chrome.
//   node tools/og/render.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const src = 'file://' + resolve(join(here, 'social-preview.html'));
const out = resolve(join(here, '..', '..', 'site', 'img', 'og-image.png'));

execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
  '--force-device-scale-factor=1', '--window-size=1200,630',
  '--virtual-time-budget=6000',
  `--screenshot=${out}`, src,
], { stdio: 'inherit' });
console.log('wrote', out);
