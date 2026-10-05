/* Minimal string table. Add a language by adding a key to STRINGS (missing keys fall back to English). */
(function (root) {
  'use strict';
  const DL = root.DL = root.DL || {};

  const STRINGS = {
    en: {
      title: 'Discharge Lamps', 'tab.single': 'One Atom', 'tab.multiple': 'Multiple Atoms',
      'menu.file': 'File', 'menu.options': 'Options', 'menu.help': 'Help',
      'file.reset': 'Reset All', 'file.copylink': 'Copy Link to This Setup', 'file.copied': 'Link copied to the clipboard', 'options.speed': 'Simulation Speed…', 'options.language': 'Language',
      'help.about': 'About…',
      'legend.title': 'Legend', 'legend.atom': 'Atom', 'legend.electron': 'Electron', 'legend.photon': 'Photon',
      'atomtype.title': 'Atom Type', 'atomtype.levels': 'Number of levels',
      'element.hydrogen': 'Hydrogen', 'element.mercury': 'Mercury', 'element.sodium': 'Sodium', 'element.neon': 'Neon',
      'element.configurable': 'Configurable',
      'electron.title': 'Electron Production', 'electron.single': 'Single', 'electron.continuous': 'Continuous',
      'electron.fire': 'Fire electron', 'electron.rate': 'Electron production rate',
      'battery.label': 'Battery voltage', 'battery.value': 'Battery voltage (volts)',
      'options.title': 'Options', 'options.spectrometer': 'Spectrometer', 'options.squiggles': 'Squiggles',
      'options.slow': 'Run in slow motion', 'options.lines': 'Show line positions',
      'analysis.title': 'Analysis', 'analysis.hist': 'Electron energy at collision (eV)', 'analysis.count': 'collisions', 'analysis.eff': 'Where the electron energy goes', 'analysis.light': 'turned into light', 'analysis.reset': 'Reset statistics', 'options.atoms': 'Number of atoms',
      'spec.stop': 'Stop', 'spec.start': 'Start', 'spec.reset': 'Reset', 'spec.axis': 'Wavelength (nanometers)',
      'spec.farUV': '<- far UV', 'spec.farIR': 'far IR ->', 'spec.nm': 'nm', 'spec.count': 'photons',
      'energy.axis': 'Energy (eV)', 'energy.ground': 'Ground state', 'energy.collision1': 'Energy at', 'energy.collision2': 'collision',
      'speed.title': 'Simulation Speed', 'speed.label': 'Time step per tick', 'close': 'Close',
      'about.title': 'About', 'about.body': 'An interactive discharge-lamp simulation. Its model, atom data and appearance follow PhET Interactive Simulations\' "Neon Lights & Other Discharge Lamps" (University of Colorado Boulder, GPL-3.0 / CC-BY). This is an independent re-implementation and is not affiliated with PhET.',
      'lamps.button': 'See How the Lamps Glow', 'lamps.title': 'How the lamps glow', 'lamps.note': 'Approximate colours mixed from the simulated visible lines of each gas. Real lamps also depend on pressure, current and the glass.',
      'clock.pause': 'Pause', 'clock.play': 'Play', 'clock.step': 'Step',
      'tip.level': 'Level {n}: {e} eV', 'tip.line': '{label} · {w} nm', 'tip.lineCount': '{label} · {w} nm · {c}',
      'live.excite': 'Atom excited to level {n}', 'live.emit': 'Photon emitted: {w} nanometers, {kind}',
      'kind.uv': 'ultraviolet', 'kind.visible': 'visible light', 'kind.ir': 'infrared'
    },
    es: {
      title: 'Lámparas de descarga', 'tab.single': 'Un átomo', 'tab.multiple': 'Varios átomos',
      'menu.file': 'Archivo', 'menu.options': 'Opciones', 'menu.help': 'Ayuda',
      'file.reset': 'Reiniciar todo', 'file.copylink': 'Copiar enlace de esta configuración', 'file.copied': 'Enlace copiado al portapapeles', 'options.speed': 'Velocidad de simulación…', 'options.language': 'Idioma',
      'help.about': 'Acerca de…',
      'legend.title': 'Leyenda', 'legend.atom': 'Átomo', 'legend.electron': 'Electrón', 'legend.photon': 'Fotón',
      'atomtype.title': 'Tipo de átomo', 'atomtype.levels': 'Número de niveles',
      'element.hydrogen': 'Hidrógeno', 'element.mercury': 'Mercurio', 'element.sodium': 'Sodio', 'element.neon': 'Neón',
      'element.configurable': 'Configurable',
      'electron.title': 'Producción de electrones', 'electron.single': 'Uno', 'electron.continuous': 'Continuo',
      'electron.fire': 'Disparar electrón', 'electron.rate': 'Tasa de producción de electrones',
      'battery.label': 'Voltaje de la batería', 'battery.value': 'Voltaje de la batería (voltios)',
      'options.title': 'Opciones', 'options.spectrometer': 'Espectrómetro', 'options.squiggles': 'Ondulaciones',
      'options.slow': 'Cámara lenta', 'options.lines': 'Mostrar posiciones de líneas',
      'analysis.title': 'Análisis', 'analysis.hist': 'Energía del electrón en la colisión (eV)', 'analysis.count': 'colisiones', 'analysis.eff': 'A dónde va la energía del electrón', 'analysis.light': 'convertida en luz', 'analysis.reset': 'Reiniciar estadísticas', 'options.atoms': 'Número de átomos',
      'spec.stop': 'Parar', 'spec.start': 'Iniciar', 'spec.reset': 'Reiniciar', 'spec.axis': 'Longitud de onda (nanómetros)',
      'spec.farUV': '<- UV', 'spec.farIR': 'IR ->', 'spec.nm': 'nm', 'spec.count': 'fotones',
      'energy.axis': 'Energía (eV)', 'energy.ground': 'Estado fundamental', 'energy.collision1': 'Energía en', 'energy.collision2': 'la colisión',
      'speed.title': 'Velocidad de simulación', 'speed.label': 'Paso de tiempo por ciclo', 'close': 'Cerrar',
      'about.title': 'Acerca de', 'about.body': 'Simulación interactiva de lámparas de descarga. Su modelo, datos atómicos y apariencia siguen la simulación "Neon Lights & Other Discharge Lamps" de PhET Interactive Simulations (Universidad de Colorado en Boulder, GPL-3.0 / CC-BY). Es una reimplementación independiente sin afiliación con PhET.',
      'lamps.button': 'Ver cómo brillan las lámparas', 'lamps.title': 'Cómo brillan las lámparas', 'lamps.note': 'Colores aproximados, mezclados a partir de las líneas visibles simuladas de cada gas. Las lámparas reales también dependen de la presión, la corriente y el vidrio.',
      'clock.pause': 'Pausa', 'clock.play': 'Reanudar', 'clock.step': 'Paso',
      'tip.level': 'Nivel {n}: {e} eV', 'tip.line': '{label} · {w} nm', 'tip.lineCount': '{label} · {w} nm · {c}',
      'live.excite': 'Átomo excitado al nivel {n}', 'live.emit': 'Fotón emitido: {w} nanómetros, {kind}',
      'kind.uv': 'ultravioleta', 'kind.visible': 'luz visible', 'kind.ir': 'infrarrojo'
    }
  };

  let lang = 'en';
  DL.LANGS = { en: 'English', es: 'Español' };
  DL.t = (key, vars) => {
    let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  };
  DL.getLang = () => lang;
  DL.setLang = l => { if (STRINGS[l]) { lang = l; try { localStorage.setItem('lamp-sim-lang', l); } catch (e) { /* storage may be blocked */ } } };
  DL.initLang = () => {
    let l = 'en';
    try { l = localStorage.getItem('lamp-sim-lang') || (navigator.language || 'en').slice(0, 2); } catch (e) { /* ignore */ }
    if (STRINGS[l]) lang = l;
  };
  // apply translations to elements carrying data-i18n (text) / data-i18n-aria (aria-label) / data-i18n-title
  DL.applyI18n = (rootEl) => {
    (rootEl || document).querySelectorAll('[data-i18n]').forEach(el => { el.textContent = DL.t(el.dataset.i18n); });
    (rootEl || document).querySelectorAll('[data-i18n-title]').forEach(el => { el.title = DL.t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    (rootEl || document).querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', DL.t(el.dataset.i18nAria)));
    document.documentElement.lang = lang;
  };
})(typeof window !== 'undefined' ? window : globalThis);
