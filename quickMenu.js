// Kompakt hurtigmeny. Bevarer app.js og alle eksisterende modalfunksjoner.
import { isTeacher } from './teacher.js';
import { openAdminPanel, openToolsPanel } from './teacherPanel.js';
import { openProveplan } from './proveplan.js';
import { openInfoModal } from './infoModal.js';
import { loadClasses } from './classService.js';
import { reloadScheduleForClass } from './app.js';

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
      <button type="button" class="quick-menu-action" id="quickExamPlan">▦ <span>Plan</span></button>
      <button type="button" class="quick-menu-action quick-info-action" id="quickInfo" aria-label="Informasjon" title="Informasjon"><span class="quick-info-mark" aria-hidden="true">?</span></button>
      <button type="button" class="quick-menu-action quick-display-action" id="quickDisplay" title="Endre visning av lærer og rom" aria-label="Endre visning"><span class="quick-display-icon" aria-hidden="true">◉</span><span class="quick-display-label">Begge</span></button>
      <button type="button" class="quick-menu-action quick-class-action" id="quickClass" aria-haspopup="listbox" aria-expanded="false" title="Bytt klasse" hidden>♧ <span>Klasse</span>⌄</button>
      <button type="button" class="quick-menu-action" id="quickMore" aria-label="Mer" title="Mer">⋯</button>`;
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

    // Klassebytte bruker nøyaktig samme datakilde og reload-funksjon som Admin-panelet.
    // Nedtrekkslisten ligger utenfor den smale menyen, så den ikke klippes.
    const classButton = menu.querySelector('#quickClass');
    const classPopup = document.createElement('div');
    classPopup.id = 'quickClassPopup';
    classPopup.className = 'quick-class-popup';
    classPopup.hidden = true;
    classPopup.innerHTML = '<label for="quickClassSelect">Velg klasse</label><select id="quickClassSelect" aria-label="Velg klasse"></select><span class="quick-class-status" aria-live="polite"></span>';
    document.body.appendChild(classPopup);
    const classSelect = classPopup.querySelector('select');
    const classStatus = classPopup.querySelector('.quick-class-status');
    let classesLoaded = false;

    function hideClassPopup() {
        classPopup.hidden = true;
        classButton.setAttribute('aria-expanded', 'false');
    }
    function refreshTeacherControls() {
        classButton.hidden = !isTeacher();
        if (!isTeacher()) hideClassPopup();
    }
    function positionClassPopup() {
        const rect = classButton.getBoundingClientRect();
        const width = Math.min(240, window.innerWidth - 16);
        classPopup.style.width = width + 'px';
        classPopup.style.left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2)) + 'px';
        // Foretrekk under knappen; legg over hvis det ikke er plass.
        const height = classPopup.offsetHeight || 105;
        const below = rect.bottom + 8;
        classPopup.style.top = (below + height < window.innerHeight - 8 ? below : Math.max(8, rect.top - height - 8)) + 'px';
    }
    classButton.addEventListener('click', async () => {
        if (!isTeacher()) return;
        if (!classPopup.hidden) { hideClassPopup(); return; }
        classPopup.hidden = false;
        classButton.setAttribute('aria-expanded', 'true');
        classStatus.textContent = '';
        positionClassPopup();
        if (!classesLoaded) {
            classSelect.disabled = true;
            classStatus.textContent = 'Henter klasser …';
            try {
                const classes = await loadClasses();
                classSelect.replaceChildren();
                for (const item of classes) {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name || item.id;
                    classSelect.appendChild(option);
                }
                classesLoaded = true;
                classStatus.textContent = classes.length ? '' : 'Ingen klasser funnet';
            } catch (error) {
                console.error('Kunne ikke hente klasser:', error);
                classStatus.textContent = 'Kunne ikke hente klasser';
            } finally {
                classSelect.disabled = false;
            }
        }
        classSelect.value = localStorage.getItem('classId') || '';
        if (!classPopup.hidden) positionClassPopup();
    });
    classSelect.addEventListener('change', async () => {
        if (!isTeacher() || !classSelect.value) return;
        const newClassId = classSelect.value;
        if (newClassId === localStorage.getItem('classId')) { hideClassPopup(); return; }
        classSelect.disabled = true;
        classStatus.textContent = 'Bytter klasse …';
        try {
            await reloadScheduleForClass(newClassId);
            hideClassPopup();
            // Menyen forblir åpen, slik at læreren kan bytte igjen.
        } catch (error) {
            console.error('Kunne ikke bytte klasse:', error);
            classStatus.textContent = 'Kunne ikke bytte klasse';
        } finally {
            classSelect.disabled = false;
        }
    });
    window.addEventListener('resize', () => { if (!classPopup.hidden) positionClassPopup(); });
    refreshTeacherControls();

    const close = () => {
        hideClassPopup();
        document.body.classList.remove('quick-display-menu-open');
        menu.classList.remove('is-open');
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Åpne hurtigmeny');
        trigger.textContent = '☰';
    };
    const toggle = () => {
        const opening = !menu.classList.contains('is-open');
        refreshTeacherControls();
        if (!opening) hideClassPopup();
        document.body.classList.toggle('quick-display-menu-open', opening);
        menu.classList.toggle('is-open', opening);
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
        if (!trigger.contains(event.target) && !menu.contains(event.target) && !classPopup.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (!classPopup.hidden) hideClassPopup();
            else close();
        }
    });
}

// Litt tydeligere timeplan bak åpen hurtigmeny, uten å endre andre modaler.
const quickDisplayStyle = document.createElement('style');
quickDisplayStyle.textContent = `
  /* Lærermodus: diskret ramme, ikke rød bakgrunn. */
  #menuButton.teacher-mode.menu-button,
  #menuButton.teacher-mode.menu-button.is-open {
    background: #edf3fb !important;
    color: #963f46 !important;
    border: 2px solid #b7656a !important;
  }
  .quick-menu-actions .quick-class-action[hidden] { display:none !important; }
  .quick-class-popup[hidden] { display:none !important; }
  .quick-class-popup {
    position:fixed; z-index:1100; box-sizing:border-box;
    padding:12px; border-radius:12px; background:#f2f6fc;
    border:1px solid #cbd9e9; box-shadow:0 12px 32px rgba(15,23,42,.18);
    display:flex; flex-direction:column; gap:7px;
    font-size:13px; color:#334155;
  }
  .quick-class-popup label { font-size:12px; font-weight:600; }
  .quick-class-popup select {
    width:100%; min-height:35px; padding:6px 9px;
    border-radius:8px; border:1px solid #b9cbe1;
    background:#fff; color:#1e293b; font-size:14px;
  }
  .quick-class-status { font-size:11px; color:#64748b; }

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
