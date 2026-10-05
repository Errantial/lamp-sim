// Copies the static site into dist/lamp-sim/ so it is served at <domain>/lamp-sim/ (see vercel.json).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'lamp-sim');
const files = ['index.html', 'css', 'js'];            // everything the page loads (all paths are relative)

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, f), { recursive: true });
}
console.log('Built', out);
