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

test('statistics: histogram counts every collision, energy accounting stays physical', () => {
  const m = DL.createModel({ tab: 'multiple', element: 'hydrogen', nAtoms: 30, rng: mulberry32(77) });
  m.setVoltage(30); m.setPct(100);
  for (let t = 0; t < 24000; t += 3) m.step(3);
  const s = m.stats, binTotal = s.bins.reduce((a, b) => a + b, 0), eff = m.efficiency();
  assert.ok(s.collisions > 100, `collisions ${s.collisions}`);
  assert.strictEqual(binTotal, s.collisions);
  assert.ok(s.excitations <= s.collisions && s.excitations > 0);
  assert.ok(eff.light > 0 && eff.light <= 1, `light fraction ${eff.light}`);
  assert.ok(Math.abs(eff.light - (eff.uv + eff.visible + eff.ir)) < 1e-9);
  assert.ok(eff.uv > eff.visible, 'hydrogen: most energy leaves as UV (Lyman) rather than visible');
  let counted = 0; for (const n of m.spectrum.values()) counted += n; assert.strictEqual(counted, s.photons);
  m.resetStats(); assert.strictEqual(m.stats.collisions, 0); assert.strictEqual(m.efficiency().light, 0);
});

test('no collision below the first gap means an empty histogram and zero light', () => {
  const m = DL.createModel({ tab: 'multiple', element: 'hydrogen', nAtoms: 30, rng: mulberry32(5) });
  m.setVoltage(8); m.setPct(100); for (let t = 0; t < 9000; t += 3) m.step(3);
  assert.strictEqual(m.stats.excitations, 0); assert.strictEqual(m.stats.photons, 0); assert.ok(m.stats.bins.slice(11).every(n => n === 0), 'no collision energy above the field gain');
});

test('thresholdVoltage matches the measured single-atom thresholds; reachableTargets honours the 30 V limit', () => {
  const H = DL.ELEMENTS.hydrogen.levels;
  assert.ok(Math.abs(DL.thresholdVoltage(H, 1) - 21.85) < 0.01);
  const m = single('hydrogen', 31);                                   // cross-check against an actual simulated shot (+/- 0.15 V)
  assert.strictEqual(shoot(m, DL.thresholdVoltage(H, 2) - 0.2, 2500).maxS < 2, true);
  const targets = DL.reachableTargets(29.5);
  assert.ok(targets.length > 10);
  assert.ok(targets.some(t => t.element === 'hydrogen' && t.level === 1));
  assert.ok(!targets.some(t => t.element === 'neon'), 'neon needs more than 30 V on a centred single atom');
  assert.ok(targets.every(t => t.v > 0 && t.v <= 29.5));
});

test('every challenge target has a correct answer key (unreachable just below, reachable just above)', () => {
  for (const tg of DL.reachableTargets(29.5)) {
    const m = single(tg.element, 100 + tg.level);
    const below = shoot(m, tg.v - 0.15, 2500).maxS;
    assert.ok(below < tg.level, `${tg.element} level ${tg.level + 1} reached below its threshold ${tg.v.toFixed(2)} V`);
    let reached = false;                                                // excitation picks uniformly among reachable levels, so allow a few shots
    for (let k = 0; k < 80 && !reached; k++) reached = shoot(m, tg.v + 0.15, 2500).maxS >= tg.level;
    assert.ok(reached, `${tg.element} level ${tg.level + 1} never reached just above ${tg.v.toFixed(2)} V`);
  }
});

test('vercel.json serves the sim at /lamp-sim/ with security and caching headers', () => {
  const cfg = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'vercel.json'), 'utf8'));
  assert.strictEqual(cfg.outputDirectory, 'dist'); assert.strictEqual(cfg.trailingSlash, true);
  assert.deepStrictEqual(cfg.redirects.map(r => [r.source, r.destination]), [['/', '/lamp-sim/']]);
  const all = Object.fromEntries(cfg.headers.find(h => h.source === '/lamp-sim/(.*)').headers.map(h => [h.key, h.value]));
  assert.ok(/default-src 'self'/.test(all['Content-Security-Policy']) && !/unsafe-inline|unsafe-eval/.test(all['Content-Security-Policy']));
  assert.strictEqual(all['X-Content-Type-Options'], 'nosniff');
  assert.ok(cfg.headers.some(h => /js\|css/.test(h.source) && h.headers.some(x => /immutable/.test(x.value))));
});

// ---------------- realistic physics ----------------
const realSingle = (el, seed, opts) => { const m = single(el, seed); m.setRealism(Object.assign({ on: true }, opts)); return m; };
const excitedFraction = (m, V, shots) => { let n = 0; for (let k = 0; k < shots; k++) if (shoot(m, V, 2500).maxS > 0) n++; return n / shots; };

test('realistic: cross-section shape (zero at threshold, peak 1 at 2x, decreasing 1/x tail)', () => {
  assert.strictEqual(DL.crossSection(1), 0); assert.strictEqual(DL.crossSection(0.5), 0);
  assert.ok(Math.abs(DL.crossSection(2) - 1) < 1e-12);
  assert.ok(DL.crossSection(1.2) < DL.crossSection(1.6) && DL.crossSection(1.6) < DL.crossSection(2));
  assert.ok(DL.crossSection(4) < DL.crossSection(2) && DL.crossSection(10) < DL.crossSection(4) && DL.crossSection(10) > 0);
});

test('realistic: excitation near threshold is probabilistic and grows with energy; simple mode is certain', () => {
  const v0 = thresholdV(Math.min(...DL.ELEMENTS.mercury.levels.slice(1).map(e => e - DL.ELEMENTS.mercury.levels[0])));
  const real = realSingle('mercury', 13);
  const lo = excitedFraction(real, v0 * 1.05, 300), hi = excitedFraction(real, v0 * 1.6, 300);
  assert.ok(lo < 0.3 && lo > 0.03, `just above threshold ${lo}`); assert.ok(hi > 0.6, `well above threshold ${hi}`);
  assert.strictEqual(excitedFraction(single('mercury', 13), v0 * 1.05, 60), 1, 'simple mode excites with certainty');
});

test('realistic: dipole-like strengths favour strong transitions over uniform choice', () => {
  const m = realSingle('hydrogen', 17), hist = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 500; k++) { const r = shoot(m, 30, 400).maxS; hist[r]++; }
  const excited = hist.slice(1).reduce((a, b) => a + b, 0);
  assert.ok(excited > 100, `excitations ${excited}`);
  assert.ok(hist[1] > 0.55 * excited, `n=2 should dominate: ${hist}`);                 // simple mode is uniform (checked elsewhere)
  assert.ok(hist[1] > hist[2] && hist[2] + hist[3] + hist[4] + hist[5] < hist[1]);
});

test('realistic: scattering keeps speed and lengthens transit; no electron can climb back to the emitting plate', () => {
  const m = realSingle('hydrogen', 21, { pressure: 100 }); m.atoms = []; m.setVoltage(0.004); m.setMode('single');
  m.electrons.push({ x: 340, y: 270, vx: 1.2, vy: 0 });
  for (let t = 0; t < 600; t += 3) { m.step(3); if (!m.electrons.length) break; }
  const e = m.electrons[0]; if (e) assert.ok(Math.abs(Math.hypot(e.vx, e.vy) - 1.2) < 0.01, 'speed preserved by elastic scattering');
  const run = p => { const mm = DL.createModel({ tab: 'multiple', rng: mulberry32(8) }); mm.setRealism({ on: true, pressure: p }); mm.setVoltage(20); mm.setPct(100);
    for (let t = 0; t < 12000; t += 3) mm.step(3); return mm.stats; };
  const free = run(0), dense = run(100), transit = s => s.flightTime / Math.max(1, s.arrived);
  assert.strictEqual(free.returned, 0); assert.strictEqual(dense.returned, 0, 'energy conservation: elastic scattering cannot send an electron back above its starting potential');
  assert.ok(transit(dense) > 1.15 * transit(free), `mean transit: dense ${transit(dense).toFixed(1)} vs free ${transit(free).toFixed(1)} units`);
});

test('realistic: temperature sets atom speeds (rms ~ sqrt(T)) and rescales on change', () => {
  const rms = m => Math.sqrt(m.atoms.reduce((s, a) => s + a.vx * a.vx + a.vy * a.vy, 0) / m.atoms.length);
  const m = DL.createModel({ tab: 'multiple', nAtoms: 30, rng: mulberry32(3) });
  m.setRealism({ on: true }); const r300 = rms(m);
  assert.ok(Math.abs(r300 - DL.C.REAL.SIGMA0 * Math.SQRT2) / (DL.C.REAL.SIGMA0 * Math.SQRT2) < 0.3, `rms at 300 K ${r300}`);
  m.setRealism({ temp: 1200 }); assert.ok(Math.abs(rms(m) / r300 - 2) < 1e-9, 'quadrupling T doubles the speeds');
  m.setRealism({ on: false }); assert.ok(m.atoms.every(a => Math.abs(a.vx) <= 0.05 && Math.abs(a.vy) <= 0.05), 'back to PhET start');
});

test('realistic: lifetimes are exponential with mean 48 x scale; simple mode is fixed', () => {
  const m = DL.createModel({ tab: 'multiple', rng: mulberry32(4) });
  assert.strictEqual(m.drawLifetime(), 48);
  m.setRealism({ on: true, lifeScale: 2 }); let sum = 0, min = Infinity; const N = 6000;
  for (let i = 0; i < N; i++) { const x = m.drawLifetime(); sum += x; min = Math.min(min, x); }
  assert.ok(Math.abs(sum / N - 96) / 96 < 0.05, `mean ${sum / N}`); assert.ok(min >= 1);
});

test('realistic: invariants hold in random runs (exact field-energy bound, atoms and electrons stay in the tube)', () => {
  const rnd = mulberry32(555);
  for (let run = 0; run < 10; run++) {
    const el = ELEMENTS[Math.floor(rnd() * 4)], m = DL.createModel({ tab: 'multiple', element: el, nAtoms: 30, rng: mulberry32(900 + run) });
    m.setRealism({ on: true, pressure: rnd() * 100, temp: 100 + rnd() * 1500, lifeScale: 0.25 + rnd() * 3.5 });
    m.setVoltage((rnd() - 0.5) * 60); m.setPct(rnd() * 100);
    const T = DL.C.TUBE; let emitted = 0; m.onEvent = ev => { if (ev.type === 'emit') emitted++; };
    for (let t = 0; t < 4500; t += 3) {
      m.step(3);
      for (const e of m.electrons) {
        assert.ok(DL.electronEnergy(e) <= 1.0243 * Math.abs(m.V) + 0.05, `electron energy ${DL.electronEnergy(e)} exceeds the field gain (V=${m.V})`);
        assert.ok(e.y >= T.y0 && e.y <= T.y1, 'electron left the tube sideways');
      }
      for (const a of m.atoms) { const R = DL.C.R_ATOM + 2 - 6.5; assert.ok(a.x >= T.x0 + R && a.x <= T.x1 - R && a.y >= T.y0 + R && a.y <= T.y1 - R); }
    }
    let counted = 0; for (const n of m.spectrum.values()) counted += n; assert.strictEqual(counted, emitted);
    const eff = m.efficiency(); assert.ok(eff.light >= 0 && eff.light <= 1);
  }
});

console.log(`\n${passed} tests passed`);
