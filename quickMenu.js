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
      <button type="button" class="quick-menu-action" id="quickMore">⋯ <span>Mer</span></button>`;
    trigger.insertAdjacentElement('afterend', menu);

    const close = () => {
        menu.classList.remove('is-open');
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Åpne hurtigmeny');
        trigger.textContent = '☰';
    };
    const toggle = () => {
        const opening = !menu.classList.contains('is-open');
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
        if (!trigger.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
    });
}
