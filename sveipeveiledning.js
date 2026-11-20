/* Skjul sveipeveiledningen når timeplanen faktisk er tegnet.
   Krever ikke at fremdriftslinjen treffer nøyaktig 100 %. */
(() => {
  const overlay = document.getElementById('loadingOverlay');
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('loadingText');
  if (!overlay) return;

  // Bruk faktisk peketype, ikke bare skjermbredde (PC-vinduer kan være smale).
  const guide = overlay.querySelector('.swipe-guide');
  const touchDevice = window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches);
  let mode = 'desktop';
  if (touchDevice) {
    // Hver nye oppstart på samme enhet veksler mellom sveiping og rotasjon.
    try {
      const previous = localStorage.getItem('timeplanStartupGuide');
      mode = previous === 'swipe' ? 'rotate' : 'swipe';
      localStorage.setItem('timeplanStartupGuide', mode);
    } catch (_) { mode = 'swipe'; }
  }
  if (guide) guide.dataset.guideMode = mode;
  const stage = guide?.querySelector('.swipe-guide-stage');
  const horizontal = guide?.querySelector('.swipe-guide-instruction-h');
  const vertical = guide?.querySelector('.swipe-guide-instruction-v');
  if (mode === 'desktop') {
    if (horizontal) horizontal.textContent = '';
    if (vertical) vertical.innerHTML = 'Bruk piltastene ↑ og ↓ <small>for å bytte uke</small>';
  } else if (mode === 'rotate') {
    if (stage) {
      const card = stage.querySelector('.swipe-guide-card');
      if (card) card.innerHTML = '<div class="guide-phone-content"><i></i><i></i><i></i></div><div class="guide-week-content"><i></i><i></i><i></i><i></i><i></i></div>';
    }
    if (horizontal) horizontal.innerHTML = 'Portrett: dag · Landskap: uke <small>Roter telefonen for å se hele uken</small>';
    if (vertical) vertical.textContent = '';
  }

  const started = performance.now();
  const minDisplay = 350;
  let finished = false;
  let lastChange = performance.now();
  let lastSignature = '';
  let timer = null;

  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    overlay.classList.add('swipe-guide-done');
    setTimeout(() => {
      overlay.hidden = true;
      overlay.style.display = 'none';
    }, 280);
  }

  function check() {
    if (finished) return;
    const now = performance.now();
    // Registreringsskjermen må aldri dekkes av en evig lasteanimasjon.
    if (document.querySelector('.register-screen')) {
      if (now - started >= minDisplay) finish();
      return;
    }

    const weeks = document.querySelector('.weeks');
    const days = weeks?.querySelectorAll('.day') || [];
    const lessons = weeks?.querySelectorAll('.lesson') || [];
    const progress = parseFloat(bar?.style.width || '0');
    const signature = `${days.length}/${lessons.length}/${progress}/${weeks?.textContent?.length || 0}`;
    if (signature !== lastSignature) {
      lastSignature = signature;
      lastChange = now;
    }

    // Timeplanen må være opprettet, og DOM-en ha stått stille et lite øyeblikk.
    // Dermed fungerer dette også når progressBar aldri får nøyaktig 100 %.
    if (days.length > 0 && now - started >= minDisplay && now - lastChange >= 450) {
      finish();
      return;
    }

    // Ikke dekk over en eventuell feil eller treg nettverkstilkobling for alltid.
    if (now - started > 8000) {
      if (label) label.textContent = 'Innlastingen tar lengre tid enn vanlig …';
      if (days.length > 0) finish();
    }
  }

  timer = setInterval(check, 120);
  check();
})();
