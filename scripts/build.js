// Copies the static site into dist/lamp-sim/ so it is served at <domain>/lamp-sim/ (see vercel.json).
// Script/stylesheet URLs in the built index.html get a content hash (?v=...) so they can be cached "immutable";
// also writes dist/404.html (Vercel serves it for unknown paths).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'lamp-sim');
const files = ['index.html', 'css', 'js'];            // everything the page loads (all paths are relative)

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, f), { recursive: true });
}

// cache-busting: ?v=<8 hex of the file's sha256> on every local script / stylesheet reference
const indexPath = path.join(out, 'index.html');
const hash = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(out, rel))).digest('hex').slice(0, 8);
const html = fs.readFileSync(indexPath, 'utf8').replace(/(src|href)="((?:js|css)\/[^"?]+)"/g, (m, attr, rel) => `${attr}="${rel}?v=${hash(rel)}"`);
fs.writeFileSync(indexPath, html);

fs.writeFileSync(path.join(root, 'dist', '404.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found</title>
<style>body{font:16px/1.5 Arial,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#16202b}a{color:#2a6fc5}</style></head>
<body><h1>Page not found</h1><p>That page does not exist. The discharge lamp simulation lives at <a href="/lamp-sim/">/lamp-sim/</a>.</p></body></html>
`);
console.log('Built', out);
