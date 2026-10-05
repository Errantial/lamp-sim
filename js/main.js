/* Wires model, views and DOM controls together. One model per tab (like PhET's two modules); only the active one runs. */
(function () {
  'use strict';
  const DL = window.DL, C = DL.C, V = DL.view, $ = id => document.getElementById(id);

  DL.initLang();

  // ---- state ----
  let DT = 12;                                                     // model time units per 40 ms tick (Options > Simulation Speed)
  const models = { single: DL.createModel({ tab: 'single' }), multiple: DL.createModel({ tab: 'multiple', nAtoms: C.MAX_ATOMS }) };
  const defaultUi = k => ({ squig: k === 'single', spec: true, slow: false });
  const ui = { single: defaultUi('single'), multiple: defaultUi('multiple') };
  let tab = 'multiple';
  const model = () => models[tab], st = () => ui[tab];

  // ---- canvases ----
  const stageCtx = V.setup($('stage'), V.STAGE_W, V.STAGE_H), energyCtx = V.setup($('energy'), V.ENERGY_W, V.ENERGY_H);
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
    $('element').value = m.elementKey;
    $('levelsRow').classList.toggle('show', m.configurable); $('nLevels').value = m.levels.length;
    $('optSpec').checked = s.spec; $('optSquig').checked = s.squig; $('optSlow').checked = s.slow;
    $('specBtns').hidden = !s.spec; $('sStop').textContent = DL.t(m.specRun ? 'spec.stop' : 'spec.start');
    $('atomsRow').hidden = tab === 'single'; $('natoms').value = m.atoms.length; $('nOut').textContent = m.atoms.length;
  }

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
  $('sStop').onclick = () => { model().specRun = !model().specRun; syncUI(); };
  $('sReset').onclick = () => model().spectrum.clear();

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

  // ---- spectrometer tooltip ----
  $('stage').addEventListener('pointermove', e => {
    const r = $('stage').getBoundingClientRect(), x = (e.clientX - r.left) * V.STAGE_W / r.width, y = (e.clientY - r.top) * V.STAGE_H / r.height;
    const tip = $('tip'); let hit = null;
    if (st().spec && y > V.SPEC.dy && y < V.SPEC.dy + V.SPEC.dh) hit = V.spectrumLayout(model()).find(mk => Math.abs(mk.x - x) <= 5);
    if (!hit) { tip.style.display = 'none'; return; }
    tip.textContent = `${hit.w < 300 ? '< 300' : hit.w > 800 ? '> 800' : hit.w.toFixed(1)} ${DL.t('spec.nm')} · ${hit.n} ${DL.t('spec.count')}`;
    const wr = $('stage').parentElement.getBoundingClientRect();
    tip.style.left = (e.clientX - wr.left + 12) + 'px'; tip.style.top = (e.clientY - wr.top - 24) + 'px'; tip.style.display = 'block';
  });
  $('stage').addEventListener('pointerleave', () => { $('tip').style.display = 'none'; });

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
  function applyLang() { DL.applyI18n(); fillElementSelect(); buildLanguageMenu(); syncUI(); }

  $('mSpeed').onclick = () => { closeMenus(); $('speedDlg').showModal(); };
  $('dt').oninput = e => { DT = +e.target.value; $('dtOut').textContent = DT; };
  $('mAbout').onclick = () => { closeMenus(); $('aboutDlg').showModal(); };
  $('mReset').onclick = () => {
    closeMenus(); models.single.reset(); models.multiple.reset();
    ui.single = defaultUi('single'); ui.multiple = defaultUi('multiple'); DT = 12; $('dt').value = 12; $('dtOut').textContent = 12; syncUI();
  };

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const ms = Math.min(50, now - last); last = now;
    let u = ms * DT / 40 * (st().slow ? 0.2 : 1);
    while (u > 0) { const d = Math.min(3, u); model().step(d); u -= d; }
    V.drawStage(stageCtx, model(), st()); V.drawEnergy(energyCtx, model(), st());
    requestAnimationFrame(frame);
  }

  applyLang();
  requestAnimationFrame(frame);
  window.lampSim = { models, ui, get tab() { return tab; }, setTab, syncUI };       // handle for tests / debugging
})();
