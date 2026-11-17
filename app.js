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
    loginTeacher
}
from "./teacherLogin.js";

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
    renderHomework
}
from "./render.js";

let currentWeek = 0;
let currentDay = 0;

let startX = 0;
let startY = 0;

let overviewMode = false;

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

// Kortstokk-overgang. Bare visningen endres; uke-/dagnavigasjonen er den samme.
let weekTransitionBusy = false;
let swipeAllowed = false;
let verticalSwipe = false;
let swipeOffset = 0;
const WEEK_DURATION = 340;

function canNavigateFrom(target) {
    return !target.closest('.modal, .proveplan-overlay, .register-screen, button, input, textarea, select, [contenteditable="true"]');
}

function clearSwipePreview() {
    const week = weeks[currentWeek];
    if (week) {
        week.style.transform = '';
        week.style.transition = '';
    }
    swipeOffset = 0;
    verticalSwipe = false;
}

function changeWeek(direction) {
    if (weekTransitionBusy || !weeks.length) return;
    clearSwipePreview();
    const previousIndex = currentWeek;
    currentWeek = (currentWeek + direction + weeks.length) % weeks.length;
    if (currentWeek === previousIndex) { render(); return; }

    const oldWeek = weeks[previousIndex];
    const newWeek = weeks[currentWeek];
    weekTransitionBusy = true;

    // La den gamle uken være synlig mens den nye glir inn over den.
    oldWeek.classList.add('week-card-exiting');
    render();
    newWeek.classList.add('week-card-entering');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !newWeek.animate) {
        oldWeek.classList.remove('week-card-exiting');
        newWeek.classList.remove('week-card-entering');
        weekTransitionBusy = false;
        return;
    }

    const up = direction > 0;
    const oldAnimation = oldWeek.animate([
        {transform:'translateY(0) scale(1)', opacity:1},
        {transform:`translateY(${up ? '-16' : '16'}%) scale(.965)`, opacity:.25}
    ], {duration:WEEK_DURATION, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards'});
    const newAnimation = newWeek.animate([
        {transform:`translateY(${up ? '25' : '-25'}%) scale(.965)`, opacity:.72},
        {transform:'translateY(0) scale(1)', opacity:1}
    ], {duration:WEEK_DURATION, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards'});
    const finish = () => {
        oldAnimation.cancel();
        newAnimation.cancel();
        oldWeek.classList.remove('week-card-exiting');
        newWeek.classList.remove('week-card-entering');
        weekTransitionBusy = false;
    };
    newAnimation.finished.then(finish).catch(finish);
}

function nextWeek() { changeWeek(1); }
function previousWeek() { changeWeek(-1); }

// Behold de gamle funksjonsnavnene, men fjern miniatyrvisningen.
function showWeekOverview() {}
function hideWeekOverview() { clearSwipePreview(); }

document.addEventListener('touchstart', e => {
    if (!e.touches.length) return;
    swipeAllowed = !weekTransitionBusy && canNavigateFrom(e.target);
    verticalSwipe = false;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
}, {passive:true});

document.addEventListener('touchmove', e => {
    if (!swipeAllowed || !e.touches.length) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.25) {
        verticalSwipe = true;
        const active = weeks[currentWeek];
        if (!active) return;
        swipeOffset = Math.max(-65, Math.min(65, dy * .18));
        active.style.transition = 'none';
        active.style.transform = `translateY(${swipeOffset}px) scale(${1-Math.min(Math.abs(swipeOffset)/3000,.025)})`;
    }
}, {passive:true});

document.addEventListener('touchend', e => {
    if (!swipeAllowed || !e.changedTouches.length) return;
    swipeAllowed = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    clearSwipePreview();
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -50) nextDay();
        if (dx > 50) previousDay();
    } else {
        if (dy < -140) nextWeek();
        else if (dy > 140) previousWeek();
    }
}, {passive:true});

document.addEventListener('touchcancel', () => {
    swipeAllowed = false;
    clearSwipePreview();
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
        const classId = localStorage.setItem("classId", "1STA");
        initializeTeacherMode();
    }
    else if (!hasStudent()) {
        await showRegister();
        return;
    }

   
const classId =
    localStorage.getItem(
        "classId"
    );

const [
    schedule,
    homeworkMap,
    teacherHomeworkMap,
    examMap,
    studentBlockCourseMap
] = await Promise.all([
    loadSchedule(classId),
    loadAllHomework(),
    loadAllTeacherHomework(),
    loadAllExamFlags(),
    loadStudentsBlockCourseMap()
]);

schedule.className = classId;

renderSchedule(
    schedule,
    homeworkMap,
    teacherHomeworkMap,
    examMap,
    blockExams,
    tentamens,
    studentBlockCourseMap
);

if (isTeacher()) {
    applyTeacherMode();
}
    
    render();

    var newValue = localStorage.getItem("showRooms") !== "false";
    document.querySelectorAll(".room").forEach(el =>  el.classList.toggle("roomInvisible",!newValue));

    newValue = localStorage.getItem("showTeacherNames") !== "false";
    document.querySelectorAll(".teacher").forEach(el =>  el.classList.toggle("roomInvisible",!newValue));
}

export async function reloadScheduleForClass(classId) {
    localStorage.setItem("classId", classId);

    const [
        schedule,
        homeworkMap,
        teacherHomeworkMap,
        examMap,
        studentBlockCourseMap
    ] = await Promise.all([
        loadSchedule(classId),
        loadAllHomework(),
        loadAllTeacherHomework(),
        loadAllExamFlags(),
        loadStudentsBlockCourseMap()
    ]);

    schedule.className = classId;

    renderSchedule(
        schedule,
        homeworkMap,
        teacherHomeworkMap,
        examMap,
        blockExams,
        tentamens,
        studentBlockCourseMap
    );
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
