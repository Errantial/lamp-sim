/* Discharge-lamp model ported from PhET "Neon Lights & Other Discharge Lamps" 1.13 (see notes/phet-discharge-lamps-notes.md).
   Pure logic, no DOM: usable in the browser (window.DL) and in Node tests.
   Units: px (model), "unit" = model time unit; one clock tick = DT (12) units = 40 ms real. */
(function (root) {
  'use strict';
  const DL = root.DL = root.DL || {};

  const C = DL.C = {
    CATHODE_X: 130, ANODE_X: 560, PLATE_Y: 275, PLATE_HALF: 100, PLATE_D: 430,
    TUBE: { x0: 100, y0: 160, x1: 590, y1: 390 },
    R_ATOM: 15, R_E: 2, LIFETIME: 48, PULSE_DELAY: 100,
    ACC_K: 0.18018 / 430,                                            // px/unit^2 per volt
    KE_PER_V2: 1e12 * 9.109e-31 / 2 * 6.2414180501810012e18,         // eV per (px/unit)^2  (= 2.843)
    CURRENT_FACTOR: 0.001, PHOTON_SPEED: 0.5, HC: 1239.84, MAX_ATOMS: 30,
    MAX_CURRENT: { single: 25, multiple: 150 },
    MIN_V: -30, MAX_V: 30, DEFAULT_V: 23, DEFAULT_PCT: 20, HIST_BINS: 32,
    PHOTON_BOUNDS: { x0: 70, x1: 870, y0: -200, y1: 600 }          // LaserModel bounding rectangle (LasersConfig.ORIGIN 120,200 +/- 400)
  };

  const keOf = v => v * v * C.KE_PER_V2;
  const speedOf = ke => Math.sqrt(ke / C.KE_PER_V2);

  // cumulative-weight chooser per source level (PhET ProbabilisticChooser, weights normalised)
  function buildChoosers(transitions, nLevels) {
    const rows = Array.from({ length: nLevels }, () => []);
    for (const [from, to, w] of transitions) if (from < nLevels && to < nLevels) rows[from].push([to, w]);
    return rows.map(row => {
      const sum = row.reduce((s, e) => s + e[1], 0);
      let acc = 0;
      return row.map(([to, w]) => [to, acc += w / sum]);
    });
  }

  /**
   * cfg: { tab: 'single'|'multiple', element: key of DL.ELEMENTS, nAtoms, rng }
   */
  DL.createModel = function (cfg) {
    cfg = cfg || {};
    const rnd = cfg.rng || Math.random;
    const m = {
      tab: cfg.tab || 'multiple', V: C.DEFAULT_V, pct: C.DEFAULT_PCT, mode: null,
      elementKey: null, levels: [], choosers: [], configurable: false,
      atoms: [], electrons: [], photons: [], arrows: [], pulses: [], since: 0, lastHit: null, indicatorEnabled: false,
      spectrum: new Map(), specRun: true, heat: 0, nLevels: 2, stats: null
    };
    m.mode = m.tab === 'single' ? 'single' : 'continuous';
    m.maxCurrent = C.MAX_CURRENT[m.tab];

    // running statistics for the analysis panel: electron energy at collision (1 eV bins), energy delivered to electrons,
    // and the energy carried away by photons (UV < 380 nm < visible < 750 nm < IR)
    m.resetStats = function () { m.stats = { bins: new Array(C.HIST_BINS).fill(0), collisions: 0, excitations: 0, supplied: 0, photons: 0, photonE: { uv: 0, visible: 0, ir: 0 } }; };
    m.resetStats();
    m.efficiency = function () {                                      // fractions of the energy given to electrons that left as light
      let supplied = m.stats.supplied;
      for (const e of m.electrons) supplied += keOf(e.vx) + (e.lost || 0);   // include electrons still in flight
      const P = m.stats.photonE, total = P.uv + P.visible + P.ir, f = x => supplied > 0 ? Math.min(1, x / supplied) : 0;
      return { supplied, uv: f(P.uv), visible: f(P.visible), ir: f(P.ir), light: f(total) };
    };

    const accel = () => m.V * C.ACC_K;
    // fraction of the way from ground to the highest level (drives atom ring size and grey level)
    m.levelFraction = s => { const L = m.levels, hi = L[L.length - 1]; return hi > L[0] ? (L[s] - L[0]) / (hi - L[0]) : 0; };
    m.atomRadius = a => C.R_ATOM + 2 + 6 * m.levelFraction(a.s);
    const newAtom = (x, y, vx, vy) => ({ x, y, vx, vy, s: 0, t: 0 });
    m.newAtom = newAtom;

    // ---- elements / atoms ----
    m.setElement = function (key) {
      const el = DL.ELEMENTS[key];
      m.elementKey = key; m.configurable = !!el.configurable;
      if (m.configurable) { m.nLevels = m.nLevels || 2; m.levels = DL.configurableLevels(m.nLevels); m.choosers = []; }
      else { m.levels = el.levels.slice(); m.choosers = buildChoosers(el.transitions, m.levels.length); }
      m.resetAtomsToGround();
      m.electrons = []; m.photons = []; m.arrows = []; m.pulses = []; m.spectrum.clear(); m.lastHit = null; m.resetStats();
    };
    m.setNumLevels = function (n) {                                   // configurable atom only (2..6 levels)
      n = Math.max(2, Math.min(6, n));
      m.levels = DL.configurableLevels(n, m.levels.length >= 2 ? m.levels : null).slice(0, n);
      m.nLevels = n; m.resetAtomsToGround();
    };
    m.setLevel = function (i, e) {                                    // drag a configurable level (ground state stays put)
      if (!m.configurable || i < 1) return;
      const lo = m.levels[i - 1] + 0.05, hi = (i + 1 < m.levels.length ? m.levels[i + 1] : -0.3) - 0.05;
      m.levels[i] = Math.max(lo, Math.min(hi, e));
    };
    m.resetAtomsToGround = function () { for (const a of m.atoms) { a.s = 0; a.t = 0; } };

    function addAtom() {
      const T = C.TUBE, R = C.R_ATOM;
      m.atoms.push(newAtom(T.x0 + rnd() * (T.x1 - T.x0 - 4 * R) + 2 * R, T.y0 + rnd() * (T.y1 - T.y0 - 4 * R) + 2 * R,
                           (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1));
    }
    m.setAtomCount = function (n) {
      if (m.tab === 'single') { m.atoms = [newAtom((C.TUBE.x0 + C.TUBE.x1) / 2, (C.TUBE.y0 + C.TUBE.y1) / 2, 0, 0)]; return; }
      while (m.atoms.length < n) addAtom();
      m.atoms.length = n;
    };

    // ---- electrons ----
    m.setVoltage = function (v) { m.V = Math.max(C.MIN_V, Math.min(C.MAX_V, v)) || 0.004; };   // 0 is stored as 0.004
    m.fire = function () { m.pulses.push(0); recomputeHeat(); };
    function spawnElectron(single) {
      const dir = m.V > 0 ? 1 : -1, px = dir > 0 ? C.CATHODE_X : C.ANODE_X;
      const oneSpot = single || m.tab === 'single';                   // One Atom tab emits from the plate centre only
      m.electrons.push({ x: px + dir * 2, y: oneSpot ? C.PLATE_Y : C.PLATE_Y - C.PLATE_HALF + rnd() * 2 * C.PLATE_HALF, vx: 0 });
    }
    m.spawn = spawnElectron;
    m.rate = () => m.pct / 100 * m.maxCurrent * C.CURRENT_FACTOR;      // electrons per unit (continuous)
    function recomputeHeat() {                                         // heater-coil glow 0..255 (HeatingElement temperature)
      m.heat = m.pulses.length ? 255 * 0.5 : (m.mode === 'continuous' ? 255 * m.pct / 100 : 0);
    }
    m.setMode = function (mode) { m.mode = mode; recomputeHeat(); };
    m.setPct = function (p) { m.pct = Math.max(0, Math.min(100, p)); recomputeHeat(); };

    // ---- photons / spectrometer ----
    const wavelength = (hi, lo) => C.HC / (m.levels[hi] - m.levels[lo]);
    m.wavelength = wavelength;
    function emitPhoton(a, hi, lo) {
      const th = rnd() <= 0.1 ? (rnd() < 0.5 ? Math.PI : 0) : rnd() * 2 * Math.PI;   // 10% exactly horizontal
      const dx = Math.cos(th), dy = Math.sin(th), w = wavelength(hi, lo);
      m.photons.push({ x: a.x + dx * (C.R_ATOM + 10), y: a.y + dy * (C.R_ATOM + 10), vx: dx * C.PHOTON_SPEED, vy: dy * C.PHOTON_SPEED, w, t: 0 });
      m.arrows.push({ hi, lo, w, life: 250, kind: 'emit' });
      m.stats.photons++; m.stats.photonE[w < 380 ? 'uv' : w > 750 ? 'ir' : 'visible'] += m.levels[hi] - m.levels[lo];
      if (m.specRun) { const k = w.toFixed(2); m.spectrum.set(k, (m.spectrum.get(k) || 0) + 1); }
      if (m.onEvent) m.onEvent({ type: 'emit', w });
    }

    function decayTarget(s) {
      if (m.configurable) {                                           // ConfigurableAtomEnergyEmissionStrategy
        if (s <= 1) return 0;
        return rnd() < 0.5 ? s - 1 : Math.floor(rnd() * (s - 1));
      }
      const row = m.choosers[s];
      if (!row || !row.length) return s;
      const r = rnd();
      for (const [to, cum] of row) if (r <= cum) return to;
      return row[row.length - 1][0];
    }
    function decay(a) {
      const to = decayTarget(a.s);
      if (to !== a.s) emitPhoton(a, a.s, to);                          // self-transition: metastable, no photon
      a.s = to; a.t = 0;
    }

    // equal-likelihood absorption among all reachable higher levels; electron keeps direction, loses exactly the gap
    function collide(e, a, ke) {
      m.indicatorEnabled = true;                                       // PhET shows the collision indicator after the first electron-atom collision
      const L = m.levels, c = a.s; let n = c + 1;
      while (n < L.length && !(L[n] - L[c] > ke)) n++;
      n--;
      m.lastHit = { ke, t: 0 };
      m.stats.collisions++; m.stats.bins[Math.min(C.HIST_BINS - 1, Math.floor(ke))]++;
      if (n > c) {
        const to = c + 1 + Math.floor(rnd() * (n - c)), gap = L[to] - L[c];
        a.s = to; a.t = 0; m.stats.excitations++; e.lost = (e.lost || 0) + gap;
        m.arrows.push({ hi: to, lo: c, w: 0, life: 200, kind: 'absorb' });
        if (m.onEvent) m.onEvent({ type: 'absorb', n: to + 1 });
        e.vx = Math.sign(e.vx || 1) * speedOf(ke - gap);
      }
    }

    // ---- time stepping (dt <= 3 units) ----
    m.step = function (dt) {
      for (let i = m.pulses.length - 1; i >= 0; i--) {
        if ((m.pulses[i] += dt) >= C.PULSE_DELAY) { m.pulses.splice(i, 1); spawnElectron(true); recomputeHeat(); }
      }
      if (m.mode === 'continuous') {
        const rate = m.rate();
        m.since += dt;
        if (rate > 0 && m.since > 1 / rate) { m.since = 0; spawnElectron(false); }
      }

      const A = m.atoms, T = C.TUBE;
      for (const a of A) {
        const R = m.atomRadius(a);
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < T.x0 + R) { a.x = T.x0 + R; a.vx = Math.abs(a.vx); }
        if (a.x > T.x1 - R) { a.x = T.x1 - R; a.vx = -Math.abs(a.vx); }
        if (a.y < T.y0 + R) { a.y = T.y0 + R; a.vy = Math.abs(a.vy); }
        if (a.y > T.y1 - R) { a.y = T.y1 - R; a.vy = -Math.abs(a.vy); }
        if (a.s > 0 && (a.t += dt) >= C.LIFETIME) decay(a);
      }
      for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {   // equal-mass elastic collisions (our model)
        const p = A[i], q = A[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
        if (d < m.atomRadius(p) + m.atomRadius(q) && d > 0) {
          const nx = dx / d, ny = dy / d, rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
          if (rel > 0) { p.vx -= rel * nx; p.vy -= rel * ny; q.vx += rel * nx; q.vy += rel * ny; }
        }
      }

      const aMag = Math.abs(accel()), baseReach = C.R_ATOM + C.R_E;     // energy is measured to the base sphere, trigger uses the ring
      for (let i = m.electrons.length - 1; i >= 0; i--) {
        const e = m.electrons[i], px = e.x, vp = Math.abs(e.vx);
        e.x += e.vx * dt + 0.5 * accel() * dt * dt; e.vx += accel() * dt;   // exact constant-acceleration step
        if (e.x > C.ANODE_X || e.x < C.CATHODE_X) { m.stats.supplied += keOf(e.vx) + (e.lost || 0); m.electrons.splice(i, 1); continue; }   // absorbed by the far plate
        for (const a of A) {
          const dPrev = Math.hypot(px - a.x, e.y - a.y), dCur = Math.hypot(e.x - a.x, e.y - a.y);
          const trigger = m.atomRadius(a) + C.R_E;                    // PhET detects entry into the (state-sized) ring...
          if (dPrev > trigger && dCur <= trigger) {
            collide(e, a, keOf(Math.sqrt(vp * vp + 2 * aMag * Math.max(0, dPrev - baseReach))));   // ...but energy is KE at the base sphere
            break;
          }
        }
      }
      for (let i = m.photons.length - 1; i >= 0; i--) {
        const p = m.photons[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt;
        const B = C.PHOTON_BOUNDS;
        if (p.x < B.x0 || p.x > B.x1 || p.y < B.y0 || p.y > B.y1) m.photons.splice(i, 1);
      }
      for (let i = m.arrows.length - 1; i >= 0; i--) if ((m.arrows[i].life -= dt) <= 0) m.arrows.splice(i, 1);
      if (m.lastHit) m.lastHit.t += dt;
    };

    // One Atom tab: energy (eV, absolute) an electron would have on contact, as PhET's CollisionEnergyIndicator shows
    // (PhET uses |V| * d/(plateDistance-2) with factor 1.0, slightly different from the 1.0243 used by the physics).
    m.collisionIndicator = function () {
      if (m.tab !== 'single' || !m.atoms.length || !m.indicatorEnabled) return null;
      const a = m.atoms[0], plateX = m.V > 0 ? C.CATHODE_X : C.ANODE_X, dy = C.PLATE_Y - a.y;
      const r2 = C.R_ATOM * C.R_ATOM - dy * dy;
      if (r2 <= 0) return null;
      const near = a.x + (m.V > 0 ? -1 : 1) * Math.sqrt(r2);
      const d = Math.max(0, Math.abs(plateX - near) - 2);
      return Math.abs(m.V) * d / (C.PLATE_D - 2) + m.levels[0];
    };

    m.reset = function () {
      m.V = C.DEFAULT_V; m.pct = C.DEFAULT_PCT; m.mode = m.tab === 'single' ? 'single' : 'continuous';
      m.electrons = []; m.photons = []; m.arrows = []; m.pulses = []; m.since = 0; m.lastHit = null; m.indicatorEnabled = false; m.spectrum.clear(); m.resetStats();
      m.atoms = []; m.nLevels = 2; m.setElement('hydrogen'); m.setAtomCount(cfg.nAtoms || C.MAX_ATOMS); recomputeHeat();
    };

    m.setElement(cfg.element || 'hydrogen');
    m.setAtomCount(cfg.nAtoms || C.MAX_ATOMS);
    recomputeHeat();
    return m;
  };

  // small fast seedable PRNG (mulberry32) for reproducible runs: ?seed=123
  DL.mulberry32 = function (a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  DL.keOf = keOf; DL.speedOf = speedOf;
})(typeof window !== 'undefined' ? window : globalThis);
