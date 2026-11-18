/* Venter på at render.js melder 100 %, uten å endre app.js eller render.js. */
(() => {
  const overlay = document.getElementById('loadingOverlay');
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('loadingText');
  if (!overlay || !bar) return;
  let finished = false;
  let minimumUntil = performance.now() + 350;
  function hide() {
    if (finished) return;
    finished = true;
    overlay.classList.add('swipe-guide-done');
    setTimeout(() => { overlay.hidden = true; overlay.style.display = 'none'; observer.disconnect(); }, 280);
  }
  function check() {
    if (finished) return;
    const progress = parseFloat(bar.style.width || '0');
    const registered = !!document.querySelector('.register-screen');
    if (registered) { hide(); return; }
    if (progress >= 100 && document.querySelector('.weeks')?.children.length) {
      setTimeout(hide, Math.max(0, minimumUntil - performance.now()));
    }
  }
  const observer = new MutationObserver(check);
  observer.observe(document.body, {childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  check();
  // Ved feil under lasting: ikke skjul problemet bak en endeløs animasjon.
  setTimeout(() => {
    if (!finished && label) label.textContent = 'Innlastingen tar lengre tid enn vanlig …';
  }, 8000);
})();
