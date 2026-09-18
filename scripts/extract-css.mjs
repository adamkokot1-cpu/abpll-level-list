import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const match = html.match(/<style>([\s\S]*?)<\/style>/);
if (!match) throw new Error('Style block not found');

let css = match[1]
  .replace(/url\('tlo\.jpg'\)/g, "url('/tlo.jpg')")
  .trim();

fs.mkdirSync(path.join(root, 'app'), { recursive: true });
fs.writeFileSync(path.join(root, 'app', 'globals.css'), css);
console.log('Wrote globals.css', css.length, 'bytes');
