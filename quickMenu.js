// Kompakt hurtigmeny. Bevarer app.js og alle eksisterende modalfunksjoner.
import { isTeacher } from './teacher.js';
import { openAdminPanel, openToolsPanel } from './teacherPanel.js';
import { openProveplan } from './proveplan.js';
import { openInfoModal } from './infoModal.js';

const trigger = document.getElementById('menuButton');
if (trigger) {
    trigger.setAttribute('aria-label', 'Åpne hurtigmeny');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'quickMenuActions');

    const menu = document.createElement('div');
    menu.id = 'quickMenuActions';
    menu.className = 'quick-menu-actions';
    menu.setAttribute('aria-label', 'Hurtigmeny');
    menu.innerHTML = `
      <button type="button" class="quick-menu-action" id="quickExamPlan">▦ <span>Prøveplan</span></button>
      <button type="button" class="quick-menu-action quick-info-action" id="quickInfo" aria-label="Informasjon" title="Informasjon"><span class="quick-info-mark" aria-hidden="true">?</span><span>Info</span></button>
      <button type="button" class="quick-menu-action quick-display-action" id="quickDisplay" title="Endre visning av lærer og rom" aria-label="Endre visning"><span class="quick-display-icon" aria-hidden="true">◉</span><span class="quick-display-label">Begge</span></button>\n      <button type="button" class="quick-menu-action" id="quickMore">⋯ <span>Mer</span></button>`;
    trigger.insertAdjacentElement('afterend', menu);

    // Bruk de SAMME lagringsnøklene som timeplanen og «Mer»-menyen.
    if (localStorage.getItem('showTeacherNames') === null) localStorage.setItem('showTeacherNames', 'true');
    if (localStorage.getItem('showRooms') === null) localStorage.setItem('showRooms', 'true');
    const modes = [
        { name: 'Ingen', teacher: false, room: false, icon: '◌' },
        { name: 'Lærer', teacher: true, room: false, icon: '♙' },
        { name: 'Rom', teacher: false, room: true, icon: '⌖' },
        { name: 'Begge', teacher: true, room: true, icon: '◉' }
    ];
    const displayButton = menu.querySelector('#quickDisplay');

    function currentModeIndex() {
        // Uten lagrede valg: vis begge.
        const teacher = localStorage.getItem('showTeacherNames') !== 'false';
        const room = localStorage.getItem('showRooms') !== 'false';
        return modes.findIndex(mode => mode.teacher === teacher && mode.room === room);
    }

    function applyDisplayMode() {
        const mode = modes[currentModeIndex()] || modes[3];
        document.querySelectorAll('.room').forEach(el => {
            el.classList.toggle('roomInvisible', !mode.room);
        });
        document.querySelectorAll('.teacher').forEach(el => {
            // Begge klassenavn brukes i ulike versjoner av render.js.
            el.classList.toggle('teacherInvisible', !mode.teacher);
            el.classList.toggle('teacherNameInvisible', !mode.teacher);
            el.classList.toggle('roomInvisible', !mode.teacher);
        });
        displayButton.querySelector('.quick-display-icon').textContent = mode.icon;
        displayButton.querySelector('.quick-display-label').textContent = mode.name;
        displayButton.setAttribute('aria-label', 'Visning: ' + mode.name + '. Trykk for neste');
        displayButton.title = 'Visning: ' + mode.name + ' – trykk for neste';
    }

    // Timekort tegnes på nytt ved dag-/ukebytte. Bruk samme valg da også.
    const weeks = document.querySelector('.weeks');
    if (weeks) {
        let pending = false;
        new MutationObserver(() => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                applyDisplayMode();
            });
        }).observe(weeks, { childList: true, subtree: true });
    }
    displayButton.addEventListener('click', () => {
        const next = modes[(currentModeIndex() + 1) % modes.length];
        localStorage.setItem('showTeacherNames', String(next.teacher));
        localStorage.setItem('showRooms', String(next.room));
        applyDisplayMode();
        // Ikke lukk menyen: brukeren skal kunne se endringen bak den.
    });
    applyDisplayMode();

    const close = () => {
        document.body.classList.remove('quick-display-menu-open');\n        menu.classList.remove('is-open');
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Åpne hurtigmeny');
        trigger.textContent = '☰';
    };
    const toggle = () => {
        const opening = !menu.classList.contains('is-open');
        document.body.classList.toggle('quick-display-menu-open', opening);\n        menu.classList.toggle('is-open', opening);
        trigger.classList.toggle('is-open', opening);
        trigger.setAttribute('aria-expanded', String(opening));
        trigger.setAttribute('aria-label', opening ? 'Lukk hurtigmeny' : 'Åpne hurtigmeny');
        trigger.textContent = opening ? '×' : '☰';
    };

    // Capture hindrer app.js sin gamle klikklytter i å åpne modal direkte.
    trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggle();
    }, true);

    menu.querySelector('#quickExamPlan').addEventListener('click', () => {
        close();
        openProveplan();
    });
    menu.querySelector('#quickInfo').addEventListener('click', () => {
        close();
        openInfoModal();
    });
    menu.querySelector('#quickMore').addEventListener('click', () => {
        close();
        if (isTeacher()) openAdminPanel();
        else openToolsPanel();
    });
    document.addEventListener('pointerdown', event => {
        if (!trigger.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
    });
}

// Litt tydeligere timeplan bak åpen hurtigmeny, uten å endre andre modaler.
const quickDisplayStyle = document.createElement('style');
quickDisplayStyle.textContent = `
  .quick-menu-actions .quick-display-action {
    background:#eaf1ff!important; color:#1d4ed8!important;
    min-width:75px; justify-content:center;
  }
  .quick-display-icon { font-size:17px; line-height:1; }
  .quick-display-label { font-size:12px; }
  body.quick-display-menu-open::before {
    content:""; position:fixed; inset:0; z-index:317;
    background:rgba(238,244,252,.12); pointer-events:none;
  }
  body.quick-display-menu-open .weeks { filter:none!important; opacity:1!important; }
  @media(max-width:440px) {
    .quick-menu-actions { gap:2px!important; padding:3px!important; }
    .quick-menu-actions .quick-menu-action { padding:6px 5px!important; gap:3px!important; font-size:11px!important; }
    .quick-menu-actions .quick-display-action { min-width:61px; }
    .quick-display-label { font-size:11px; }
  }
`;
document.head.appendChild(quickDisplayStyle);
