// Informasjon for både elev og lærer.
// REDIGER BARE TEKSTEN MELLOM AKSENTTEGNENE (`) NEDENFOR.
// Linjeskift og avsnitt vises slik de er skrevet.
const INFORMASJONSTEKST = `Skriv informasjonsteksten din her.

Du kan bruke flere avsnitt. Vinduet tilpasser seg korte tekster og blir rullbart når teksten er lang.`;

let previousFocus = null;
let keyHandler = null;

export function openInfoModal() {
    const existing = document.getElementById('timeplanInfoModal');
    if (existing) { existing.querySelector('#timeplanInfoClose')?.focus(); return; }
    previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.id = 'timeplanInfoModal';
    overlay.className = 'modal timeplan-info-overlay';
    overlay.innerHTML = `
      <section class="modal-card timeplan-info-card" role="dialog" aria-modal="true" aria-labelledby="timeplanInfoTitle" tabindex="-1">
        <header class="timeplan-info-header">
          <h2 id="timeplanInfoTitle">Informasjon</h2>
          <button id="timeplanInfoClose" class="timeplan-info-close" type="button" aria-label="Avslutt" title="Avslutt">✕</button>
        </header>
        <div class="timeplan-info-body" id="timeplanInfoBody"></div>
      </section>`;
    overlay.querySelector('#timeplanInfoBody').textContent = INFORMASJONSTEKST;
    document.body.appendChild(overlay);
    const close = () => {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        overlay.remove();
        if (previousFocus?.isConnected) previousFocus.focus();
    };
    overlay.querySelector('#timeplanInfoClose').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    keyHandler = event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') {
            // Én aktiv knapp: hold tastaturfokus inne i dialogen.
            event.preventDefault();
            overlay.querySelector('#timeplanInfoClose').focus();
        }
    };
    document.addEventListener('keydown', keyHandler);
    overlay.querySelector('#timeplanInfoClose').focus();
}
