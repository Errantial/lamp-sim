/* Challenge mode: two small games built on the simulation.
   - "Identify the Gas": a mystery gas fills the lamp; element name, energy levels and line labels are hidden.
   - "Find the Voltage": work out the lowest battery voltage that excites a given level of a single atom.
   Randomness comes from the model's own (seedable) stream, so ?seed=N repeats the same challenges. */
(function (root) {
  'use strict';
  const DL = root.DL = root.DL || {};
  const GASES = ['hydrogen', 'mercury', 'sodium', 'neon'];
  const TOLERANCE_V = 0.5, MAX_TARGET_V = 29.5;

  // api: { models, setTab, syncUI }
  DL.createChallenge = function (api) {
    const $ = id => document.getElementById(id);
    const state = { kind: null, target: null, score: 0, total: 0, hintsUsed: 0, solved: false };
    const rnd = () => api.models.multiple.random();
    const pick = list => list[Math.floor(rnd() * list.length)];
    const say = text => { $('chFeedback').textContent = text; };

    function render() {
      const active = !!state.kind;
      $('challenge').hidden = !active;
      $('chGas').hidden = state.kind !== 'gas';
      $('chVoltRow').hidden = state.kind !== 'volt';
      $('chScore').textContent = DL.t('ch.score', { s: state.score, t: state.total });
      if (!active) return;
      if (state.kind === 'gas') $('chPrompt').textContent = DL.t('ch.gas.prompt');
      else $('chPrompt').textContent = DL.t('ch.volt.prompt', { gas: DL.t('element.' + state.target.element), n: state.target.level + 1, tol: TOLERANCE_V });
    }

    function clearMystery() { for (const m of Object.values(api.models)) m.mystery = false; }

    function begin() {                                        // set up a fresh round of the current kind
      state.solved = false; state.hintsUsed = 0; state.total++; say('');
      if (state.kind === 'gas') {
        clearMystery();
        api.setTab('multiple');
        const m = api.models.multiple, key = pick(GASES);
        m.setElement(key); m.mystery = true; m.spectrum.clear();
        state.target = key;
        const sel = $('chGas'); sel.innerHTML = '';
        sel.add(new Option(DL.t('ch.choose'), ''));
        for (const g of GASES) sel.add(new Option(DL.t('element.' + g), g));
      } else {
        clearMystery();
        api.setTab('single');
        const t = pick(DL.reachableTargets(MAX_TARGET_V)), m = api.models.single;
        m.setElement(t.element); m.setMode('single');
        state.target = t; $('chVolt').value = '';
      }
      api.syncUI(); render();
    }

    const challenge = {
      state,
      start(kind) { state.kind = kind; begin(); },
      rerender() { render(); },
      next() { if (state.kind) begin(); },
      end() { state.kind = null; state.target = null; clearMystery(); say(''); api.syncUI(); render(); },
      check() {
        if (!state.kind || state.solved) return;
        let ok = false;
        if (state.kind === 'gas') {
          const guess = $('chGas').value; if (!guess) { say(DL.t('ch.choose')); return; }
          ok = guess === state.target;
        } else {
          const v = parseFloat($('chVolt').value.replace(',', '.'));
          if (isNaN(v)) { say(DL.t('ch.enterVolts')); return; }
          ok = Math.abs(v - state.target.v) <= TOLERANCE_V;
        }
        if (ok) {
          state.solved = true; state.score++;
          if (state.kind === 'gas') { api.models.multiple.mystery = false; api.syncUI(); say(DL.t('ch.correct') + ' ' + DL.t('ch.reveal', { gas: DL.t('element.' + state.target) })); }
          else say(DL.t('ch.correct') + ' ' + DL.t('ch.voltIs', { v: state.target.v.toFixed(1) }));
        } else say(DL.t('ch.wrong'));
        render();
      },
      hint() {
        if (!state.kind || state.solved) return;
        const m = state.kind === 'gas' ? api.models.multiple : api.models.single;
        state.hintsUsed++;
        if (state.kind === 'gas') say(state.hintsUsed === 1 ? DL.t('ch.hint.gas1') : DL.t('ch.hint.gas2', { n: m.levels.length }));
        else say(state.hintsUsed === 1 ? DL.t('ch.hint.volt1') : DL.t('ch.hint.volt2', { gap: (m.levels[state.target.level] - m.levels[0]).toFixed(2) }));
      },
      giveUp() {
        if (!state.kind || state.solved) return;
        state.solved = true;
        if (state.kind === 'gas') { api.models.multiple.mystery = false; api.syncUI(); say(DL.t('ch.reveal', { gas: DL.t('element.' + state.target) })); }
        else say(DL.t('ch.voltIs', { v: state.target.v.toFixed(1) }));
        render();
      }
    };

    $('chCheck').onclick = challenge.check;
    $('chHint').onclick = challenge.hint;
    $('chNext').onclick = challenge.next;
    $('chGive').onclick = challenge.giveUp;
    $('chEnd').onclick = challenge.end;
    $('chVolt').onkeydown = e => { if (e.key === 'Enter') challenge.check(); };
    return challenge;
  };
})(typeof window !== 'undefined' ? window : globalThis);
