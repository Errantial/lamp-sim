// Browser smoke test: builds nothing itself, expects `npm run build` to have produced dist/.
// Serves dist/ on a random port, loads /lamp-sim/ in Chromium and checks that both tabs and every atom type run without errors.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

// apply exactly the headers vercel.json sets for /lamp-sim/*, so a CSP violation shows up as a console error here
const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
const pageHeaders = Object.fromEntries(vercel.headers.find(h => h.source === '/lamp-sim/(.*)').headers.map(h => [h.key, h.value]));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, Object.assign({ 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }, pageHeaders));
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/lamp-sim/`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  try {
    await page.goto(base + '?seed=1');
    await page.waitForFunction(() => window.lampSim);
    assert.strictEqual(await page.title(), 'Discharge Lamps');
    assert.ok(/src="js\/main\.js\?v=[0-9a-f]{8}"/.test(await page.content()), 'built assets carry a content hash');

    // every atom type runs on both tabs
    for (const tab of ['tabSingle', 'tabMultiple']) {
      await page.click('#' + tab);
      for (const el of ['hydrogen', 'mercury', 'sodium', 'neon', 'configurable']) {
        await page.selectOption('#element', el);
        await page.check('input[name=mode][value=continuous]');
        await page.evaluate(() => { const m = lampSim.models[lampSim.tab]; m.setVoltage(30); m.setPct(100); });
        await page.waitForTimeout(700);
        const n = await page.evaluate(() => lampSim.models[lampSim.tab].atoms.length);
        assert.ok(n >= 1, `${tab}/${el}: atoms present`);
      }
      await page.selectOption('#element', 'hydrogen');
    }

    // One Atom: Fire at 24.75 V excites the atom and a photon is recorded
    await page.click('#tabSingle');
    await page.check('input[name=mode][value=single]');
    await page.evaluate(() => lampSim.models.single.spectrum.clear());
    await page.fill('#voltText', '24.75'); await page.press('#voltText', 'Enter');
    await page.click('#fire');
    await page.waitForFunction(() => lampSim.models.single.spectrum.size > 0, null, { timeout: 15000 });
    const lines = await page.evaluate(() => [...lampSim.models.single.spectrum.keys()]);
    assert.deepStrictEqual(lines, ['121.55'], 'only the n=2 -> 1 line at 24.75 V');

    // controls and dialogs
    await page.click('#clockPause'); assert.ok(await page.isEnabled('#clockStep'));
    await page.click('#clockPause');
    await page.click('#lampsBtn'); assert.ok(await page.evaluate(() => document.getElementById('lampsDlg').open)); await page.keyboard.press('Escape');
    // URL presets restore a setup; the setup link round-trips; line markers label hydrogen's Balmer-alpha line
    await page.goto(base + '?tab=single&element=sodium&v=-12.5&pct=55&mode=continuous&lines=1&seed=3');
    await page.waitForFunction(() => window.lampSim);
    const st = await page.evaluate(() => { const m = lampSim.models.single; return [lampSim.tab, m.elementKey, m.V, m.pct, m.mode, lampSim.ui.single.lines, lampSim.seed]; });
    assert.deepStrictEqual(st, ['single', 'sodium', -12.5, 55, 'continuous', true, 3]);
    assert.ok((await page.evaluate(() => lampSim.setupLink())).includes('element=sodium'));
    await page.selectOption('#element', 'hydrogen');
    const box = await page.locator('#stage').boundingBox(), k = box.width / 710;
    await page.mouse.move(box.x + (130 + (656.3 - 300) / 500 * 440) * k, box.y + 422 * k);
    await page.waitForFunction(() => document.getElementById('tip').style.display === 'block');
    assert.ok((await page.textContent('#tip')).startsWith('Balmer-α (3→2)'), 'tooltip names the Balmer-alpha line');

    // analysis panel: open it on a busy lamp and check the collision statistics fill in
    await page.goto(base + '?seed=2&v=30&pct=100');
    await page.waitForFunction(() => window.lampSim);
    await page.click('#analysis > summary');
    await page.waitForFunction(() => lampSim.models.multiple.stats.collisions > 50, null, { timeout: 15000 });
    assert.ok(await page.evaluate(() => lampSim.models.multiple.efficiency().light > 0));
    await page.click('#statsReset');
    assert.strictEqual(await page.evaluate(() => lampSim.models.multiple.stats.collisions), 0);

    // realistic physics: switch on through the UI, set sliders, run, and restore from the URL
    await page.goto(base + '?seed=9&v=30&pct=100');
    await page.waitForFunction(() => window.lampSim);
    await page.click('#physics > summary');
    await page.selectOption('#physMode', 'realistic');
    await page.$eval('#press', el => { el.value = 80; el.dispatchEvent(new Event('input')); });
    await page.$eval('#temp', el => { el.value = 900; el.dispatchEvent(new Event('input')); });
    await page.$eval('#life', el => { el.value = 1; el.dispatchEvent(new Event('input')); });
    const real = await page.evaluate(() => lampSim.models.multiple.realism);
    assert.deepStrictEqual([real.on, real.pressure, real.temp, real.lifeScale], [true, 80, 900, 2]);
    await page.waitForFunction(() => lampSim.models.multiple.stats.collisions > 30, null, { timeout: 15000 });
    assert.ok((await page.evaluate(() => lampSim.setupLink())).includes('physics=realistic'));
    await page.goto(base + '?physics=realistic&pressure=40&temp=600&life=0.5');
    await page.waitForFunction(() => window.lampSim);
    assert.deepStrictEqual(await page.evaluate(() => { const r = lampSim.models.multiple.realism; return [r.on, r.pressure, r.temp, r.lifeScale]; }), [true, 40, 600, 0.5]);

    // challenges: identify the gas (levels and names hidden), then find the voltage
    await page.goto(base + '?seed=5');
    await page.waitForFunction(() => window.lampSim);
    await page.click('.menu:nth-child(3) > button'); await page.click('#mGas');
    assert.ok(await page.evaluate(() => lampSim.models.multiple.mystery), 'gas is hidden');
    assert.ok(await page.isDisabled('#element'), 'atom type is locked while the gas is a mystery');
    await page.selectOption('#chGas', await page.evaluate(() => ['hydrogen', 'mercury', 'sodium', 'neon'].find(g => g !== lampSim.challenge.state.target)));
    await page.click('#chCheck'); assert.ok((await page.textContent('#chFeedback')).startsWith('Not quite'));
    await page.selectOption('#chGas', await page.evaluate(() => lampSim.challenge.state.target));
    await page.click('#chCheck'); assert.ok((await page.textContent('#chFeedback')).startsWith('Correct!'));
    assert.strictEqual(await page.evaluate(() => lampSim.models.multiple.mystery), false, 'answer reveals the gas');
    await page.click('.menu:nth-child(3) > button'); await page.click('#mVolt');
    assert.strictEqual(await page.evaluate(() => lampSim.tab), 'single');
    await page.fill('#chVolt', '1'); await page.click('#chCheck'); assert.ok((await page.textContent('#chFeedback')).startsWith('Not quite'));
    await page.fill('#chVolt', (await page.evaluate(() => lampSim.challenge.state.target.v)).toFixed(1)); await page.click('#chCheck');
    assert.ok((await page.textContent('#chFeedback')).startsWith('Correct!'));
    assert.strictEqual(await page.textContent('#chScore'), 'Solved: 2 of 2');
    await page.click('#chEnd'); assert.ok(await page.isHidden('#challenge'));

    assert.deepStrictEqual(errors, [], 'no console/page errors');
    console.log('smoke test passed');
  } finally {
    await browser.close(); server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
