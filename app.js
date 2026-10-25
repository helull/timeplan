const weeks = document.querySelectorAll(".week");
const dots = document.querySelectorAll(".dot");

let currentWeek = 0;
let currentDay = 0;

let startX = 0;
let startY = 0;

const savedWeek = localStorage.getItem("week");
const savedDay = localStorage.getItem("day");

if(savedWeek !== null){
    currentWeek = parseInt(savedWeek);
}

if(savedDay !== null){
    currentDay = parseInt(savedDay);
}else{

    const today = new Date().getDay();

    if(today >= 1 && today <= 5){
        currentDay = today - 1;
    }
}

function updateDots(){

    dots.forEach(dot => dot.classList.remove("active"));

    if(dots[currentDay]){
        dots[currentDay].classList.add("active");
    }
}

function render(){

    weeks.forEach((week, index)=>{

        week.classList.toggle(
            "active",
            index === currentWeek
        );

        const days = week.querySelector(".days");

        if(window.innerWidth > window.innerHeight){
            days.style.transform = "none";
        }else{
            days.style.transform =
                `translateX(-${currentDay * 100}vw)`;
        }
    });

    updateDots();

    localStorage.setItem("week", currentWeek);
    localStorage.setItem("day", currentDay);
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

    if(currentWeek < weeks.length - 1){
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

document.addEventListener("touchstart",(e)=>{

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

});

document.addEventListener("touchend",(e)=>{

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const dx = endX - startX;
    const dy = endY - startY;

    if(Math.abs(dx) > Math.abs(dy)){

        if(dx < -50){
            nextDay();
        }

        if(dx > 50){
            previousDay();
        }

    }else{

        if(dy < -50){
            nextWeek();
        }

        if(dy > 50){
            previousWeek();
        }
    }
});

window.addEventListener("resize", render);

render();