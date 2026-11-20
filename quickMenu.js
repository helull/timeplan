// Kompakt hurtigmeny. Bevarer app.js og alle eksisterende modalfunksjoner.
import { isTeacher } from './teacher.js';
import { openAdminPanel, openToolsPanel } from './teacherPanel.js';
import { openProveplan } from './proveplan.js';
import { openInfoModal } from './infoModal.js';
import { loadClasses } from './classService.js';
import { reloadScheduleForClass, showScheduleView, currentScheduleView, navigateWeekFromPanel, getDisplayedWeekNumber } from './app.js';
import {openTeacherLinkDialog, getTeacherLink} from './teacherScheduleLink.js';
import {db} from './firebase.js';
import {doc,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

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
      <button type="button" class="quick-menu-action quick-class-action" id="quickClass" aria-haspopup="listbox" aria-expanded="false" title="Bytt klasse" hidden>♧ <span class="quick-class-label">Klasse</span>⌄</button>
      <button type="button" class="quick-menu-action" id="quickMore" aria-label="Mer" title="Mer">⋯</button>`;
    trigger.insertAdjacentElement('afterend', menu);

    // Bare PC med presis peker, ikke telefon i landskap.
    function isDesktopTimeplanDevice() {
  // En PC med berøringsskjerm kan rapportere både pointer:none og hover:none.
  // Derfor kan disse egenskapene ikke brukes som absolutte PC-krav.
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return !mobile && window.innerWidth >= 1100;
}
    const desktopMode = () => isDesktopTimeplanDevice();
    const navPanel = document.createElement('aside');
    navPanel.id = 'quickDesktopWeekNav';
    navPanel.className = 'quick-desktop-week-nav';
    navPanel.hidden = true;
    navPanel.setAttribute('aria-label', 'Ukenavigasjon');
    navPanel.innerHTML = `
      <button type="button" class="quick-week-arrow" data-direction="-1" aria-label="Forrige uke" title="Forrige uke">▲</button>
      <div class="quick-week-counter" aria-live="polite"><span>UKE</span><strong id="quickDesktopWeekNumber">–</strong></div>
      <button type="button" class="quick-week-arrow" data-direction="1" aria-label="Neste uke" title="Neste uke">▼</button>`;
    document.body.appendChild(navPanel);
    const weekNumber = navPanel.querySelector('#quickDesktopWeekNumber');
    const syncWeekNumber = () => { weekNumber.textContent = String(getDisplayedWeekNumber() || '–'); };
    const syncNavPanel = () => {
        const visible = menu.classList.contains('is-open') && desktopMode();
        navPanel.hidden = !visible;
        if (visible) syncWeekNumber();
    };
    navPanel.addEventListener('click', event => {
        const button = event.target.closest('[data-direction]');
        if (!button) return;
        navigateWeekFromPanel(Number(button.dataset.direction));
        syncWeekNumber();
    });
    document.addEventListener('schedule:week-changed', syncWeekNumber);
    // Tastatur, sveip og klassebytte kan også endre aktiv uke.
    const weekObserver = new MutationObserver(() => {
        if (!navPanel.hidden) syncWeekNumber();
    });
    const weekRoot = document.querySelector('.weeks');
    if (weekRoot) weekObserver.observe(weekRoot, {subtree:true, attributes:true, attributeFilter:['class']});
    window.addEventListener('resize', syncNavPanel);


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
    const planButton = menu.querySelector('#quickExamPlan');
    const planLabel = planButton.querySelector('span');
    let linkedTeacherId = null;
    let linkedTeacherName = '';
    let linkLoad = null;
    let linkVersion = 0;

    function teacherInitials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return parts.length ? (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('nb-NO') : 'Lærer';
    }
    function updatePlanButton() {
        const teacherView = currentScheduleView() === 'teacher';
        const label = teacherView ? teacherInitials(linkedTeacherName) : 'Plan';
        planLabel.textContent = label;
        planButton.firstChild.textContent = teacherView ? '♙ ' : '▦ ';
        planButton.title = teacherView ? (linkedTeacherName ? linkedTeacherName + ' – endre timeplantilknytning' : 'Min timeplantilknytning') : 'Prøveplan for valgt klasse';
        planButton.setAttribute('aria-label', planButton.title);
    }
    async function refreshLinkedTeacherName(force = false) {
        const id = isTeacher() ? localStorage.getItem('teacherId') : null;
        if (!id) {
            ++linkVersion;
            linkedTeacherId = null;
            linkedTeacherName = '';
            linkLoad = null;
            updatePlanButton();
            return;
        }
        if (id !== linkedTeacherId || force) {
            linkedTeacherId = id;
            linkedTeacherName = '';
            linkLoad = null;
        }
        updatePlanButton();
        if (currentScheduleView() !== 'teacher') return;
        if (linkLoad) return linkLoad;
        const version = ++linkVersion;
        linkLoad = getTeacherLink(id).then(record => {
            if (version !== linkVersion || id !== linkedTeacherId) return;
            linkedTeacherName = record?.link?.status === 'bekreftet' ? (record.link.navn || '') : '';
            updatePlanButton();
        }).catch(error => {
            console.error('Kunne ikke hente bekreftet lærernavn:', error);
        }).finally(() => { if (version === linkVersion) linkLoad = null; });
        return linkLoad;
    }


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

    // Klassevelgeren er en integrert, utvidbar del av hurtigmenyen.
    const classButton = menu.querySelector('#quickClass');
    const classPanel = document.createElement('div');
    classPanel.id = 'quickClassPanel';
    classPanel.className = 'quick-class-panel';
    classPanel.hidden = true;
    classPanel.innerHTML = `
      <div class="quick-class-heading"><strong>Velg timeplan</strong><button type="button" class="quick-class-collapse" aria-label="Lukk klassevalg">⌃</button></div>
      <div id="quickClassChoices" class="quick-class-choices" role="group" aria-label="Tilgjengelige timeplaner"></div>
      <span class="quick-class-status" aria-live="polite"></span>`;
    menu.appendChild(classPanel);
    const classChoices = classPanel.querySelector('#quickClassChoices');
    const classStatus = classPanel.querySelector('.quick-class-status');
    let classesLoaded = false;
    let classItems = [];
    let changingClass = false;

    function hideClassPanel() {
        classPanel.hidden = true;
        classButton.setAttribute('aria-expanded', 'false');
    }
    function updateClassLabel() {
        const classId = currentScheduleView() === 'teacher' ? 'Som lærer' : (localStorage.getItem('classId') || '1STA');
        classButton.querySelector('.quick-class-label').textContent = classId;
        classButton.title = 'Bytt klasse (nå: ' + classId + ')';
        classButton.setAttribute('aria-label', 'Bytt klasse. Nåværende klasse: ' + classId);
    }
    function refreshTeacherControls() {
        classButton.hidden = !isTeacher();
        updateClassLabel();
        if (!isTeacher()) hideClassPanel();
    }
    function classCategory(id) {
        const key = String(id || '').toUpperCase();
        if (key.startsWith('1B')) return 'BA1';
        if (['2B', '2R', '2T'].some(prefix => key.startsWith(prefix))) return 'BA2';
        if (key.startsWith('1')) return 'ST1';
        if (key.startsWith('2')) return 'ST2';
        if (key.startsWith('3')) return 'ST3';
        return 'Andre';
    }
    function renderClassChoices() {
        const active = currentScheduleView() === 'teacher' ? '__teacher_view__' : localStorage.getItem('classId');
        classChoices.replaceChildren();
        function addChoice(item, parent, teacher = false) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'quick-class-choice' + (teacher ? ' is-teacher-choice' : '');
            button.textContent = teacher ? item.name : item.id;
            button.dataset.classId = item.id;
            button.title = item.id;
            if (item.id === active) {
                button.classList.add('is-selected');
                button.setAttribute('aria-current', 'true');
            }
            button.disabled = changingClass;
            parent.appendChild(button);
        }
        addChoice({id: '__teacher_view__', name: 'Som lærer'}, classChoices, true);
        for (const category of ['ST1', 'ST2', 'ST3', 'BA1', 'BA2']) {
            const items = classItems.filter(item => classCategory(item.id) === category)
                .sort((a, b) => a.id.localeCompare(b.id, 'nb', {numeric: true}));
            if (!items.length) continue;
            const section = document.createElement('section');
            section.className = 'quick-class-section';
            const heading = document.createElement('div');
            heading.className = 'quick-class-section-title';
            heading.textContent = category;
            const grid = document.createElement('div');
            grid.className = 'quick-class-section-grid';
            items.forEach(item => addChoice(item, grid));
            section.append(heading, grid);
            classChoices.appendChild(section);
        }
        if (classesLoaded && !changingClass && classItems.length) classStatus.textContent = '';
    }
    // Plasser klassepanelet under HOVEDmenyknappen på telefon i portrett.
    // På PC beholder panelet den vanlige forankringen i hurtigmenyen.
    function positionClassPanel() {
        if (!window.matchMedia('(max-width: 650px) and (orientation: portrait)').matches) {
            classPanel.style.removeProperty('left');
            classPanel.style.removeProperty('top');
            return;
        }
        const anchor = trigger.getBoundingClientRect();
        const panelWidth = Math.min(296, window.innerWidth - 12);
        const left = Math.max(6, Math.min(window.innerWidth - panelWidth - 6,
            anchor.left + anchor.width / 2 - panelWidth / 2));
        classPanel.style.left = left + 'px';
        classPanel.style.top = Math.round(anchor.bottom + 7) + 'px';
    }
    window.addEventListener('resize', () => { if (!classPanel.hidden) positionClassPanel(); });
    classButton.addEventListener('click', async () => {
        if (!isTeacher()) return;
        if (!classPanel.hidden) { hideClassPanel(); return; }
        positionClassPanel();
        classPanel.hidden = false;
        classButton.setAttribute('aria-expanded', 'true');
        classStatus.textContent = '';
        renderClassChoices();
        if (!classesLoaded) {
            classStatus.textContent = 'Henter klasser …';
            try {
                const classes = await loadClasses();
                classItems = classes.map(item => ({id: item.id, name: item.name || item.id}));
                classesLoaded = true;
                if (!classItems.length) classStatus.textContent = 'Ingen klasser funnet';
            } catch (error) {
                console.error('Kunne ikke hente klasser:', error);
                classStatus.textContent = 'Kunne ikke hente klasser';
            }
            renderClassChoices();
        }
    });
    classPanel.querySelector('.quick-class-collapse').addEventListener('click', hideClassPanel);
    classChoices.addEventListener('click', async event => {
        const button = event.target.closest('button[data-class-id]');
        if (!button || changingClass || !isTeacher()) return;
        const newClassId = button.dataset.classId;
        if ((newClassId === '__teacher_view__' && currentScheduleView() === 'teacher') ||
            (newClassId === localStorage.getItem('classId') && currentScheduleView() === 'class')) {
            hideClassPanel();
            return;
        }
        changingClass = true;
        classStatus.textContent = 'Bytter timeplan …';
        renderClassChoices();
        try {
            if (newClassId === '__teacher_view__') {
                const data=await showScheduleView('teacher');
                if(currentScheduleView()==='teacher' && data?.lessons?.length===0 && !sessionStorage.getItem('emptyTeacherScheduleInfo:'+localStorage.getItem('teacherId'))) {
                    sessionStorage.setItem('emptyTeacherScheduleInfo:'+localStorage.getItem('teacherId'),'1');
                    const message=document.createElement('div');
                    message.id='emptyTeacherScheduleInfo';message.className='modal';
                    message.style.cssText='position:fixed;inset:0;z-index:2700;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.4);padding:16px;box-sizing:border-box';
                    const box=document.createElement('div');box.style.cssText='max-width:360px;width:100%;padding:20px;border-radius:14px;background:white;color:#172033;box-shadow:0 12px 36px #0003';
                    const h=document.createElement('h2');h.textContent='Ingen undervisning funnet';h.style.margin='0 0 10px';
                    const desc=document.createElement('p');desc.textContent='Vi finner foreløpig ingen undervisning knyttet til deg. Velg en klasse og opprett blokkfag, eller kontroller lærernavnet ditt.';
                    const ok=document.createElement('button');ok.textContent='Forstått';ok.type='button';ok.style.cssText='display:block;margin-left:auto;padding:8px 15px;border-radius:8px;cursor:pointer';ok.onclick=()=>message.remove();
                    box.append(h,desc,ok);message.append(box);document.body.append(message);
                }
            }
            else await reloadScheduleForClass(newClassId);
            updatePlanButton();
            await refreshLinkedTeacherName();
            updateClassLabel();
            hideClassPanel();
        } catch (error) {
            console.error('Kunne ikke bytte klasse:', error);
            classStatus.textContent = 'Kunne ikke bytte timeplan';
        } finally {
            changingClass = false;
            if (!classPanel.hidden) renderClassChoices();
        }
    });
    window.addEventListener('schedule-view-changed', () => { updateClassLabel(); updatePlanButton(); refreshLinkedTeacherName(); });
    refreshTeacherControls();
    updatePlanButton();
    refreshLinkedTeacherName();

    const close = () => {
        hideClassPanel();
        document.body.classList.remove('quick-display-menu-open');
        menu.classList.remove('is-open');
        syncNavPanel();
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Åpne hurtigmeny');
        trigger.textContent = '☰';
    };
    const toggle = () => {
        const opening = !menu.classList.contains('is-open');
        refreshTeacherControls();
        refreshLinkedTeacherName();
        if (!opening) hideClassPanel();
        document.body.classList.toggle('quick-display-menu-open', opening);
        menu.classList.toggle('is-open', opening);
        syncNavPanel();
        trigger.classList.toggle('is-open', opening);
        trigger.setAttribute('aria-expanded', String(opening));
        trigger.setAttribute('aria-label', opening ? 'Lukk hurtigmeny' : 'Åpne hurtigmeny');
        trigger.textContent = opening ? '×' : '☰';
    };

    // Velkomstinformasjon ved første menyåpning, lagret på lærerprofilen.
    let welcomeBusy=false;
    let welcomeDoneThisPage=false;
    async function firstMenuWelcome() {
        if(!isTeacher()||welcomeBusy||welcomeDoneThisPage)return;
        const id=localStorage.getItem('teacherId');
        if(!id)return;
        welcomeBusy=true;
        try {
            const record=await getTeacherLink(id);
            if(!record)return;
            if(record.profile?.menyVelkomstVist===true){
                welcomeDoneThisPage=true;
                if(sessionStorage.getItem('teacherLinkChoicePending:'+id)==='1') {
                    sessionStorage.removeItem('teacherLinkChoicePending:'+id);
                    await openTeacherLinkDialog({onSaved:async()=>{await refreshLinkedTeacherName(true);}});
                }
                return;
            }
            if(document.getElementById('teacherMenuWelcome'))return;
            const backdrop=document.createElement('div');
            backdrop.id='teacherMenuWelcome';backdrop.className='modal';
            backdrop.style.cssText='position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.42);padding:14px;box-sizing:border-box';
            const panel=document.createElement('div');
            panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','teacherMenuWelcomeTitle');
            panel.style.cssText='background:#fff;color:#172033;border-radius:15px;padding:20px;width:100%;max-width:390px;box-sizing:border-box;box-shadow:0 15px 40px #0003;font:inherit';
            panel.innerHTML=`<h2 id="teacherMenuWelcomeTitle" style="margin:0 0 10px;font-size:19px">Visste du dette?</h2>
              <p style="margin:0 0 12px">Som lærer kan du:</p>
              <ul style="margin:0 0 14px;padding-left:21px;line-height:1.55">
                <li>Se din egen timeplan under <strong>«Som lærer»</strong>.</li>
                <li><strong>Opprette blokkfag</strong> ved å velge klasse og blokkøkt.</li>
                <li><strong>Registrere prøver</strong> for klassene.</li>
                <li><strong>Gi lekser</strong> som elevene kan se.</li>
              </ul><p style="font-size:12px;color:#64748b;margin:0 0 14px">Du finner funksjonene i menyen.</p>`;
            const footer=document.createElement('div');footer.style.cssText='display:flex;justify-content:flex-end';
            const ok=document.createElement('button');ok.type='button';ok.textContent='Forstått';
            ok.style.cssText='border:0;border-radius:9px;background:#1d4ed8;color:white;padding:9px 16px;font:inherit;cursor:pointer';
            footer.append(ok);panel.append(footer);backdrop.append(panel);document.body.append(backdrop);ok.focus();
            const dismiss=async()=>{
                if(ok.disabled)return;
                ok.disabled=true;
                try {
                    await updateDoc(doc(db,'teachers',id),{menyVelkomstVist:true,menyVelkomstVistDato:serverTimestamp()});
                    welcomeDoneThisPage=true;
                    backdrop.remove();
                    // Menyen er fortsatt åpen. Eventuelt navnevalg kommer etterpå.
                    if(sessionStorage.getItem('teacherLinkChoicePending:'+id)==='1') {
                        sessionStorage.removeItem('teacherLinkChoicePending:'+id);
                        await openTeacherLinkDialog({onSaved:async()=>{await refreshLinkedTeacherName(true);}});
                    }
                } catch(error) {
                    console.error('Kunne ikke lagre velkomstbekreftelse',error);
                    ok.disabled=false;
                    let err=panel.querySelector('.welcome-error');
                    if(!err){err=document.createElement('p');err.className='welcome-error';err.style.color='#b91c1c';footer.before(err);}
                    err.textContent='Kunne ikke lagre bekreftelsen. Prøv igjen.';
                }
            };
            ok.addEventListener('click',dismiss);
        } catch(error) {console.error('Kunne ikke vise lærerintroduksjon',error);}
        finally {welcomeBusy=false;}
    }
    // Capture hindrer app.js sin gamle klikklytter i å åpne modal direkte.
    trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggle();
        if(menu.classList.contains('is-open'))void firstMenuWelcome();
    }, true);

    planButton.addEventListener('click', async () => {
        const teacherView = currentScheduleView() === 'teacher';
        close();
        if (!teacherView) { openProveplan(); return; }
        try {
            await openTeacherLinkDialog({force: true, onSaved: async status => {
                await showScheduleView(status === 'bekreftet' ? 'teacher' : 'class', true);
                await refreshLinkedTeacherName(true);
            }});
        } catch (error) {
            console.error('Kunne ikke åpne lærertilknytning:', error);
            alert('Kunne ikke åpne lærertilknytningen.');
        }
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
        if (!trigger.contains(event.target) && !menu.contains(event.target) && !classPanel.contains(event.target) && !navPanel.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (!classPanel.hidden) hideClassPanel();
            else close();
        }
    });
}

// Litt tydeligere timeplan bak åpen hurtigmeny, uten å endre andre modaler.
const quickDisplayStyle = document.createElement('style');
quickDisplayStyle.textContent = `
  .quick-desktop-week-nav[hidden] { display:none!important; }
  .quick-desktop-week-nav {
    position:fixed; right:8px; top:50%; transform:translateY(-50%);
    z-index:325; width:62px; box-sizing:border-box;
    display:flex; flex-direction:column; align-items:center; gap:7px;
    padding:9px 7px; border-radius:15px;
    background:rgba(235,242,251,.78); border:1px solid rgba(120,145,175,.35);
    box-shadow:0 5px 18px rgba(30,55,85,.11); backdrop-filter:blur(6px);
  }
  .quick-week-arrow {
    width:46px; height:43px; margin:0; padding:0; border-radius:10px;
    border:1px solid #cad7e8; background:rgba(255,255,255,.82);
    color:#365577; font-size:21px; cursor:pointer;
  }
  .quick-week-arrow:hover { background:#fff; color:#153e75; }
  .quick-week-arrow:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
  .quick-week-counter { display:flex; flex-direction:column; align-items:center; gap:1px; color:#334155; }
  .quick-week-counter span { font-size:9px; font-weight:750; letter-spacing:.8px; }
  .quick-week-counter strong { font-size:25px; line-height:28px; font-variant-numeric:tabular-nums; }
  /* Lærermodus: diskret ramme, ikke rød bakgrunn. */
  #menuButton.teacher-mode.menu-button,
  #menuButton.teacher-mode.menu-button.is-open {
    background: #edf3fb !important;
    color: #963f46 !important;
    border: 2px solid #b7656a !important;
  }
  .quick-menu-actions .quick-class-action[hidden] { display:none !important; }
  .quick-class-panel[hidden] { display:none !important; }
  .quick-menu-actions { box-sizing:border-box; }
  .quick-class-panel {
    position:absolute; right:0; top:calc(100% + 7px);
    width:min(296px, calc(100vw - 12px)); box-sizing:border-box;
    padding:3px; border:1px solid #cbd9e9; border-radius:14px;
    background:#f2f6fc; box-shadow:0 12px 32px rgba(15,23,42,.18);
    display:flex; flex-direction:column; gap:2px; color:#334155;
    transform-origin:top right; animation:quickClassSlide .22s cubic-bezier(.22,1,.36,1);
  }
  /* PC: litt romsligere valg. Telefon portrett: panel under hovedmenyknappen. */
  @media (min-width: 651px) and (hover: hover) and (pointer: fine) {
    .quick-class-panel { width:min(360px, calc(100vw - 20px)); }
    .quick-class-section-grid > .quick-class-choice { font-size:10px!important; }
  }
  @media (max-width: 650px) and (orientation: portrait) {
    .quick-class-panel {
      position:fixed!important; right:auto!important;
      width:min(296px, calc(100vw - 12px))!important;
      max-width:calc(100vw - 12px)!important;
      z-index:10000;
    }
  }
  @keyframes quickClassSlide { from { opacity:0; transform:translateY(-8px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
  .quick-class-heading { display:flex; align-items:center; justify-content:space-between; font-size:13px; }
  .quick-class-collapse { border:0; background:transparent; color:#475569; cursor:pointer; font-size:20px; padding:0 7px; }
  .quick-class-choices { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); grid-auto-rows:min-content; align-content:start; align-items:start; column-gap:2px; row-gap:2px; overflow:visible; padding:0; }
  .quick-class-section { display:flex; flex-direction:column; justify-content:flex-start; align-self:start; gap:2px; min-width:0; }
  .quick-class-section-title { font-size:10px; line-height:12px; font-weight:750; letter-spacing:0; color:#64748b; text-align:center; }
  .quick-class-section-grid { display:flex; flex-direction:column; align-items:stretch; justify-content:flex-start; gap:2px; min-width:0; }
  .quick-class-section-grid > .quick-class-choice {
    box-sizing:border-box!important; display:block!important; width:100%!important;
    height:20px!important; min-height:20px!important; max-height:20px!important;
    margin:0!important; padding:0 1px!important; flex:0 0 20px!important;
    border:1px solid #dbe3ef; border-radius:5px; background:white; color:#334155;
    font-family:inherit; font-size:9px!important; line-height:18px!important;
    letter-spacing:-.15px; white-space:nowrap; font-weight:650;
    text-align:center; cursor:pointer; overflow:hidden; text-overflow:clip;
  }
  .quick-class-choice { min-width:0; }

  .quick-class-choices > .quick-class-choice.is-teacher-choice { grid-column:1 / -1; flex-shrink:0; align-self:stretch; min-height:21px; background:#e6f2ed; border-color:#bad9cb; color:#245b45; font-size:11px; }
  .quick-class-choice:hover { background:#e5efff; }
  .quick-class-choice.is-selected { background:#dceaff; border-color:#6296e4; color:#1d4ed8; }
  .quick-class-choice.is-teacher-choice.is-selected { background:#cbe7d9; border-color:#65ab8a; color:#18583c; }
  .quick-class-choice:focus-visible { outline:2px solid #2563eb; outline-offset:1px; }
  .quick-class-status { font-size:11px; color:#64748b; }
  @media(prefers-reduced-motion:reduce) { .quick-class-panel { animation:none; } }

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
