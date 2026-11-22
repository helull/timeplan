import {getTeacherLink,ensureInitialTeacherLink,openTeacherLinkDialog} from "./teacherScheduleLink.js";
import {loadTeacherSchedule, invalidateTeacherScheduleCache} from "./teacherSchedule.js";
import {
    loadStudentsBlockCourseMap
}
from "./studentBlockCourseService.js";


import {
    finishMagicLogin
}
from "./finishMagicLogin.js";

import { db }
from "./firebase.js";

import {
    loadAllTeacherHomework
}
from "./teacherHomeworkService.js";

import {
    loadTentamens
}
from "./tentamenService.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    loadAllHomework,
    loadAllExamFlags,
    loadAllBlockExams
}
from "./homeworkService.js";

/*
import {
    renderTeacherButton
}
from "./teacherPanel.js";
*/

import {
    isTeacher,
    removeTeacherMode,
    initializeTeacherMode,
    applyTeacherMode
}
from "./teacher.js";

import {
    openToolsPanel,
    openAdminPanel
}
from "./teacherPanel.js";

import {
    generateWeeks
}
from "./weekBuilder.js";

import {
    getCurrentSchoolPosition
}
from "./calendar.js";


import {
    hasStudent
}
from "./student.js";

import { studentExists } from "./studentService.js";

import {
    showRegister
}
from "./register.js";

import {
    loadSchedule
}
from "./scheduleService.js";

import {
    renderSchedule,
    renderHomework,
    updateHomeworkCard
}
from "./render.js";

let currentWeek = 0;
let currentDay = 0;

let startX = 0;
let startY = 0;

let overviewMode = false;
let sharedMaps = null;
let viewRequest = 0;

// Lagrede lekser oppdaterer bare berørte timekort, uten ny Firestore-lesing.
window.addEventListener("schedule:homework-saved", event => {
    if (!sharedMaps) return;
    const change = event.detail || {};
    if (change.kind === "student") {
        sharedMaps[0][`${change.lessonId}_${change.week}`] = {
            text: change.text || "", exam: !!change.exam
        };
    } else if (change.kind === "teacher") {
        const key = change.blockCourseId
            ? `block_${change.blockCourseId}_${change.week}_${change.weekday}_${change.startTime}`
            : `${change.classId}_${change.lessonId}_${change.week}`;
        sharedMaps[1][key] = {text:change.text || ""};
    } else return;
    updateHomeworkCard(change, sharedMaps[2]);
});


// Oppdater prøvemarkeringene etter vellykket lagring, uten å hente prøvene på nytt.
// Bevarer den eksisterende elevkontrollen og resten av oppstartslogikken.
let examRedrawPending = false;
window.addEventListener("schedule:exam-data-changed", (event) => {
    if (!sharedMaps) return;
    const change = event.detail || {};

    if (change.type === "exam") {
        const key = `${change.className}_${change.lessonId}_${change.week}`;
        if (change.exam) {
            sharedMaps[2][key] = {
                exam: true,
                teacher: !!change.teacher,
                subject: change.subject || ""
            };
        } else {
            delete sharedMaps[2][key];
        }
    } else if (change.type === "block-added" && change.exam) {
        if (!sharedMaps[3].some(item => item.id === change.exam.id)) {
            sharedMaps[3].push(change.exam);
        }
    } else if (change.type === "block-deleted") {
        const index = sharedMaps[3].findIndex(item => item.id === change.id);
        if (index !== -1) sharedMaps[3].splice(index, 1);
    } else {
        return;
    }

    if (examRedrawPending) return;
    examRedrawPending = true;
    queueMicrotask(async () => {
        examRedrawPending = false;
        try {
            await showScheduleView(currentScheduleView());
            render();
        } catch (error) {
            console.error("Kunne ikke oppdatere prøvemarkeringene", error);
        }
    });
});

export function currentScheduleView(){return isTeacher() ? (localStorage.getItem("scheduleView") || "class") : "class";}
export async function showScheduleView(view,force=false){
 const request=++viewRequest;
 if (!isTeacher()) view="class";
 if(view==="teacher") {
   const id=localStorage.getItem("teacherId");
   if (!id) {view="class";}
   else {
     if(force) invalidateTeacherScheduleCache();
     const record=await getTeacherLink(id);
     if(record?.link?.status!=="bekreftet") {view="class";}
     else {
     const data=await loadTeacherSchedule(id,force);
     if(request!==viewRequest)return;
     localStorage.setItem("scheduleView","teacher");
     renderSchedule({className:"",lessons:data.lessons},...sharedMaps,{teacherView:true});
     applyTeacherMode();
     window.dispatchEvent(new Event("schedule-view-changed"));
     return data;
     }
   }
 }
 const classId=localStorage.getItem("classId")||"1STA";
 const schedule=await loadSchedule(classId);
 if(request!==viewRequest)return;
 schedule.className=classId;
 localStorage.setItem("scheduleView","class");
 renderSchedule(schedule,...sharedMaps);
 if(isTeacher())applyTeacherMode();
 window.dispatchEvent(new Event("schedule-view-changed"));
}


initializeTeacherMode();

await finishMagicLogin();

const [tentamens, blockExams] = await Promise.all([
    loadTentamens(),
    loadAllBlockExams()
]);

console.log("Block exams fra Firestore:", blockExams);

const todayPosition =
    getCurrentSchoolPosition();

console.log(
    "School position",
    todayPosition
);

generateWeeks(
    todayPosition.week
);

currentWeek =
    todayPosition.week - 1;

console.log(
    "Genererte uker:",
    document.querySelectorAll(".week").length
);

const weeks =
    document.querySelectorAll(".week");

const dots =
    document.querySelectorAll(".dot");

currentDay =
    todayPosition.day;

function updateDots(){

    dots.forEach(
        x=>x.classList.remove(
            "active"
        )
    );

    dots[currentDay]
        ?.classList.add(
            "active"
        );
}

    console.log("før render");
    console.table({ ...localStorage });

function render(){
    weeks.forEach(
        (week,index)=>{

        week.classList.remove(
            "active",
            "overview",
            "preview-next",
            "preview-prev"
        );

        if(
            index===currentWeek
        ){
            week.classList.add(
                "active"
            );
        }

        const days =
            week.querySelector(
                ".days"
            );

        if(
            window.innerWidth >
            window.innerHeight
        ){

            days.style.transform =
                "none";

        }else{

            days.style.transform =
                `translateX(-${currentDay * 100}vw)`;
        }
    });

    updateDots();

}

function nextDay(){
    if(currentDay < 4){
        currentDay++;
        render();
    }
}

function previousDay(){
    if(currentDay > 0){
        currentDay--;
        render();
    }
}

// Uke- og dagsnavigasjon med responsiv draeffekt.
let weekTransitionBusy = false;
let swipeAllowed = false;
let swipeAxis = null;
let swipeOffset = 0;
let startTime = 0;
const WEEK_DURATION = 300;

function canNavigateFrom(target) {
    return target instanceof Element && !target.closest('.modal, .proveplan-overlay, .register-screen, button, input, textarea, select, [contenteditable="true"]');
}

function landscape() {
    return window.matchMedia('(orientation: landscape)').matches;
}

function activeDays() {
    return weeks[currentWeek]?.querySelector('.days');
}

function baseDayTransform() {
    return landscape() ? 'none' : `translateX(-${currentDay * 100}vw)`;
}

function dragDayTransform(dx) {
    return landscape()
        ? `translate3d(${dx}px,0,0)`
        : `translate3d(calc(-${currentDay * 100}vw + ${dx}px),0,0)`;
}

function clearSwipePreview() {
    const active = weeks[currentWeek];
    if (active) {
        active.style.transform = '';
        active.style.transition = '';
    }
    const days = activeDays();
    if (days) {
        days.style.transition = '';
        days.style.removeProperty('transform');
        days.style.transform = baseDayTransform();
    }
    swipeOffset = 0;
    swipeAxis = null;
}

function weekBadge(week) {
    const badge = document.createElement('div');
    badge.className = 'week-transition-number';
    badge.textContent = week.dataset.week || '';
    badge.setAttribute('aria-hidden', 'true');
    week.appendChild(badge);
    return badge;
}

function changeWeek(direction, initialOffset = 0) {
    if (weekTransitionBusy || !weeks.length) return;
    const previousIndex = currentWeek;
    const nextIndex = (currentWeek + direction + weeks.length) % weeks.length;
    if (nextIndex === previousIndex) { clearSwipePreview(); return; }
    const oldWeek = weeks[previousIndex];
    const newWeek = weeks[nextIndex];
    weekTransitionBusy = true;

    // Behold draposisjonen frem til animasjonen starter, så det ikke oppstår et rykk.
    const from = initialOffset || 0;
    oldWeek.style.transition = 'none';
    oldWeek.style.transform = `translate3d(0,${from}px,0)`;
    currentWeek = nextIndex;
    render();
    newWeek.classList.add('week-card-entering');
    oldWeek.classList.add('week-card-exiting');
    const oldNumber = weekBadge(oldWeek);
    const newNumber = weekBadge(newWeek);

    const cleanup = () => {
        oldWeek.style.transform = '';
        oldWeek.style.transition = '';
        oldWeek.classList.remove('week-card-exiting');
        newWeek.classList.remove('week-card-entering');
        oldNumber.remove();
        newNumber.remove();
        weekTransitionBusy = false;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !newWeek.animate) {
        cleanup();
        return;
    }
    const up = direction > 0;
    const distance = Math.max(110, window.innerHeight * .23);
    const oldEnd = up ? -distance : distance;
    const newStart = up ? distance : -distance;
    const duration = Math.max(230, WEEK_DURATION - Math.min(90, Math.abs(from) * .5));
    const timing = {duration, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards'};
    const oldAnimation = oldWeek.animate([
        {transform:`translate3d(0,${from}px,0)`, opacity:1},
        {transform:`translate3d(0,${oldEnd}px,0) scale(.985)`, opacity:.15}
    ], timing);
    const newAnimation = newWeek.animate([
        {transform:`translate3d(0,${newStart}px,0) scale(.985)`, opacity:.65},
        {transform:'translate3d(0,0,0) scale(1)', opacity:1}
    ], timing);
    const numberOldAnimation = oldNumber.animate([{opacity:0.8, transform:'translate(-50%,-42%) scale(.85)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}], {duration:duration*.4,fill:'forwards'});

    const numberNewAnimation = newNumber.animate([
    {
        opacity: 1,
        transform: 'translate(-50%,-42%) scale(1.12)',
        offset: 0
    },
    {
        opacity: 1,
        transform: 'translate(-50%,-50%) scale(1)',
        offset: 0.75
    },
    {
        opacity: 0,
        transform: 'translate(-50%,-55%) scale(.95)',
        offset: 1
    }
], timing);
    
    newAnimation.finished.then(() => {
        oldAnimation.cancel(); newAnimation.cancel();
        numberOldAnimation.cancel(); numberNewAnimation.cancel();
        cleanup();
    }).catch(cleanup);
}

// Museklikk fra PC-panelet: bytt uke uten overgangskort eller flytende ukenummer.
export function navigateWeekFromPanel(direction) {
    if (weekTransitionBusy || !weeks.length || !Number.isFinite(direction)) return false;
    const nextIndex = (currentWeek + (direction > 0 ? 1 : -1) + weeks.length) % weeks.length;
    if (nextIndex === currentWeek) return false;
    clearSwipePreview();
    currentWeek = nextIndex;
    render();
    document.dispatchEvent(new CustomEvent('schedule:week-changed', {
        detail: { week: weeks[currentWeek]?.dataset.week || '' }
    }));
    return true;
}

export function getDisplayedWeekNumber() {
    return weeks[currentWeek]?.dataset.week || '';
}

function nextWeek() { changeWeek(1); }
function previousWeek() { changeWeek(-1); }
function showWeekOverview() {}
function hideWeekOverview() { clearSwipePreview(); }

function snapBack(axis, offset) {
    const active = weeks[currentWeek];
    const days = activeDays();
    if (axis === 'y' && active) {
        active.style.transition = 'transform 180ms cubic-bezier(.22,1,.36,1)';
        active.style.transform = 'translate3d(0,0,0)';
        setTimeout(() => { if (!weekTransitionBusy) { active.style.transition=''; active.style.transform=''; } }, 190);
    } else if (axis === 'x' && days) {
        days.style.transition = 'transform 180ms cubic-bezier(.22,1,.36,1)';
        days.style.removeProperty('transform');
        days.style.setProperty('transform', baseDayTransform(), 'important');
        setTimeout(() => { days.style.transition=''; }, 190);
    }
}

document.addEventListener('touchstart', e => {
    if (!e.touches.length) return;
    swipeAllowed = !weekTransitionBusy && canNavigateFrom(e.target);
    swipeAxis = null;
    swipeOffset = 0;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = performance.now();
}, {passive:true});

document.addEventListener('touchmove', e => {
    if (!swipeAllowed || !e.touches.length) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!swipeAxis && Math.max(Math.abs(dx),Math.abs(dy)) > 10) {
        swipeAxis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : Math.abs(dy) > Math.abs(dx) * 1.15 ? 'y' : null;
    }
    if (swipeAxis === 'y') {
        const active = weeks[currentWeek];
        if (!active) return;
        swipeOffset = Math.max(-80, Math.min(80, dy * .23));
        active.style.transition = 'none';
        active.style.transform = `translate3d(0,${swipeOffset}px,0)`;
    } else if (swipeAxis === 'x') {
        const days = activeDays();
        if (!days) return;
        swipeOffset = Math.max(-70, Math.min(70, dx * .23));
        days.style.transition = 'none';
        days.style.setProperty('transform', dragDayTransform(swipeOffset), 'important');
    }
}, {passive:true});

document.addEventListener('touchend', e => {
    if (!swipeAllowed || !e.changedTouches.length) return;
    swipeAllowed = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const elapsed = Math.max(1, performance.now() - startTime);
    if (swipeAxis === 'x') {
        const offset = swipeOffset;
        const shouldSwitch = Math.abs(dx) > 50 || (Math.abs(dx) > 28 && elapsed < 230);
        if (shouldSwitch && ((dx < 0 && currentDay < 4) || (dx > 0 && currentDay > 0))) {
            const days = activeDays();
            if (days) { days.style.transition = 'transform 240ms cubic-bezier(.22,1,.36,1)'; }
            if (dx < 0) nextDay(); else previousDay();
            setTimeout(() => { if (days) days.style.transition = ''; }, 260);
        } else snapBack('x',offset);
    } else if (swipeAxis === 'y') {
        const offset = swipeOffset;
        const shouldSwitch = Math.abs(dy) > 110 || (Math.abs(dy) > 65 && elapsed < 260);
        if (shouldSwitch) changeWeek(dy < 0 ? 1 : -1, offset);
        else snapBack('y',offset);
    } else {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            if (dx < 0) nextDay(); else previousDay();
        } else if (Math.abs(dy) > 110) changeWeek(dy < 0 ? 1 : -1);
    }
    swipeAxis = null;
    swipeOffset = 0;
}, {passive:true});

document.addEventListener('touchcancel', () => {
    swipeAllowed = false;
    snapBack(swipeAxis, swipeOffset);
    swipeAxis = null;
    swipeOffset = 0;
}, {passive:true});

document.addEventListener(

    "keydown",

    e => {

        if (!canNavigateFrom(e.target)) return;

        if (e.key === "ArrowDown") {

            e.preventDefault();
            nextWeek();

        }

        else if (
            e.key === "ArrowUp"
        ) {

            e.preventDefault();
            previousWeek();

        }

    }

);

window.addEventListener(
    "resize",
    render
);

async function init(){

    const userType = localStorage.getItem("userType");
    const studentId = localStorage.getItem("studentId");
   
    if (userType === "teacher") {
        // Bruk sist valgte klasse; 1STA kun ved første lærerinnlogging.
        if (!localStorage.getItem("classId")) {
            localStorage.setItem("classId", "1STA");
        }
        initializeTeacherMode();
    }
    else if (!hasStudent() || !studentId) {
        // En ufullstendig lokal elevregistrering behandles som førstegangsbruk.
        localStorage.removeItem("studentId");
        localStorage.removeItem("studentName");
        localStorage.removeItem("classId");
        localStorage.removeItem("userType");
        await showRegister();
        return;
    }
    else {
        // Sjekk eksisterende elev én gang ved oppstart, ikke ved hver lagring.
        // Ved nettverksfeil må vi aldri tolke eleven som slettet.
        let exists;
        try {
            exists = await studentExists(studentId);
        } catch (error) {
            console.error("Kunne ikke kontrollere elevregistreringen", error);
            alert("Kunne ikke kontrollere elevregistreringen. Sjekk internettforbindelsen og prøv igjen.");
            return;
        }
        if (!exists) {
            localStorage.removeItem("studentId");
            localStorage.removeItem("studentName");
            localStorage.removeItem("classId");
            localStorage.removeItem("userType");
            alert("Elevregistreringen din er ikke lenger aktiv. Registrer deg på nytt for å bruke timeplanen.");
            await showRegister();
            return;
        }
    }

   
const classId =
    localStorage.getItem(
        "classId"
    );

const [homeworkMap,teacherHomeworkMap,examMap,studentBlockCourseMap] = await Promise.all([
 loadAllHomework(),loadAllTeacherHomework(),loadAllExamFlags(),loadStudentsBlockCourseMap()
]);
sharedMaps=[homeworkMap,teacherHomeworkMap,examMap,blockExams,tentamens,studentBlockCourseMap];
try {
  // Vis klassetimeplanen først, uansett om navnekoblingen mangler.
  await showScheduleView(currentScheduleView());
  if(isTeacher()) {
    const id=localStorage.getItem('teacherId');
    const record=await getTeacherLink(id);
    if(record&&!record.link?.status) {
      // Førstegangslærere uten sannsynlig treff får sitt eget registrerte navn.
      // Ved mulig treff utsettes navnevalg til etter første menyåpning.
      const result=await ensureInitialTeacherLink(id,record);
      if(result.needsChoice)sessionStorage.setItem('teacherLinkChoicePending:'+id,'1');
    }
  }
} catch(error){console.error('Lærervisning kunne ikke lastes',error);await showScheduleView('class');}

    render();

    var newValue = localStorage.getItem("showRooms") !== "false";
    document.querySelectorAll(".room").forEach(el =>  el.classList.toggle("roomInvisible",!newValue));

    newValue = localStorage.getItem("showTeacherNames") !== "false";
    document.querySelectorAll(".teacher").forEach(el =>  el.classList.toggle("roomInvisible",!newValue));
}

export async function reloadScheduleForClass(classId) {
 localStorage.setItem("classId",classId);
 if(!sharedMaps)return;
 await showScheduleView("class");
}


init();

document
    .getElementById("menuButton")
    ?.addEventListener(

        "click",

        () => {

            if (isTeacher()) {

                openAdminPanel();

            } else {

                openToolsPanel();

            }

        }

    );
