/* Wires model, views and DOM controls together. One model per tab (like PhET's two modules); only the active one runs. */
(function () {
  'use strict';
  const DL = window.DL, C = DL.C, V = DL.view, $ = id => document.getElementById(id);

  DL.initLang();

  // ---- state ----
  let DT = 12;                                                     // model time units per 40 ms tick (Options > Simulation Speed)
  // ?seed=N makes a run reproducible (each tab gets its own stream derived from N)
  const seedParam = new URLSearchParams(location.search).get('seed'), seed = seedParam === null || isNaN(+seedParam) ? null : (+seedParam | 0);
  const rngFor = k => seed === null ? undefined : DL.mulberry32(seed + k);
  const models = { single: DL.createModel({ tab: 'single', rng: rngFor(1) }), multiple: DL.createModel({ tab: 'multiple', nAtoms: C.MAX_ATOMS, rng: rngFor(2) }) };
  const defaultUi = k => ({ squig: k === 'single', spec: true, slow: false, paused: false, lines: false });
  const ui = { single: defaultUi('single'), multiple: defaultUi('multiple') };
  let tab = 'multiple';
  const model = () => models[tab], st = () => ui[tab];

  // ---- URL presets: ?tab=single&element=neon&v=24&pct=60&mode=continuous&atoms=12&lines=1&squig=1&spec=0&slow=0&seed=5 ----
  const params = new URLSearchParams(location.search);
  const flag = k => params.get(k) === null ? null : /^(1|true|yes|on)$/i.test(params.get(k));
  const num = (k, lo, hi) => { const v = parseFloat(params.get(k)); return isNaN(v) ? null : Math.max(lo, Math.min(hi, v)); };
  function applyParams() {
    if (params.get('tab') === 'single' || params.get('tab') === 'multiple') tab = params.get('tab');
    const m = model(), s = st();
    if (params.get('element') && DL.ELEMENTS[params.get('element')]) m.setElement(params.get('element'));
    if (num('levels', 2, 6) !== null && m.configurable) m.setNumLevels(Math.round(num('levels', 2, 6)));
    if (num('v', C.MIN_V, C.MAX_V) !== null) m.setVoltage(num('v', C.MIN_V, C.MAX_V));
    if (num('pct', 0, 100) !== null) m.setPct(num('pct', 0, 100));
    if (params.get('mode') === 'single' || params.get('mode') === 'continuous') m.setMode(params.get('mode'));
    if (num('atoms', 1, C.MAX_ATOMS) !== null && tab === 'multiple') m.setAtomCount(Math.round(num('atoms', 1, C.MAX_ATOMS)));
    for (const [k, f] of [['lines', 'lines'], ['squig', 'squig'], ['spec', 'spec'], ['slow', 'slow']]) if (flag(k) !== null) s[f] = flag(k);
  }
  function setupLink() {                                         // URL that recreates the active tab's current setup
    const m = model(), s = st(), q = new URLSearchParams();
    q.set('tab', tab); q.set('element', m.elementKey); q.set('v', m.V.toFixed(2)); q.set('pct', Math.round(m.pct)); q.set('mode', m.mode);
    if (m.configurable) q.set('levels', m.levels.length);
    if (tab === 'multiple') q.set('atoms', m.atoms.length);
    q.set('lines', +s.lines); q.set('squig', +s.squig); q.set('spec', +s.spec);
    if (seed !== null) q.set('seed', seed);
    return location.origin + location.pathname + '?' + q.toString();
  }
  function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toast.id); toast.id = setTimeout(() => { t.hidden = true; }, 2200); }

  // ---- canvases ----
  const stageCtx = V.setup($('stage'), V.STAGE_W, V.STAGE_H), energyCtx = V.setup($('energy'), V.ENERGY_W, V.ENERGY_H);
  const histCtx = V.setup($('hist'), 300, 140), effCtx = V.setup($('eff'), 300, 96);
  V.drawLegendAtom(V.setup($('lgAtom'), 60, 28), 60, 28);
  V.drawLegendElectron(V.setup($('lgElectron'), 60, 28), 60, 28);
  V.drawLegendPhotons(V.setup($('lgPhoton'), 60, 28), 60, 28);

  // ---- helpers ----
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function fillElementSelect() {
    const sel = $('element'), cur = sel.value;
    sel.innerHTML = '';
    for (const k of DL.ELEMENT_ORDER) sel.add(new Option(DL.t('element.' + k), k));
    sel.value = cur || model().elementKey;
  }

  // ---- sync DOM from the active model/tab ----
  function syncUI() {
    const m = model(), s = st();
    $('tabSingle').setAttribute('aria-selected', tab === 'single'); $('tabMultiple').setAttribute('aria-selected', tab === 'multiple');
    $('volt').value = m.V; $('voltText').value = m.V.toFixed(2) + ' V';
    $('pct').value = m.pct; $('pctText').value = Math.round(m.pct) + '%';
    document.querySelectorAll('input[name=mode]').forEach(r => { r.checked = r.value === m.mode; });
    $('fire').hidden = m.mode !== 'single'; $('pct').hidden = $('pctText').hidden = m.mode !== 'continuous';
    const sel = $('element'); let qm = [...sel.options].find(o => o.value === '?');       // mystery gas shows as a locked "?" entry
    if (m.mystery && !qm) { qm = new Option(DL.t('ch.mystery'), '?'); sel.add(qm); }
    if (!m.mystery && qm) qm.remove();
    sel.value = m.mystery ? '?' : m.elementKey; sel.disabled = !!m.mystery;
    $('levelsRow').classList.toggle('show', m.configurable && !m.mystery); $('nLevels').value = m.levels.length;
    $('optSpec').checked = s.spec; $('optSquig').checked = s.squig; $('optSlow').checked = s.slow; $('optLines').checked = s.lines;
    $('specBtns').hidden = !s.spec; $('sStop').textContent = DL.t(m.specRun ? 'spec.stop' : 'spec.start');
    $('atomsRow').hidden = tab === 'single'; $('natoms').value = m.atoms.length; $('nOut').textContent = m.atoms.length;
    syncClock();
  }

  // ---- clock controls (pause / play / step), per tab like PhET's per-module clocks ----
  function syncClock() {
    const p = st().paused;
    $('pauseIcon').hidden = p; $('playIcon').hidden = !p;
    $('clockPause').setAttribute('aria-pressed', p); $('clockPause').dataset.i18nTitle = p ? 'clock.play' : 'clock.pause';
    $('clockPause').title = DL.t(p ? 'clock.play' : 'clock.pause'); $('clockPause').setAttribute('aria-label', $('clockPause').title);
    $('clockStep').disabled = !p;
  }
  const tickUnits = () => DT * (st().slow ? 0.2 : 1);                      // one clock tick of model time
  function advance(u) { while (u > 0) { const d = Math.min(3, u); model().step(d); u -= d; } }
  $('clockPause').onclick = () => { st().paused = !st().paused; syncClock(); };
  $('clockStep').onclick = () => { if (st().paused) advance(tickUnits()); };
  $('lampsBtn').onclick = () => { V.drawLamps(V.setup($('lampCanvas'), 440, 270), 440, 270); $('lampsDlg').showModal(); };

  function setTab(k) { tab = k; syncUI(); }
  $('tabSingle').onclick = () => setTab('single');
  $('tabMultiple').onclick = () => setTab('multiple');

  // ---- battery / electron production ----
  $('volt').oninput = e => { model().setVoltage(+e.target.value); $('voltText').value = model().V.toFixed(2) + ' V'; };
  const applyVoltText = () => {
    const v = parseFloat($('voltText').value.replace(',', '.'));
    if (!isNaN(v)) model().setVoltage(v);
    $('volt').value = model().V; $('voltText').value = model().V.toFixed(2) + ' V';
  };
  $('voltText').onchange = applyVoltText;
  $('voltText').onkeydown = e => { if (e.key === 'Enter') applyVoltText(); };
  $('pct').oninput = e => { model().setPct(+e.target.value); $('pctText').value = Math.round(model().pct) + '%'; };
  const applyPctText = () => {
    const v = parseFloat($('pctText').value);
    if (!isNaN(v)) model().setPct(clamp(v, 0, 100));
    $('pct').value = model().pct; $('pctText').value = Math.round(model().pct) + '%';
  };
  $('pctText').onchange = applyPctText;
  $('pctText').onkeydown = e => { if (e.key === 'Enter') applyPctText(); };
  document.querySelectorAll('input[name=mode]').forEach(r => r.onchange = e => { model().setMode(e.target.value); syncUI(); });
  $('fire').onclick = () => model().fire();

  // ---- atom type ----
  $('element').onchange = e => { model().setElement(e.target.value); syncUI(); };
  $('nLevels').onchange = e => { model().setNumLevels(+e.target.value); syncUI(); };
  $('natoms').oninput = e => { model().setAtomCount(+e.target.value); $('nOut').textContent = e.target.value; };

  // ---- options ----
  $('optSpec').onchange = e => {                                   // checking resets and starts the spectrometer, as in PhET
    st().spec = e.target.checked; if (st().spec) { model().spectrum.clear(); model().specRun = true; } syncUI();
  };
  $('optSquig').onchange = e => { st().squig = e.target.checked; };
  $('optSlow').onchange = e => { st().slow = e.target.checked; };
  $('optLines').onchange = e => { st().lines = e.target.checked; };
  $('sStop').onclick = () => { model().specRun = !model().specRun; syncUI(); };
  $('sReset').onclick = () => model().spectrum.clear();
  $('statsReset').onclick = () => model().resetStats();

  // ---- configurable atom: drag level lines in the energy panel ----
  let dragLevel = -1;
  const energyPt = e => { const r = $('energy').getBoundingClientRect(); return { x: (e.clientX - r.left) * V.ENERGY_W / r.width, y: (e.clientY - r.top) * V.ENERGY_H / r.height }; };
  $('energy').addEventListener('pointerdown', e => {
    const m = model(); if (!m.configurable) return;
    const p = energyPt(e), ys = V.energyY(m);
    dragLevel = ys.findIndex((y, i) => i > 0 && Math.abs(y - p.y) < 7);
    if (dragLevel > 0) $('energy').setPointerCapture(e.pointerId);
  });
  $('energy').addEventListener('pointermove', e => {
    const m = model(); if (!m.configurable) { $('energy').style.cursor = ''; return; }
    const p = energyPt(e);
    if (dragLevel > 0) m.setLevel(dragLevel, V.yToEnergy(m, p.y));
    else $('energy').style.cursor = V.energyY(m).some((y, i) => i > 0 && Math.abs(y - p.y) < 7) ? 'ns-resize' : '';
  });
  $('energy').addEventListener('pointerup', () => { dragLevel = -1; });

  // ---- tooltips: spectrometer lines and energy levels ----
  const tip = $('tip');
  const showTip = (text, e) => {
    const wr = tip.parentElement.getBoundingClientRect();
    tip.textContent = text; tip.style.left = (e.clientX - wr.left + 12) + 'px'; tip.style.top = (e.clientY - wr.top - 24) + 'px'; tip.style.display = 'block';
  };
  $('stage').addEventListener('pointermove', e => {
    const r = $('stage').getBoundingClientRect(), px = (e.clientX - r.left) * V.STAGE_W / r.width, py = (e.clientY - r.top) * V.STAGE_H / r.height;
    const m = model(), S = V.SPEC; let text = '';
    if (st().spec && py > S.dy && py < S.dy + S.dh) {
      const hit = V.spectrumLayout(m).find(mk => Math.abs(mk.x - px) <= 5);
      if (hit) text = DL.t('tip.lineCount', { label: V.lineLabel(m, hit.w) || '—', w: hit.w < 300 ? '< 300' : hit.w > 800 ? '> 800' : hit.w.toFixed(1), c: hit.n });
      else if (st().lines && !m.mystery && py < S.dy + 24) {
        const ln = V.possibleLines(m).find(l => l.w >= 300 && l.w <= 800 && Math.abs(V.specX(l.w) - px) <= 5);
        if (ln) text = DL.t('tip.line', { label: V.lineLabel(m, ln.w), w: ln.w.toFixed(1) });
      }
    }
    if (text) showTip(text, e); else tip.style.display = 'none';
  });
  $('stage').addEventListener('pointerleave', () => { tip.style.display = 'none'; });
  $('energy').addEventListener('pointermove', e => {
    if (dragLevel >= 0 || model().mystery) return;
    const m = model(), p = energyPt(e), ys = V.energyY(m);
    const near = ys.reduce((best, y, i) => Math.abs(y - p.y) < 8 && (best < 0 || Math.abs(y - p.y) < Math.abs(ys[best] - p.y)) ? i : best, -1);
    if (near >= 0) showTip(DL.t('tip.level', { n: near + 1, e: m.levels[near].toFixed(2) }), e); else tip.style.display = 'none';
  });
  $('energy').addEventListener('pointerleave', () => { tip.style.display = 'none'; });

  // ---- screen-reader announcements (throttled) ----
  let lastSay = 0;
  const say = txt => { const now = performance.now(); if (now - lastSay > 700) { lastSay = now; $('live').textContent = txt; } };
  for (const m of Object.values(models)) m.onEvent = ev => {
    if (m !== model()) return;
    if (ev.type === 'absorb') say(DL.t('live.excite', { n: ev.n }));
    else say(DL.t('live.emit', { w: ev.w.toFixed(1), kind: DL.t(V.photonKind(ev.w)) }));
  };

  // ---- menus ----
  const menus = [...document.querySelectorAll('.menu')];
  const closeMenus = () => menus.forEach(mn => { mn.querySelector('ul').classList.remove('open'); mn.querySelector('button').setAttribute('aria-expanded', 'false'); });
  menus.forEach(mn => {
    const btn = mn.querySelector('button'), ul = mn.querySelector('ul');
    btn.onclick = e => { e.stopPropagation(); const open = !ul.classList.contains('open'); closeMenus(); if (open) { ul.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); ul.querySelector('button').focus(); } };
    ul.addEventListener('keydown', e => {
      const items = [...ul.querySelectorAll('button')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { items[(i + 1) % items.length].focus(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { items[(i - 1 + items.length) % items.length].focus(); e.preventDefault(); }
      if (e.key === 'Escape') { closeMenus(); btn.focus(); }
    });
  });
  document.addEventListener('click', closeMenus);

  function buildLanguageMenu() {                                    // radio-style items under Options
    const ul = $('optMenu');
    ul.querySelectorAll('.lang').forEach(li => li.remove());
    for (const [code, name] of Object.entries(DL.LANGS)) {
      const li = document.createElement('li'); li.className = 'lang'; li.setAttribute('role', 'none');
      const b = document.createElement('button'); b.setAttribute('role', 'menuitemradio'); b.className = 'check' + (DL.getLang() === code ? ' on' : '');
      b.setAttribute('aria-checked', DL.getLang() === code); b.textContent = name;
      b.onclick = () => { DL.setLang(code); applyLang(); closeMenus(); };
      li.appendChild(b); ul.appendChild(li);
    }
  }
  function applyLang() { DL.applyI18n(); fillElementSelect(); buildLanguageMenu(); syncUI(); if (challenge.state.kind) challenge.rerender(); }

  $('mSpeed').onclick = () => { closeMenus(); $('speedDlg').showModal(); };
  $('dt').oninput = e => { DT = +e.target.value; $('dtOut').textContent = DT; };
  $('mAbout').onclick = () => {
    closeMenus();
    if (seed !== null) { $('seedInfo').hidden = false; $('seedInfo').textContent = 'Seed: ' + seed; }
    $('aboutDlg').showModal();
  };
  $('mCopy').onclick = async () => {
    closeMenus(); const url = setupLink();
    try { await navigator.clipboard.writeText(url); toast(DL.t('file.copied')); }
    catch (e) { window.prompt(DL.t('file.copylink'), url); }      // clipboard blocked (e.g. insecure context): let the user copy it
  };
  $('mReset').onclick = () => {
    closeMenus(); models.single.reset(); models.multiple.reset();
    ui.single = defaultUi('single'); ui.multiple = defaultUi('multiple'); DT = 12; $('dt').value = 12; $('dtOut').textContent = 12; syncUI();
  };

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const ms = Math.min(50, now - last); last = now;
    if (!st().paused) advance(ms * DT / 40 * (st().slow ? 0.2 : 1));
    V.drawStage(stageCtx, model(), st()); V.drawEnergy(energyCtx, model(), st());
    if ($('analysis').open) { V.drawHistogram(histCtx, model(), 300, 140); V.drawEfficiency(effCtx, model(), 300, 96); }
    requestAnimationFrame(frame);
  }

  const challenge = DL.createChallenge({ models, setTab, syncUI });
  $('mGas').onclick = () => { closeMenus(); challenge.start('gas'); };
  $('mVolt').onclick = () => { closeMenus(); challenge.start('volt'); };
  applyParams();
  applyLang();
  requestAnimationFrame(frame);
  window.lampSim = { seed, setupLink, challenge, models, ui, get tab() { return tab; }, setTab, syncUI };       // handle for tests / debugging
})();
