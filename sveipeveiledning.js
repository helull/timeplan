/* Skjul sveipeveiledningen når timeplanen faktisk er tegnet.
   Krever ikke at fremdriftslinjen treffer nøyaktig 100 %. */
(() => {
  const overlay = document.getElementById('loadingOverlay');
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('loadingText');
  if (!overlay) return;

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
