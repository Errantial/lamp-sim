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
      'menu.challenges': 'Challenges', 'ch.gas.item': 'Identify the Gas', 'ch.volt.item': 'Find the Voltage', 'ch.title': 'Challenge',
      'ch.gas.prompt': 'A mystery gas fills the lamp (Multiple Atoms tab). Run the lamp, study the spectrum, then name the gas.',
      'ch.volt.prompt': 'One Atom tab: what is the lowest battery voltage that can excite the {gas} atom to level {n}? Answer within {tol} V.',
      'ch.check': 'Check', 'ch.hint': 'Hint', 'ch.give': 'Show answer', 'ch.next': 'New challenge', 'ch.end': 'End challenge',
      'ch.choose': 'Choose a gas…', 'ch.enterVolts': 'Enter a voltage in volts.', 'ch.correct': 'Correct!', 'ch.wrong': 'Not quite, try again.',
      'ch.reveal': 'The gas was {gas}.', 'ch.voltIs': 'The threshold is about {v} V.', 'ch.score': 'Solved: {s} of {t}',
      'ch.hint.gas1': 'Open "See How the Lamps Glow" and compare the colours with your spectrum.',
      'ch.hint.gas2': 'This gas has {n} energy levels.',
      'ch.hint.volt1': 'An electron gains energy as it crosses the tube; at the atom it has only about 0.47 eV per volt of battery voltage.',
      'ch.hint.volt2': 'The level lies {gap} eV above the ground state.', 'ch.mystery': 'Mystery gas', 'ch.hidden': 'Energy levels hidden', 'ch.volts': 'volts',
      'phys.title': 'Physics', 'phys.mode': 'Model', 'phys.simple': 'Simple (PhET-like)', 'phys.realistic': 'Realistic',
      'phys.pressure': 'Gas pressure', 'phys.temp': 'Temperature', 'phys.life': 'Excited-state lifetime',
      'phys.note': 'Realistic: the chance of excitation depends on the electron energy and on how strong the transition is, electrons scatter off the gas, atom speeds follow the temperature and lifetimes are random. The One Atom tab keeps its atom still.',
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
      'menu.challenges': 'Desafíos', 'ch.gas.item': 'Identifica el gas', 'ch.volt.item': 'Encuentra el voltaje', 'ch.title': 'Desafío',
      'ch.gas.prompt': 'Un gas misterioso llena la lámpara (pestaña Varios átomos). Enciende la lámpara, estudia el espectro y di qué gas es.',
      'ch.volt.prompt': 'Pestaña Un átomo: ¿cuál es el voltaje mínimo de la batería que puede excitar el átomo de {gas} al nivel {n}? Responde con un margen de {tol} V.',
      'ch.check': 'Comprobar', 'ch.hint': 'Pista', 'ch.give': 'Mostrar respuesta', 'ch.next': 'Nuevo desafío', 'ch.end': 'Terminar desafío',
      'ch.choose': 'Elige un gas…', 'ch.enterVolts': 'Escribe un voltaje en voltios.', 'ch.correct': '¡Correcto!', 'ch.wrong': 'No exactamente, inténtalo de nuevo.',
      'ch.reveal': 'El gas era {gas}.', 'ch.voltIs': 'El umbral es de unos {v} V.', 'ch.score': 'Resueltos: {s} de {t}',
      'ch.hint.gas1': 'Abre "Ver cómo brillan las lámparas" y compara los colores con tu espectro.',
      'ch.hint.gas2': 'Este gas tiene {n} niveles de energía.',
      'ch.hint.volt1': 'Un electrón gana energía al cruzar el tubo; en el átomo tiene solo unos 0,47 eV por voltio de la batería.',
      'ch.hint.volt2': 'El nivel está {gap} eV por encima del estado fundamental.', 'ch.mystery': 'Gas misterioso', 'ch.hidden': 'Niveles de energía ocultos', 'ch.volts': 'voltios',
      'phys.title': 'Física', 'phys.mode': 'Modelo', 'phys.simple': 'Simple (como PhET)', 'phys.realistic': 'Realista',
      'phys.pressure': 'Presión del gas', 'phys.temp': 'Temperatura', 'phys.life': 'Vida del estado excitado',
      'phys.note': 'Realista: la probabilidad de excitación depende de la energía del electrón y de la intensidad de la transición, los electrones se dispersan en el gas, la velocidad de los átomos sigue la temperatura y las vidas medias son aleatorias. La pestaña Un átomo mantiene el átomo quieto.',
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
