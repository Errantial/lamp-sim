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
  const d = Math.abs(130 - (345 - Math.sqrt(15 * 15 - 0))) - 2, want = 21 * d / 428 - 13.6;
  assert.ok(Math.abs(m.collisionIndicator() - want) < 1e-9);
});

console.log(`\n${passed} tests passed`);
