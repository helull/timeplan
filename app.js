import { db }
from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    renderTeacherButton
}
from "./teacherPanel.js";

import {
    loginTeacher
}
from "./teacherLogin.js";

import {
    openToolsPanel
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

let currentWeek = 1;
let currentDay = 0;

let startX = 0;
let startY = 0;

let overviewMode = false;

const todayPosition =
    getCurrentSchoolPosition();

console.log(
    "School position",
    todayPosition
);

generateWeeks(
    todayPosition.week
);

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

function nextWeek(){
    if(currentWeek < weeks.length-1){
        currentWeek++;
        render();
    }
}

function previousWeek(){
    if(currentWeek > 0){
        currentWeek--;
        render();
    }
}

function showWeekOverview(direction){

    if(overviewMode) return;

    overviewMode=true;

    weeks[currentWeek]
        .classList.add(
            "overview"
        );

    if(
        direction==="next" &&
        currentWeek <
        weeks.length-1
    ){

        weeks[currentWeek+1]
            .classList.add(
                "preview-next"
            );
    }

    if(
        direction==="prev" &&
        currentWeek>0
    ){

        weeks[currentWeek-1]
            .classList.add(
                "preview-prev"
            );
    }
}

function hideWeekOverview(){

    overviewMode=false;

    weeks.forEach(
        week=>{

        week.classList.remove(
            "overview",
            "preview-next",
            "preview-prev"
        );

    });

    render();
}

document.addEventListener(
    "touchstart",
    e=>{

        startX =
            e.touches[0].clientX;

        startY =
            e.touches[0].clientY;

    }
);

document.addEventListener(
    "touchmove",
    e=>{

        const dx =
            e.touches[0].clientX
            - startX;

        const dy =
            e.touches[0].clientY
            - startY;

        if(
            Math.abs(dy) > 40 &&
            Math.abs(dy) >
            Math.abs(dx) &&
            !overviewMode
        ){

            showWeekOverview(
                dy<0
                ? "next"
                : "prev"
            );

        }
    }
);

document.addEventListener(
    "touchend",
    e=>{

        const dx =
            e.changedTouches[0]
            .clientX - startX;

        const dy =
            e.changedTouches[0]
            .clientY - startY;

        if(
            Math.abs(dx) >
            Math.abs(dy)
        ){

            hideWeekOverview();

            if(dx < -50)
                nextDay();

            if(dx > 50)
                previousDay();

        }else{

            if(dy < -140)
                nextWeek();

            else if(
                dy > 140
            )
                previousWeek();

            hideWeekOverview();
        }
    }
);

window.addEventListener(
    "resize",
    render
);

async function init(){

    if (!hasStudent()) {

        await showRegister();
        return;
    }

const classId =
    localStorage.getItem(
        "classId"
    );

const schedule =
    await loadSchedule(
        classId
    );

    console.log("Schedule fra Firestore:", schedule);
    
    renderSchedule(
        schedule
    );

/*    listenToHomework(
        renderHomework
    ); */

    render();
    if (localStorage.getItem("teacherMode") === "true") {
        document.body.classList.add("teacher-mode");
    }
    renderTeacherButton();

if (
    localStorage.getItem(
        "teacherMode"
    ) === "true"
) {

    document.body.classList.add(
        "teacher-mode"
    );
}
}

init();

document
    .getElementById(
        "menuButton"
    )
    ?.addEventListener(

        "click",

        openToolsPanel

    );
