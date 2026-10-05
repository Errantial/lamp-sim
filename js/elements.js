/* Atom data ported from PhET Discharge Lamps 1.13 (HydrogenProperties, MercuryProperties, SodiumProperties, NeonProperties).
   levels: energies in eV, index 0 = ground state.  transitions: [from, to, weight] (weights are normalised per source;
   from === to means "stays in this level and re-rolls after another lifetime", i.e. a metastable level). */
(function (root) {
  'use strict';
  const DL = root.DL = root.DL || {};
  DL.ELEMENTS = {
    hydrogen: { name: 'Hydrogen',
      levels: [-13.6, -3.4, -1.511, -0.85, -0.544, -0.378],
      transitions: [[5, 0, 0.0975], [5, 1, 0.06], [5, 2, 0.02], [4, 0, 0.1725], [4, 1, 0.11], [4, 3, 0.04], [3, 0, 0.34], [3, 1, 0.24], [3, 2, 0.07], [2, 0, 0.835], [2, 1, 0.87], [1, 0, 3.1325], [0, 0, 0.0]] },
    mercury: { name: 'Mercury',
      levels: [-10.38, -5.73, -5.51, -4.94, -3.7, -2.67, -2.47, -1.55, -0.85],
      transitions: [[2, 0, 0.08], [8, 2, 0.5], [7, 1, 0.45], [8, 3, 0.62], [7, 2, 0.66], [7, 3, 1.48], [5, 1, 0.21], [6, 2, 0.04], [8, 4, 0.11], [5, 2, 0.56], [5, 3, 0.49], [7, 4, 0.24], [8, 5, 0.03], [6, 4, 0.27], [3, 3, 1.0], [4, 4, 1.0], [1, 1, 1.0], [0, 0, 1.0]] },
    sodium: { name: 'Sodium',
      levels: [-5.14, -3.03, -1.95, -1.52, -1.39, -1.02],
      transitions: [[4, 0, 0.05], [5, 1, 0.24], [1, 0, 1.23], [5, 1, 0.07], [3, 1, 1.03], [2, 1, 0.26], [5, 3, 0.15], [4, 2, 0.13], [5, 4, 0.13], [0, 0, 1.0]] },
    neon: { name: 'Neon',
      levels: [-21.56, -4.94, -4.89, -4.84, -4.71, -3.18, -2.99, -2.94, -2.85, -2.59],
      transitions: [[4, 0, 6.11], [2, 0, 0.48], [9, 2, 0.45], [9, 4, 0.65], [8, 1, 0.26], [8, 2, 0.85], [7, 1, 0.35], [8, 3, 0.4], [7, 2, 0.36], [6, 1, 0.68], [6, 2, 0.3], [7, 3, 0.11], [8, 4, 0.68], [7, 4, 0.19], [5, 1, 0.25], [6, 4, 0.03], [5, 2, 0.09], [5, 3, 0.02], [3, 3, 1.0], [1, 1, 1.0], [0, 0, 1.0]] },
    configurable: { name: 'Configurable', configurable: true }
  };
  DL.ELEMENT_ORDER = ['hydrogen', 'mercury', 'sodium', 'neon', 'configurable'];
  // Configurable atom defaults (AtomicStateFactory): ground -13.6, level 2 at ground+4, then equal steps toward -0.3 eV
  DL.configurableLevels = function (n, prev) {
    const lv = [];
    if (!prev || prev.length < 2) {
      lv.push(-13.6, -9.6);
      const step = -0.3 - lv[1] / 4;
      for (let i = 2; i < n && i < 6; i++) lv.push(lv[i - 1] + step);
      return lv.slice(0, n);
    }
    const step = (-0.3 - prev[prev.length - 1]) / (6 - prev.length);
    for (let i = 0; i < n; i++) lv.push(i < prev.length ? prev[i] : lv[i - 1] + step);
    return lv;
  };
})(typeof window !== 'undefined' ? window : globalThis);
