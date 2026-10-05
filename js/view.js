/* Canvas renderers: tube/stage (incl. spectrometer), energy-level panel, legend icons.
   Stage coordinates equal model coordinates (710 x 640 logical px). */
(function (root) {
  'use strict';
  const DL = root.DL = root.DL || {};
  const C = DL.C, V = DL.view = {};

  V.STAGE_W = 710; V.STAGE_H = 640; V.ENERGY_W = 300; V.ENERGY_H = 340;
  const SPEC = V.SPEC = { x: 25, y: 404, w: 660, h: 178, dx: 50, dy: 412, dw: 610, dh: 112, x300: 130, x800: 570 };
  const specX = w => SPEC.x300 + (w - 300) / 500 * (SPEC.x800 - SPEC.x300);
  V.specX = specX;

  // device-pixel-ratio aware canvas
  V.setup = function (canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return c;
  };

  const wavelengthToRGB = w => {
    if (w < 380) return [167, 139, 250];                              // UV shown violet
    if (w > 750) return [176, 48, 48];                                // IR shown dull red
    let r = 0, g = 0, b = 0;
    if (w < 440) { r = (440 - w) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; }
    else if (w < 510) { g = 1; b = (510 - w) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; }
    else if (w < 645) { r = 1; g = (645 - w) / 65; } else r = 1;
    return [r, g, b].map(c => Math.round(255 * c));
  };
  V.rgb = w => `rgb(${wavelengthToRGB(w)})`;
  V.photonKind = w => w < 380 ? 'kind.uv' : w > 750 ? 'kind.ir' : 'kind.visible';

  // ---------------- shared sprites ----------------
  function sphere(c, x, y, r, light, dark) {
    const g = c.createRadialGradient(x - r / 3, y - r / 3, r / 6, x, y, r);
    g.addColorStop(0, light); g.addColorStop(1, dark);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }
  // PhET AtomGraphic: constant dark-grey sphere (r=15) with a number, over a ring whose radius is 17 + 6*f and whose grey is floor(240*f)
  const ringGray = f => Math.min(239, Math.max(0, Math.floor(240 * f)));
  function levelFraction(m, s) { return m.levelFraction ? m.levelFraction(s) : 0; }

  // x, y: centre; k: scale (1 on the stage). s: level index (displayed as s+1)
  V.drawAtomSprite = function (c, f, s, x, y, k) {
    const ringR = (17 + 6 * f) * k, r = 15 * k, g = ringGray(f);
    c.fillStyle = `rgb(${g},${g},${g})`; c.strokeStyle = '#000'; c.lineWidth = 0.6;
    c.beginPath(); c.arc(x, y, ringR, 0, 6.283); c.fill(); c.stroke();
    sphere(c, x, y, r, '#a4a4a4', '#2a2a2a');
    c.strokeStyle = '#111'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.stroke();
    c.fillStyle = '#fff'; c.font = `bold ${Math.round(r * 0.95)}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(s + 1, x, y + 1);
  };
  V.drawAtom = (c, m, a, x, y) => V.drawAtomSprite(c, levelFraction(m, a.s), a.s, x, y, 1);

  V.drawElectron = function (c, x, y, r) { sphere(c, x, y, r, '#8f94ea', '#1c2190'); };

  V.drawPhoton = function (c, p, squig) {
    const col = V.rgb(p.w), uv = p.w < 380;
    c.save(); c.translate(p.x, p.y);
    if (squig && !uv) {                                                 // squiggle: travelling sine wave
      c.rotate(Math.atan2(p.vy, p.vx)); c.strokeStyle = col; c.lineWidth = 2.2; c.shadowColor = col; c.shadowBlur = 6; c.beginPath();
      for (let s = 0; s <= 26; s++) { const yy = 5 * Math.sin(s * 0.55 - p.t * 0.06); s ? c.lineTo(-s * 1.1, yy) : c.moveTo(0, yy); }
      c.stroke();
    } else {                                                            // sparkle: soft halo + star
      const hg = c.createRadialGradient(0, 0, 0, 0, 0, 15);
      hg.addColorStop(0, col); hg.addColorStop(.45, col); hg.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = 0.5; c.fillStyle = hg; c.beginPath(); c.arc(0, 0, 15, 0, 6.283); c.fill(); c.globalAlpha = 1;
      c.fillStyle = uv ? '#4b2bb0' : col; c.beginPath();
      for (let k = 0; k < 8; k++) { const rr = k % 2 ? 1.8 : 6, th = k * Math.PI / 4; c.lineTo(rr * Math.cos(th), rr * Math.sin(th)); }
      c.closePath(); c.fill();
    }
    c.restore();
  };

  // ---------------- stage ----------------
  function goldWire(c, pts, r) {
    const path = () => {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) c.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r);
      c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    };
    c.lineCap = 'butt'; c.lineJoin = 'round';
    for (const [w, col] of [[20, '#4f3d12'], [17, '#8f7733'], [7, '#cdb869']]) { c.lineWidth = w; c.strokeStyle = col; path(); c.stroke(); }
  }

  function heater(c, plateX, dir, heat) {                                // tight coil beside the plate; PhET sets the red channel to the heat (0..255)
    const cx = plateX + dir * 36, f = heat / 255, red = Math.round(Math.min(255, heat));
    c.save();
    c.strokeStyle = `rgb(${Math.max(40, red)},${red > 40 ? 0 : 8},${red > 40 ? 0 : 8})`;
    c.lineWidth = 1.8;
    if (f > 0.02) { c.shadowColor = 'rgba(255,40,20,.95)'; c.shadowBlur = 18 * f; }
    for (let i = 0; i < 25; i++) { c.beginPath(); c.ellipse(cx, 192 + i * 6.9, 17, 6, 0, 0, 6.283); c.stroke(); }
    c.restore();
    c.strokeStyle = '#000'; c.lineWidth = 1.6; c.lineJoin = 'round';        // leads from the coil ends up to the electron panel
    const px = dir < 0 ? 150 : 540;
    c.beginPath(); c.moveTo(cx - dir * 22, 366); c.lineTo(cx - dir * 22, 104); c.lineTo(px, 104);
    c.moveTo(cx + dir * 4, 352); c.lineTo(cx + dir * 4, 134); c.lineTo(px, 134); c.stroke();
  }

  function battery(c, voltage) {
    const x = 290, y = 15, w = 130, h = 70;
    let g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#555'); g.addColorStop(.35, '#d8d8d8'); g.addColorStop(1, '#2a2a2a');
    c.fillStyle = g; c.fillRect(x, y, w / 2, h);
    g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#6e5a1c'); g.addColorStop(.35, '#e0c566'); g.addColorStop(1, '#5a4710');
    c.fillStyle = g; c.fillRect(x + w / 2, y, w / 2, h);
    c.strokeStyle = '#222'; c.lineWidth = 1.5; c.strokeRect(x, y, w, h);
    g = c.createLinearGradient(0, y + 20, 0, y + 50);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#999');
    c.fillStyle = g; c.fillRect(x + w, y + 22, 9, 26); c.strokeRect(x + w, y + 22, 9, 26);
    // polarity marks (the + end is the plate that is NOT emitting electrons)
    c.fillStyle = '#fff'; c.font = 'bold 16px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(voltage >= 0 ? '−' : '+', x + 14, y + 14); c.fillText(voltage >= 0 ? '+' : '−', x + w - 14, y + 14);
  }

  V.drawStage = function (c, m, st) {
    c.clearRect(0, 0, V.STAGE_W, V.STAGE_H);
    c.fillStyle = '#fff'; c.fillRect(0, 0, V.STAGE_W, V.STAGE_H);
    const left = m.V > 0;                                               // emitting plate is the cathode
    heater(c, C.CATHODE_X, -1, left ? m.heat : 0); heater(c, C.ANODE_X, 1, left ? 0 : m.heat);
    goldWire(c, [[292, 50], [45, 50], [45, 275], [C.CATHODE_X - 4, 275]], 30);
    goldWire(c, [[418, 50], [655, 50], [655, 275], [C.ANODE_X + 4, 275]], 30);

    // tube: open cylinder
    const T = C.TUBE, cy = (T.y0 + T.y1) / 2, ry = (T.y1 - T.y0) / 2 + 3, lx = 108, rx = 582, ex = 20;
    c.fillStyle = '#fff'; c.fillRect(lx, cy - ry, rx - lx, 2 * ry);
    c.beginPath(); c.ellipse(lx, cy, ex, ry, 0, 0, 6.283); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(lx, cy - ry); c.lineTo(rx, cy - ry); c.moveTo(lx, cy + ry); c.lineTo(rx, cy + ry); c.stroke();
    c.beginPath(); c.ellipse(rx, cy, ex, ry, 0, 0, 6.283); c.stroke();

    for (const a of m.atoms) V.drawAtom(c, m, a, a.x, a.y);
    for (const px of [C.CATHODE_X, C.ANODE_X]) {                          // copper plates in front of the atoms
      const g = c.createLinearGradient(px - 9, 0, px + 9, 0);
      g.addColorStop(0, '#6b3f16'); g.addColorStop(.4, '#e3b07a'); g.addColorStop(1, '#6b3f16');
      c.fillStyle = g; c.strokeStyle = '#4a2a0c'; c.lineWidth = 1; c.beginPath(); c.roundRect(px - 9, C.PLATE_Y - C.PLATE_HALF, 18, 2 * C.PLATE_HALF, 9); c.fill(); c.stroke();
    }
    for (const e of m.electrons) V.drawElectron(c, e.x, e.y, 4);
    for (const p of m.photons) V.drawPhoton(c, p, st.squig);
    battery(c, m.V);
    if (st.spec) V.drawSpectrometer(c, m, st);
  };

  // ---------------- spectrometer ----------------
  V.spectrumLayout = function (m) {                                       // markers: {x, w, n}
    const out = [];
    for (const [k, n] of m.spectrum) {
      const w = +k; let x;
      if (w < 300) x = SPEC.x300 - 51 + Math.max(0, Math.min(1, (w - 90) / 210)) * 8;        // far UV pile
      else if (w > 800) x = SPEC.x800 + 22 + Math.min(1, (w - 800) / 3500) * 30;           // far IR pile
      else x = specX(w);
      out.push({ x, w, n });
    }
    return out;
  };

  V.drawSpectrometer = function (c, m, st) {
    const S = SPEC;
    let g = c.createLinearGradient(0, S.y, 0, S.y + S.h);
    g.addColorStop(0, '#8a8a46'); g.addColorStop(.5, '#6b6b30'); g.addColorStop(1, '#46461c');
    c.fillStyle = g; c.beginPath(); c.roundRect(S.x, S.y, S.w, S.h, 20); c.fill();
    c.strokeStyle = '#34340f'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#000'; c.fillRect(S.dx, S.dy, S.dw, S.dh);
    const base = S.dy + S.dh;
    c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 1; c.font = '11px Arial'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    for (let w = 300; w <= 800; w += 10) {
      const x = specX(w), major = w % 100 === 0;
      c.beginPath(); c.moveTo(x, base + 4); c.lineTo(x, base + (major ? 9 : 6)); c.stroke();
      if (major) c.fillText(String(w), x, base + 18);
    }
    c.fillText(DL.t('spec.axis'), specX(550), base + 33);
    c.textAlign = 'left'; c.fillText(DL.t('spec.farUV'), S.dx + 8, base + 18);
    c.textAlign = 'right'; c.fillText(DL.t('spec.farIR'), S.dx + S.dw - 18, base + 18);

    if (st.lines) {                                                      // optional: mark where every possible line would appear
      c.font = '10px Arial'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const groups = new Map();
      for (const ln of V.possibleLines(m)) {
        if (ln.w < 300 || ln.w > 800) continue;
        const x = specX(ln.w), col = V.rgb(ln.w);
        c.fillStyle = col; c.beginPath(); c.moveTo(x - 4, S.dy); c.lineTo(x + 4, S.dy); c.lineTo(x, S.dy + 8); c.fill();
        if (ln.series) { const g = groups.get(ln.series) || []; g.push(x); groups.set(ln.series, g); }
      }
      c.fillStyle = '#fff';
      for (const [name, xs] of groups) c.fillText(name, (Math.min(...xs) + Math.max(...xs)) / 2, S.dy + 20);
    }
    const hmax = S.dh - 4;
    for (const mk of V.spectrumLayout(m)) {                               // stacked dots, one per photon (compressed if needed)
      const pitch = Math.min(4, hmax / mk.n), col = mk.w < 300 || mk.w > 800 ? '#cfcfcf' : V.rgb(mk.w);
      c.fillStyle = col;
      for (let i = 0; i < mk.n; i++) c.fillRect(mk.x - 2, base - 2 - (i + 1) * pitch, 4, Math.max(1, pitch - 1));
    }
    if (!m.specRun) { c.fillStyle = 'rgba(255,255,255,.7)'; c.textAlign = 'left'; c.font = '11px Arial'; c.fillText('■', S.dx + 6, S.dy + 14); }
  };

  // ---------------- line catalogue (positions, series names, labels) ----------------
  const SERIES = ['Lyman', 'Balmer', 'Paschen', 'Brackett', 'Pfund'], GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ'];
  V.possibleLines = function (m) {                                       // every photon the current atom can emit (deduplicated by wavelength)
    const out = [], seen = new Set(), el = DL.ELEMENTS[m.elementKey], n = m.levels.length;
    const pairs = el && el.transitions ? el.transitions.filter(t => t[0] > t[1] && t[0] < n).map(t => [t[0], t[1]])
      : [].concat(...Array.from({ length: n }, (_, f) => Array.from({ length: f }, (_, t) => [f, t])));
    for (const [from, to] of pairs) {
      const w = DL.C.HC / (m.levels[from] - m.levels[to]), k = w.toFixed(2);
      if (!seen.has(k)) { seen.add(k); out.push({ w, from, to, series: m.elementKey === 'hydrogen' ? SERIES[to] : null }); }
    }
    return out.sort((p, q) => p.w - q.w);
  };
  V.lineLabel = function (m, w) {                                        // e.g. "Balmer-α (3→2)" for hydrogen, "3→2" otherwise
    const ln = V.possibleLines(m).find(l => Math.abs(l.w - w) < 0.05);
    if (!ln) return '';
    const pair = `${ln.from + 1}→${ln.to + 1}`;
    return ln.series ? `${ln.series}-${GREEK[ln.from - ln.to - 1] || ''} (${pair})` : pair;
  };

  // ---------------- energy panel ----------------
  const E_ORIGIN = { x: 25, bottom: 305, top: 36 }, LINE_X0 = 45, LINE_X1 = 270;
  V.energyY = function (m) {                                              // y for each level (3 px minimum spacing)
    const L = m.levels, lo = L[0], hi = m.configurable ? -0.3 : L[L.length - 1], ys = [];
    for (let i = 0; i < L.length; i++) {
      let y = E_ORIGIN.bottom - (L[i] - lo) / (hi - lo) * (E_ORIGIN.bottom - E_ORIGIN.top);
      if (i > 0) y = Math.min(y, ys[i - 1] - 3);
      ys.push(y);
    }
    return ys;
  };
  V.energyToY = (m, e) => { const lo = m.levels[0], hi = m.configurable ? -0.3 : m.levels[m.levels.length - 1]; return E_ORIGIN.bottom - (e - lo) / (hi - lo) * (E_ORIGIN.bottom - E_ORIGIN.top); };
  V.yToEnergy = (m, y) => { const lo = m.levels[0], hi = -0.3; return lo + (E_ORIGIN.bottom - y) / (E_ORIGIN.bottom - E_ORIGIN.top) * (hi - lo); };

  V.drawEnergy = function (c, m, st) {
    c.clearRect(0, 0, V.ENERGY_W, V.ENERGY_H);
    c.fillStyle = '#fff'; c.fillRect(0, 0, V.ENERGY_W, V.ENERGY_H);
    const single = m.tab === 'single';                                   // One Atom: short level ticks + "Ground state" beside the badge
    const x0 = single ? 64 : LINE_X0, x1 = single ? 90 : LINE_X1, bx = single ? 117 : LINE_X1 + 14;
    c.strokeStyle = '#000'; c.fillStyle = '#000'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(E_ORIGIN.x, E_ORIGIN.bottom + 8); c.lineTo(E_ORIGIN.x, 18); c.stroke();               // axis
    c.beginPath(); c.moveTo(E_ORIGIN.x, 10); c.lineTo(E_ORIGIN.x - 5, 20); c.lineTo(E_ORIGIN.x + 5, 20); c.fill();
    c.save(); c.translate(12, E_ORIGIN.bottom - 5); c.rotate(-Math.PI / 2); c.font = 'bold 11px Arial'; c.textAlign = 'left'; c.fillText(DL.t('energy.axis'), 0, 0); c.restore();

    const ys = V.energyY(m), cnt = new Array(m.levels.length).fill(0);
    m.levels.forEach((e, i) => {
      c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, ys[i]); c.lineTo(x1, ys[i]); c.stroke();
      if (m.configurable && i > 0) { c.fillStyle = '#c33'; c.fillRect(x1 - 6, ys[i] - 3, 6, 6); }       // drag handle
    });
    for (const ar of (single ? m.arrows : [])) {                         // transitions are shown on the One Atom tab only
      const x = x0 + 40 + ((ar.hi * 23 + ar.lo * 9) % 120), y1 = ys[ar.hi], y2 = ys[ar.lo];
      const [ya, yb] = ar.kind === 'absorb' ? [y2, y1] : [y1, y2], col = ar.kind === 'absorb' ? '#444' : V.rgb(ar.w);
      c.globalAlpha = Math.min(1, ar.life / 120); c.strokeStyle = c.fillStyle = col; c.lineWidth = 2.2; c.beginPath();
      if (st.squig && ar.kind === 'emit') { const n = Math.abs(yb - ya); for (let s = 0; s <= n; s++) { const yy = ya + Math.sign(yb - ya) * s; s ? c.lineTo(x + 3.5 * Math.sin(s * 0.5), yy) : c.moveTo(x, yy); } }
      else { c.moveTo(x, ya); c.lineTo(x, yb); }
      c.stroke(); const d = yb > ya ? 1 : -1;
      c.beginPath(); c.moveTo(x, yb); c.lineTo(x - 5, yb - 9 * d); c.lineTo(x + 5, yb - 9 * d); c.fill(); c.globalAlpha = 1;
    }
    for (const a of m.atoms) {                                           // atoms rest on their level (30% overlap)
      const i = cnt[a.s]++;
      sphere(c, x0 + 9 + i * 8, ys[a.s] - 6, 6, '#a4a4a4', '#2a2a2a');
    }
    m.levels.forEach((e, i) => badge(c, m, i, bx, ys[i]));                // level-number badges
    if (single) { c.fillStyle = '#000'; c.font = 'bold 12px Arial'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(DL.t('energy.ground'), bx + 22, ys[0]); }

    const ci = m.mode === 'single' ? m.collisionIndicator() : null;      // One Atom: "Energy at collision" indicator (after the first collision)
    if (ci !== null) {
      const y = Math.max(12, V.energyToY(m, ci));
      c.strokeStyle = c.fillStyle = '#e02020'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(110, y); c.lineTo(28, y); c.stroke();
      c.beginPath(); c.moveTo(25, y); c.lineTo(35, y - 4); c.lineTo(35, y + 4); c.fill();
      V.drawElectron(c, 120, y, 4);
      c.fillStyle = '#000'; c.font = '10px Arial'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(DL.t('energy.collision1'), 128, y - 1); c.fillText(DL.t('energy.collision2'), 128, y + 10);
    }
  };

  // level-number badge at the right end of each level line (same sprite as the atoms, scaled down)
  function badge(c, m, i, x, y) { V.drawAtomSprite(c, levelFraction(m, i), i, x, y, 0.62); }

  // ---------------- lamp glow preview ----------------
  // Approximate glow colour of a gas: each visible line (380-750 nm) contributes its colour weighted by its transition weight;
  // brightness is normalised. Only our own simulated line list is used, no photographs.
  V.lampColor = function (key) {
    const el = DL.ELEMENTS[key]; if (!el || !el.levels) return [200, 200, 200];
    let r = 0, g = 0, b = 0;
    for (const [from, to, w] of el.transitions) {
      if (from <= to) continue;
      const wl = DL.C.HC / (el.levels[from] - el.levels[to]);
      if (wl < 380 || wl > 750) continue;
      const [cr, cg, cb] = wavelengthToRGB(wl);
      r += w * cr; g += w * cg; b += w * cb;
    }
    const mx = Math.max(r, g, b) || 1;
    return [r, g, b].map(x => Math.round(255 * x / mx));
  };

  V.drawLamps = function (c, w, h) {
    c.clearRect(0, 0, w, h); c.fillStyle = '#10151c'; c.fillRect(0, 0, w, h);
    const keys = ['hydrogen', 'mercury', 'sodium', 'neon'], rowH = h / keys.length;
    keys.forEach((k, i) => {
      const [r, g, b] = V.lampColor(k), y = rowH * i + rowH / 2, x0 = 130, x1 = w - 24, th = rowH * 0.5;
      const glow = c.createRadialGradient((x0 + x1) / 2, y, 4, (x0 + x1) / 2, y, (x1 - x0) / 1.6);
      glow.addColorStop(0, `rgba(${r},${g},${b},.45)`); glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = glow; c.fillRect(x0 - 30, y - rowH / 2, x1 - x0 + 60, rowH);
      const tube = c.createLinearGradient(0, y - th / 2, 0, y + th / 2);
      tube.addColorStop(0, `rgb(${r * .55 | 0},${g * .55 | 0},${b * .55 | 0})`); tube.addColorStop(.5, `rgb(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)})`); tube.addColorStop(1, `rgb(${r * .55 | 0},${g * .55 | 0},${b * .55 | 0})`);
      c.fillStyle = tube; c.beginPath(); c.roundRect(x0, y - th / 2, x1 - x0, th, th / 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#e8edf3'; c.font = 'bold 14px Arial'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(DL.t('element.' + k), 14, y);
    });
  };

  V.drawLegendAtom = (c, w, h) => { c.clearRect(0, 0, w, h); V.drawAtomSprite(c, 0, 0, w / 2, h / 2, 0.8); };
  V.drawLegendElectron = (c, w, h) => { c.clearRect(0, 0, w, h); V.drawElectron(c, w / 2, h / 2, 4); };
  V.drawLegendPhotons = (c, w, h) => {
    c.clearRect(0, 0, w, h);
    [[w * 0.18, 700], [w * 0.5, 450], [w * 0.82, 200]].forEach(([x, wl]) => V.drawPhoton(c, { x, y: h / 2, vx: 1, vy: 0, w: wl, t: 0 }, false));
  };
})(typeof window !== 'undefined' ? window : globalThis);
