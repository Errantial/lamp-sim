# PhET "Neon Lights & Other Discharge Lamps" (v1.13): behaviour notes

Sources: (A) decompiled constants/logic from `discharge-lamps_en.jar` (CFR); (B) live runs of the sim
(CheerpJ player, screenshots). Items marked **[verified live]** were observed; the rest come from code only.
Coordinates are model pixels; "unit" = one model time unit; the clock ticks 12 units per 40 ms.

## UI (live)
- Tabs: **One Atom**, **Multiple Atoms** (30 atoms). Atom type: Hydrogen (default), Mercury, Sodium, Neon, Configurable.
- Battery with slider and numeric readout, range **-30..+30 V**, default **23 V**. Typing in the field via synthetic key events did not work; slider drag did.
- Electron production: **Single** (+ "Fire electron") / **Continuous** (slider shown as % of max).
- Options: Spectrometer, Squiggles (on by default), Run in slow motion. Menu: Options > simulation speed (DT 1..15).
- Atoms are grey numbered spheres (n shown). Excited atom: larger, darker inner sphere, light-grey halo ring **[verified live]**. UV photons are purple stars/sparkles; visible are coloured **[verified live]**.
- Energy panel (right): levels 1..6 with atom balls on them; in One Atom with electron shown, an "Energy at collision" marker with a red arrow tracks the electron's energy.
- Spectrometer: 300..800 nm axis, "far UV" pile at left, "far IR" at right, counts stack as dots; Stop / Reset buttons. Counts accumulate until Reset; no decay. Counts are keyed by exact wavelength.

## Geometry / clock (code)
- Cathode x=130, anode x=560 (plate distance 430 px), both lines y=275±100. Tube bounds: x 100..590 (width 490), y 160..390 (height 230).
- Atom radius 15 px, mass 1000. Electron radius 2 px, mass 9.109e-31.
- Clock: tick = 40 ms real, DT = 12 units. Slow motion: DT/5 = 2.4 units per tick.
- One Atom: single atom, stationary at tube centre (345, 275). Multiple: 30 atoms at random positions, each velocity component uniform in (-0.05, +0.05) px/unit.

## Electrons (code)
- Emitted at the **cathode with zero velocity** (offset 2 px along the field); in Single mode from the plate centre only, in Continuous from a random point on the plate line.
- Only emitted if that plate's potential > 0. Negative battery voltage reverses the field and emission comes from the right plate. V = 0 is stored as 0.004.
- Constant acceleration a = V * 0.18018 / 430 px/unit². KE(x) = 1.0243 * V * (x / 430) eV (x = distance from cathode). So KE rises linearly and equals ~V at the far plate.
- **No scattering, no deflection, no mutual interaction.** Electrons travel in a straight line **[verified live: passes through an atom unchanged at 3 V and 21 V]**. Removed when they cross the opposite plate line.
- Timing check **[verified live]**: at 21 V in slow motion, the electron reached the atom ~5.4 s after Fire, as the model predicts (0.33 s pulser delay x slow-mo + sqrt(2*215/a)).
- Fire electron: waits **100 units** (0.33 s real), then emits exactly one electron.
- Continuous rate: electrons/unit = (slider % x maxCurrent) x 0.001; maxCurrent 150 (Multiple), 25 (One Atom). Default 20% of 150 -> 0.03/unit = ~9 electrons/s real; 100% -> ~45/s.

## Collision and excitation (code)
- Detection: electron path segment (prev -> current position) vs the atom's base-radius circle, plus a distance test with radius (15+2). Triggered at **first contact**, ~17 px before the atom centre.
- Electron energy used = KE at the contact point (solved from a quadratic), not at the atom centre. Single-atom thresholds therefore come at higher V than the naive estimate: n=2 needs ~21.9 V, n=3 ~25.9 V (n=4 ~27.1, n=5 ~27.7). Default 23 V gives n=2 only.
- **Verified live:** 21 V -> no excitation (contact KE ~9.8 eV); 24.75 V -> excited to n=2, no deflection of the electron.
- Absorption rule ("EqualLikelihood"): let N = highest state above the current one whose gap <= electron energy. If one exists, the new state is chosen **uniformly at random among all states between current+1 and N**. It is **always taken** (probability 1, no cross-section). The electron loses exactly that gap and keeps its direction.
- Excited atoms can be excited again (starting from their current state) and their lifetime timer restarts.
- **No ionization**, no elastic loss, no probability vs energy.

## Atom levels and decay (code)
- Hydrogen levels (eV): -13.6, -3.4, -1.511, -0.85, -0.544, -0.378 (n = 1..6).
- Excited lifetime is **fixed (not random): 48 units = 4 ticks = 0.16 s real** (DEFAULT_STATE_LIFETIME = DT/25*100, evaluated at DT=12). In slow motion ~0.8 s **[verified live: excitation visible 0.6-1.0 s, then photon]**.
- After the lifetime, the atom picks the target by weights (normalised):

| from | to n=1 | n=2 | n=3 | n=4 | n=5 |
|---|---|---|---|---|---|
| n=2 | 100% | | | | |
| n=3 | 49.0% | 51.0% | | | |
| n=4 | 52.3% | 36.9% | 10.8% | | |
| n=5 | 53.5% | 34.1% | | 12.4% | |
| n=6 | 54.9% | 33.8% (n=2) | 11.3% (n=3) | | |

  (n=5->3, n=6->4, n=6->5 have no entries.) If it lands in a non-ground state it decays again after another fixed 0.16 s.
- Photon wavelength = 1239.84 nm·eV / gap. Examples: 2->1 121.6, 3->1 102.6, 4->1 97.2, 3->2 656.3, 4->2 486.2, 5->2 434.1, 6->2 410.3; 4->3 1875.8, 5->3 1282, 6->3 1094 nm (off the 300-800 axis).
- Emission direction: 10% exactly horizontal (left or right 50/50), 90% uniform random. Photon speed is 0.5 px/unit; it starts at atom radius + 10 px from the centre.
- Photons leave the system when they exit the tube view; the spectrometer counts a photon at emission time while running.

## Port status (`index.html`)
Ported exactly: 6 levels, -30..+30 V (default 23), electrons start at rest and gain KE linearly, pass-through collisions at first contact,
equal-likelihood absorption, fixed 48-unit lifetime, decay table, 10%-horizontal photon emission, Fire = 100-unit delay then one electron,
continuous rate = % x 150 x 0.001 per unit, periodic emission, 300-800 nm spectrometer with far-UV / far-IR bins and stacked counts.
Deliberate difference: **10 atoms** (PhET Multiple tab has 30; One Atom tab has 1 stationary atom). Atom-atom/wall bounces are my own elastic model
(PhET's collision experts were not read). Halo sizes for excited atoms are approximations.

Test results (headless, one stationary atom at the tube centre, as PhET's One Atom tab):
| check | PhET-derived prediction | port |
|---|---|---|
| n=2 threshold voltage | 21.85 V | 21.85 V |
| n=3 / n=4 appear | ~25.9 / ~27.1-27.8 V | 26.0 / 27.8 V |
| max level at 30 V | uniform over n=2..6 | uniform (85/80/85/72/78 of 400) |
| decay n=3 | 49.0% / 51.0% | 48.8% / 51.2% |
| first excitation at 24.75 V | ~194 units after emission | 192 units |

## Open items (not yet checked)
- Atom-atom and atom-wall collision details in Multiple Atoms (SphereSphere/SphereBox experts exist; not read).
- Exact atom radius vs state (view code).
- Mercury/Sodium/Neon tables and the Configurable atom.

# Ideas: optimizations, improvements, additions

## Optimizations
1. **Swept collision test** (segment vs circle) with an adaptive step instead of a fixed 3-unit substep; no tunnelling at any voltage / sim speed.
2. **Spatial pruning**: electrons only test atoms within |dx| < 17 + step (sort atoms by x or use a grid); atom-atom pairs via a grid if the count goes past ~100.
3. **Render caching**: draw static layers (tube, plates, battery, spectrometer background, diagram levels) once to offscreen canvases; pre-render atom sprites per state; drop per-photon `shadowBlur` (the most expensive canvas op here); object-pool electrons/photons/arrows.
4. **HiDPI + resize**: scale canvases by `devicePixelRatio`, redraw on resize; skip drawing when the tab is hidden.
5. **Spectrometer**: key counts by transition index (15 pairs) instead of formatted strings; cache wavelength / colour per transition.
6. **Separate model from view** (pure `model.js`, seeded RNG) so the physics can be unit-tested and run headless.
7. Load time: the web-native port is a single ~20 KB file versus a 3 MB jar + CheerpJ boot (~12 s) for the original.

## Improvements (fidelity, UX, accessibility)
1. **Physics realism toggle** ("PhET simple" vs "realistic"): sublevels (3s/3p/3d) with dipole selection rules and real Einstein A coefficients; energy-dependent electron-impact cross-sections instead of probability 1 above threshold; ionization and recombination; elastic scattering and a mean free path; n-dependent lifetimes (real ones are ns, so scale with a time-dilation slider).
2. Replace PhET's fixed identical lifetime (0.16 s) with an adjustable mean and distribution (it is a deliberate teaching simplification).
3. **Diagram**: nonlinear / zoom option so n=4..6 do not collapse; series brackets (Lyman, Balmer, Paschen) and colour by series; keep a live electron-energy histogram, not just the last collision.
4. **Spectrometer**: fix label overlap (410/434 nm, far-UV count), hover tooltips with transition and counts, linear/log scale, line broadening, CSV export, a "show Balmer positions" overlay.
5. **Voltage control**: numeric entry that works (PhET's typing did not respond in the browser), keyboard-accessible sliders, arrow-key steps, ARIA live regions announcing excitations/emissions, reduced-motion mode, colour-blind-safe palette, touch-friendly targets.
6. Fix the sliders desyncing from state when values are set programmatically; add "Reset all".
7. Show the numbers PhET hides: electron KE gradient colouring, per-atom threshold voltage for its position, live current (electrons/s).
8. Atom chooser using PhET's other tables (Mercury, Sodium, Neon, configurable) - they are in the same jar.

## Additions
1. **Franck-Hertz mode** (retarding grid, current-vs-voltage plot with dips; Hg 4.9 V) - the natural next experiment.
2. Atom-count and temperature (atom speed) sliders; One-Atom vs Multiple tabs like PhET.
3. Absorption mode: shine photons on atoms (the engine already has the stimulated-emission branch) and show an absorption spectrum next to the emission one.
4. Diffraction-grating view that renders the lines as a physical spectrum.
5. Efficiency panel: fraction of electron energy turned into photons, split visible vs UV vs IR (why real lamps use phosphors).
6. Challenge/quiz mode ("what voltage first produces H-alpha?"), record/replay, shareable URL state, data export.
7. i18n and a small automated test suite pinned to the numbers above (21.85 V threshold, 49/51 branching, 192-unit arrival).
