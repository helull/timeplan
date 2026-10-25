import {
    hasStudent
}
from "./student.js";

import {
    showRegister
}
from "./register.js";

import {
    loadSchedule,
    listenToHomework
}
from "./data.js";

import {
    renderSchedule,
    renderHomework
}
from "./render.js";

const weeks =
    document.querySelectorAll(".week");

const dots =
    document.querySelectorAll(".dot");

let currentWeek = 0;
let currentDay = 0;

let startX = 0;
let startY = 0;

let overviewMode = false;

const savedWeek =
    localStorage.getItem("week");

const savedDay =
    localStorage.getItem("day");

if(savedWeek !== null){
    currentWeek =
        parseInt(savedWeek);
}

if(savedDay !== null){
    currentDay =
        parseInt(savedDay);
}

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


localStorage.setItem(
    "studentId",
    `${name}_${selectedClass}`
);
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

            if(dy < -80)
                nextWeek();

            else if(
                dy > 80
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

    const schedule =
        await loadSchedule();

    renderSchedule(
        schedule
    );

    listenToHomework(
        renderHomework
    );

    if (!hasStudent()) {

    await showRegister();

} else {

    render();
}
}

init();
