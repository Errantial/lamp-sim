// Builds the ecg.name home page (dist/index.html) and posts (dist/posts/).
// Upload = drop a file into posts/ and push (or use GitHub's "Add file > Upload files").
//   *.md   -> rendered to /posts/<slug>/   (title = first "# heading", else the file name)
//   *.html -> served as-is at /posts/<slug>/ (title = <title>, else the file name)
//   other  -> served as-is at /posts/<file> (pdf, images, ...)
// Optional date prefix in the file name, e.g. 2026-11-20-my-post.md, sorts newest first and is shown.
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const src = path.join(root, 'posts');
const out = path.join(dist, 'posts');

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = 'html{background:#0b0b0c;color:#d6d6d6;color-scheme:dark}body{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:12vh 1.25rem}'
  + 'a{color:#d6d6d6;text-decoration:none;border-bottom:1px solid #444}a:hover{border-color:#d6d6d6}'
  + 'ul{list-style:none;padding:0;margin:0}li{display:flex;gap:1rem;padding:.35rem 0}time{color:#666;font-variant-numeric:tabular-nums;flex:none}'
  + 'h1,h2,h3{color:#eee;line-height:1.25}img{max-width:100%}pre{overflow:auto;background:#151517;padding:1rem}code{background:#151517}'
  + 'blockquote{margin:0;padding-left:1rem;border-left:2px solid #333;color:#999}.back{display:inline-block;margin-bottom:2rem;color:#777}';
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>${CSS}</style></head><body>${body}</body></html>\n`;

const items = [];
fs.rmSync(out, { recursive: true, force: true });
if (fs.existsSync(src)) {
  for (const file of fs.readdirSync(src)) {
    if (file.startsWith('.') || file.toLowerCase() === 'readme.md') continue;
    const full = path.join(src, file);
    if (!fs.statSync(full).isFile()) continue;
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, path.extname(file));
    const m = base.match(/^(\d{4}-\d{2}-\d{2})[-_ ]?(.*)$/);
    const date = m ? m[1] : '';
    const name = (m ? m[2] : base) || base;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || base;
    const pretty = name.replace(/[-_]+/g, ' ');
    const text = ext === '.md' || ext === '.html' || ext === '.htm' ? fs.readFileSync(full, 'utf8') : '';
    let title = pretty, href;
    if (ext === '.md') {
      const h = text.match(/^#\s+(.+)$/m);
      if (h) title = h[1].trim();
      const dir = path.join(out, slug);
      fs.mkdirSync(dir, { recursive: true });
      const when = date ? `<time>${date}</time>` : '';
      fs.writeFileSync(path.join(dir, 'index.html'), page(title, `<a class="back" href="/">&larr; ecg.name</a>${when}<article>${marked.parse(text)}</article>`));
      href = `/posts/${slug}/`;
    } else if (ext === '.html' || ext === '.htm') {
      const t = text.match(/<title>([^<]*)<\/title>/i);
      if (t && t[1].trim()) title = t[1].trim();
      const dir = path.join(out, slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(full, path.join(dir, 'index.html'));
      href = `/posts/${slug}/`;
    } else {
      fs.mkdirSync(out, { recursive: true });
      fs.copyFileSync(full, path.join(out, file));
      href = `/posts/${encodeURIComponent(file)}`;
    }
    items.push({ date, title, href });
  }
}
items.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

// pinned pages (existing apps), listed after posts
const pinned = [{ title: 'Discharge lamp simulation', href: '/lamp-sim/' }];
const staticDir = path.join(root, 'static');
if (fs.existsSync(staticDir)) for (const n of fs.readdirSync(staticDir)) pinned.push({ title: n.replace(/[-_]+/g, ' '), href: `/${n}/` });

const li = i => `<li>${i.date ? `<time>${i.date}</time>` : ''}<a href="${esc(i.href)}">${esc(i.title)}</a></li>`;
fs.writeFileSync(path.join(dist, 'index.html'), page('ecg.name', `<ul>${items.map(li).join('')}${pinned.map(li).join('')}</ul>`));
console.log(`Built home page: ${items.length} post(s), ${pinned.length} page(s)`);
