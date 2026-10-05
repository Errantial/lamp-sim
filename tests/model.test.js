// Physics regression tests pinned to values measured from PhET's decompiled model / live sim (see notes/).
// Run: npm test   (plain Node, no dependencies)
'use strict';
const assert = require('assert');
require('../js/elements.js');
require('../js/model.js');
const DL = globalThis.DL;

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  -', name); };

// one stationary atom at the tube centre, as in PhET's One Atom tab
function single(element, seed) { const m = DL.createModel({ tab: 'single', element, rng: mulberry32(seed || 1) }); return m; }
function shoot(m, V, units = 1500) {
  m.setVoltage(V); m.electrons = []; m.photons = []; m.spectrum.clear();
  m.atoms[0].s = 0; m.atoms[0].t = 0; m.spawn(true);
  let maxS = 0, exciteAt = null;
  for (let t = 0; t < units; t += 3) { m.step(3); maxS = Math.max(maxS, m.atoms[0].s); if (exciteAt === null && m.atoms[0].s) exciteAt = t; }
  return { maxS, exciteAt };
}

test('n=2 threshold voltage is 21.85 V (single atom, contact-point energy)', () => {
  const m = single('hydrogen');
  assert.strictEqual(shoot(m, 21.5).maxS, 0);
  assert.strictEqual(shoot(m, 21.8).maxS, 0);
  assert.ok(shoot(m, 21.9).maxS >= 1);
});

test('electron arrives ~192 units after emission at 24.75 V', () => {
  const m = single('hydrogen');
  const r = shoot(m, 24.75);
  assert.ok(r.maxS === 1 && Math.abs(r.exciteAt - 192) <= 6, `got ${JSON.stringify(r)}`);
});

test('higher levels open at ~26.0 V (n=3) and ~27.8 V (n=4); 30 V reaches n=6, uniform choice', () => {
  const m = single('hydrogen', 7);
  let max26 = 0, max25 = 0; for (let i = 0; i < 200; i++) { max25 = Math.max(max25, shoot(m, 25.7).maxS); max26 = Math.max(max26, shoot(m, 26.1).maxS); }
  assert.strictEqual(max25, 1); assert.strictEqual(max26, 2);
  const hist = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 1000; i++) hist[shoot(m, 30, 400).maxS]++;     // measured before decay (400 units < first decay + travel)
  assert.strictEqual(hist[0], 0);
  for (let s = 1; s <= 5; s++) assert.ok(hist[s] > 140 && hist[s] < 260, `level ${s + 1} count ${hist[s]}`);
});

test('hydrogen n=3 decays 49% to n=1 (102.56 nm) / 51% to n=2 (656.35 nm)', () => {
  const m = single('hydrogen', 3); let uv = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    m.spectrum.clear(); m.atoms[0].s = 2; m.atoms[0].t = 48; m.step(0.0001);
    if (m.spectrum.has('102.56')) uv++; else assert.ok(m.spectrum.has('656.35'));
  }
  assert.ok(Math.abs(uv / N - 0.49) < 0.015, `uv fraction ${uv / N}`);
});

test('electron energy at the far plate is ~1.0243 V', () => {
  const m = single('hydrogen'); m.atoms = []; m.setVoltage(20); m.spawn(true);
  const e = m.electrons[0]; let vlast = 0;
  while (m.electrons.length) { vlast = e.vx; m.step(1); }
  const ke = DL.keOf(vlast); assert.ok(Math.abs(ke - 20.49 * 428 / 430) < 0.3, `ke ${ke}`);
});

test('electrons start from the other plate for negative voltage and are never produced at 0 V', () => {
  const m = single('hydrogen'); m.setVoltage(-23); m.spawn(true);
  assert.ok(m.electrons[0].x > DL.C.ANODE_X - 5);
  m.setVoltage(0); assert.strictEqual(m.V, 0.004);
});

test('mercury metastable level (self-transition) stays excited and emits nothing', () => {
  const m = single('mercury', 5);
  m.atoms[0].s = 3; m.atoms[0].t = 0;
  for (let t = 0; t < 600; t += 3) m.step(3);
  assert.strictEqual(m.atoms[0].s, 3); assert.strictEqual(m.spectrum.size, 0);
});

test('configurable atom: default levels, and decay rule (50% one level down, else uniform below)', () => {
  const lv = DL.configurableLevels(6).map(x => +x.toFixed(2)); assert.deepStrictEqual(lv, [-13.6, -9.6, -7.5, -5.4, -3.3, -1.2]);
  const m = single('configurable', 11); m.setNumLevels(5);
  const to = [0, 0, 0, 0, 0]; const N = 8000;
  for (let i = 0; i < N; i++) { m.spectrum.clear(); m.atoms[0].s = 4; m.atoms[0].t = 48; m.step(0.0001); to[m.atoms[0].s]++; }
  assert.ok(Math.abs(to[3] / N - 0.5) < 0.03); assert.ok(Math.abs(to[0] / N - 1 / 6) < 0.03 && Math.abs(to[2] / N - 1 / 6) < 0.03);
});

test('collision indicator follows PhET (|V|*d/(plateDistance-2) + ground energy)', () => {
  const m = single('hydrogen'); m.setVoltage(21);
  assert.strictEqual(m.collisionIndicator(), null, 'hidden until the first collision');
  m.indicatorEnabled = true;
  const d = Math.abs(130 - (345 - Math.sqrt(15 * 15 - 0))) - 2, want = 21 * d / 428 - 13.6;
  assert.ok(Math.abs(m.collisionIndicator() - want) < 1e-9);
});

test('atom radius follows PhET: 17 px at ground, +6 px * energy fraction (23 px at the top level)', () => {
  const m = single('hydrogen'); const a = m.atoms[0];
  a.s = 0; assert.strictEqual(m.atomRadius(a), 17);
  a.s = 5; assert.strictEqual(m.atomRadius(a), 23);
  a.s = 1; assert.ok(Math.abs(m.atomRadius(a) - (17 + 6 * 10.2 / 13.222)) < 1e-9);
});

test('atoms stay inside the tube (wall bounce uses the state radius) and collide elastically', () => {
  const m = DL.createModel({ tab: 'multiple', nAtoms: 30, rng: mulberry32(9) });
  m.setMode('single'); let e0 = 0; for (const a of m.atoms) e0 += a.vx * a.vx + a.vy * a.vy;
  for (let t = 0; t < 60000; t += 3) m.step(3);
  let e1 = 0; for (const a of m.atoms) { e1 += a.vx * a.vx + a.vy * a.vy; const R = m.atomRadius(a), T = DL.C.TUBE;
    assert.ok(a.x >= T.x0 + R - 1e-6 && a.x <= T.x1 - R + 1e-6 && a.y >= T.y0 + R - 1e-6 && a.y <= T.y1 - R + 1e-6); }
  assert.ok(Math.abs(e1 - e0) / e0 < 1e-9, `kinetic energy changed ${e0} -> ${e1}`);
});

test('same seed gives an identical run; different seeds differ', () => {
  const run = seed => { const m = DL.createModel({ tab: 'multiple', nAtoms: 30, rng: DL.mulberry32(seed) }); m.setVoltage(30); m.setPct(100);
    for (let t = 0; t < 6000; t += 3) m.step(3);
    return JSON.stringify([m.atoms.map(a => [a.x, a.y, a.s]), m.electrons.map(e => e.x), [...m.spectrum]]); };
  assert.strictEqual(run(42), run(42)); assert.notStrictEqual(run(42), run(43));
});

test('photons are removed outside the PhET model bounds (x 70..870, y -200..600), not before', () => {
  const m = single('hydrogen'); const B = DL.C.PHOTON_BOUNDS;
  m.photons = [{ x: 700, y: 300, vx: 0, vy: 0, w: 500, t: 0 }, { x: 900, y: 300, vx: 0, vy: 0, w: 500, t: 0 }, { x: 300, y: 650, vx: 0, vy: 0, w: 500, t: 0 }, { x: 300, y: -150, vx: 0, vy: 0, w: 500, t: 0 }];
  m.step(1); assert.strictEqual(m.photons.length, 2); assert.ok(B.y1 === 600 && B.y0 === -200);
});

// ---- per-element behaviour ----
const ELEMENTS = ['hydrogen', 'mercury', 'sodium', 'neon'];
// voltage at which an electron from the plate centre reaches the single atom's contact point with energy `gap`
const thresholdV = gap => gap / (DL.C.ACC_K * 2 * DL.C.KE_PER_V2 * 196);

for (const el of ELEMENTS) {
  test(`${el}: first excitation threshold matches the lowest gap`, () => {
    const m = single(el, 21), L = m.levels, gap = Math.min(...L.slice(1).map(e => e - L[0])), v0 = thresholdV(gap);
    if (v0 + 0.4 > DL.C.MAX_V) {                                      // verified live in PhET: Neon never excites a centred single atom at 30 V
      assert.strictEqual(shoot(m, DL.C.MAX_V, 2500).maxS, 0, `${el} should not excite at max voltage (needs ${v0.toFixed(1)} V)`);
      return;
    }
    assert.strictEqual(shoot(m, v0 - 0.4, 2500).maxS, 0, 'below threshold');
    assert.ok(shoot(m, v0 + 0.4, 2500).maxS >= 1, 'above threshold');
  });

  test(`${el}: decay frequencies follow the transition weights; photons have wavelength 1239.84/gap`, () => {
    const m = single(el, 5), N = 4000, tr = DL.ELEMENTS[el].transitions;
    for (let s = 1; s < m.levels.length; s++) {
      const rows = tr.filter(r => r[0] === s); if (!rows.length) continue;
      const sum = rows.reduce((a, r) => a + r[2], 0), want = new Map(); rows.forEach(r => want.set(r[1], (want.get(r[1]) || 0) + r[2] / sum));
      const got = new Map();
      for (let k = 0; k < N; k++) { m.spectrum.clear(); m.atoms[0].s = s; m.atoms[0].t = 48; m.step(0.0001); const to = m.atoms[0].s; got.set(to, (got.get(to) || 0) + 1);
        if (to !== s) assert.ok(m.spectrum.has((DL.C.HC / (m.levels[s] - m.levels[to])).toFixed(2))); else assert.strictEqual(m.spectrum.size, 0); }
      for (const [to, p] of want) assert.ok(Math.abs((got.get(to) || 0) / N - p) < 0.04, `${el} ${s}->${to}: ${(got.get(to) || 0) / N} vs ${p}`);
    }
  });
}

// ---- invariants under random settings ----
test('invariants hold for random voltage/rate/element/tab runs', () => {
  const rnd = mulberry32(2024);
  for (let run = 0; run < 12; run++) {
    const tab = rnd() < 0.5 ? 'single' : 'multiple', el = ELEMENTS[Math.floor(rnd() * 4)];
    const m = DL.createModel({ tab, element: el, nAtoms: 30, rng: mulberry32(100 + run) });
    let emitted = 0; m.onEvent = ev => { if (ev.type === 'emit') emitted++; };
    m.setMode('continuous'); m.setVoltage((rnd() - 0.5) * 60); m.setPct(rnd() * 100);
    const T = DL.C.TUBE, B = DL.C.PHOTON_BOUNDS;
    for (let t = 0; t < 4500; t += 3) {
      m.step(3);
      // PhET quirk (ported): after a collision the electron's energy is set to KE at the base-sphere contact minus the gap, which is up to
      // ~12 px further along the field than the electron actually is, so allow the field gain over that distance
      for (const e of m.electrons) assert.ok(DL.keOf(e.vx) <= 1.0243 * Math.abs(m.V) * (1 + 12 / 430) + 0.05, `electron energy ${DL.keOf(e.vx)} > field gain at V=${m.V}`);
      // a level change next to a wall can grow the radius by up to 6 px; the overlap is resolved by the next wall check (as in PhET)
      for (const a of m.atoms) { assert.ok(a.s >= 0 && a.s < m.levels.length); const R = DL.C.R_ATOM + 2 - 6.5;
        assert.ok(a.x >= T.x0 + R && a.x <= T.x1 - R && a.y >= T.y0 + R && a.y <= T.y1 - R, 'atom left the tube'); }
      for (const p of m.photons) assert.ok(p.x >= B.x0 && p.x <= B.x1 && p.y >= B.y0 && p.y <= B.y1);
    }
    let counted = 0; for (const n of m.spectrum.values()) counted += n;
    assert.strictEqual(counted, emitted, 'spectrometer count equals emitted photons');
  }
});

test('lamp glow colours come from the simulated lines: Na yellow-orange, Ne red-orange, H magenta, Hg blue-ish', () => {
  require('../js/view.js');
  const col = k => DL.view.lampColor(k);
  const [nr, ng, nb] = col('sodium'); assert.ok(nr > 200 && ng > 120 && nb < 60, `sodium ${[nr, ng, nb]}`);
  const [er, eg, eb] = col('neon'); assert.ok(er === 255 && eg < 200 && eb < 60, `neon ${[er, eg, eb]}`);
  const [hr, hg, hb] = col('hydrogen'); assert.ok(hr > hg && hb > hg, `hydrogen ${[hr, hg, hb]}`);
  const [mr, mg, mb] = col('mercury'); assert.ok(mb >= mr * 0.6, `mercury ${[mr, mg, mb]}`);
});

test('every browser script parses and the i18n tables are complete', () => {
  const fs = require('fs'), path = require('path'), vm = require('vm');
  for (const f of fs.readdirSync(path.join(__dirname, '..', 'js')).filter(n => n.endsWith('.js'))) new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });
  require('../js/i18n.js');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8');
  const keys = lang => { const from = src.indexOf('    ' + lang + ': {'), to = src.indexOf('\n    }', from); return new Set([...src.slice(from, to).matchAll(/'([a-z]+\.[A-Za-z0-9]+)':/g)].map(m => m[1])); };
  const en = keys('en'), es = keys('es');
  for (const k of en) assert.ok(es.has(k), `missing Spanish string: ${k}`);
  for (const k of es) assert.ok(en.has(k), `Spanish-only string: ${k}`);
});

console.log(`\n${passed} tests passed`);
