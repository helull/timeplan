const weeks = document.querySelectorAll(".week");
const dots = document.querySelectorAll(".dot");

let currentWeek = 0;
let currentDay = 0;

let startX = 0;
let startY = 0;

let overviewMode = false;

const savedWeek = localStorage.getItem("week");
const savedDay = localStorage.getItem("day");

if (savedWeek !== null) {
    currentWeek = parseInt(savedWeek);
}

if (savedDay !== null) {
    currentDay = parseInt(savedDay);
} else {

    const today = new Date().getDay();

    if (today >= 1 && today <= 5) {
        currentDay = today - 1;
    }
}

function updateDots() {

    dots.forEach(dot => dot.classList.remove("active"));

    if (dots[currentDay]) {
        dots[currentDay].classList.add("active");
    }
}

function render() {

    weeks.forEach((week, index) => {

        week.classList.toggle(
            "active",
            index === currentWeek
        );

        const days = week.querySelector(".days");

        if (!days) return;

        if (window.innerWidth > window.innerHeight) {

            days.style.transform = "none";

        } else {

            days.style.transform =
                `translateX(-${currentDay * 100}vw)`;
        }
    });

    updateDots();

    localStorage.setItem("week", currentWeek);
    localStorage.setItem("day", currentDay);
}

function nextDay() {

    if (currentDay < 4) {
        currentDay++;
        render();
    }
}

function previousDay() {

    if (currentDay > 0) {
        currentDay--;
        render();
    }
}

function nextWeek() {

    if (currentWeek < weeks.length - 1) {
        currentWeek++;
        render();
    }
}

function previousWeek() {

    if (currentWeek > 0) {
        currentWeek--;
        render();
    }
}

function showWeekOverview(direction) {

    if (overviewMode) return;

    overviewMode = true;

    weeks.forEach(week => {
        week.classList.remove(
            "overview",
            "preview-next",
            "preview-prev"
        );
    });

    const current = weeks[currentWeek];

    current.classList.add("overview");

    if (
        direction === "next" &&
        currentWeek < weeks.length - 1
    ) {
        weeks[currentWeek + 1]
            .classList.add("preview-next");
    }

    if (
        direction === "prev" &&
        currentWeek > 0
    ) {
        weeks[currentWeek - 1]
            .classList.add("preview-prev");
    }
}

function hideWeekOverview() {

    overviewMode = false;

    weeks.forEach(week => {

        week.classList.remove(
            "overview",
            "preview-next",
            "preview-prev"
        );
    });

    render();
}

document.addEventListener("touchstart", (e) => {

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

document.addEventListener("touchmove", (e) => {

    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;

    const dx = moveX - startX;
    const dy = moveY - startY;

    if (
        Math.abs(dy) > 40 &&
        Math.abs(dy) > Math.abs(dx) &&
        !overviewMode
    ) {

        if (dy < 0) {
            showWeekOverview("next");
        } else {
            showWeekOverview("prev");
        }
    }
});

document.addEventListener("touchend", (e) => {

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {

        hideWeekOverview();

        if (dx < -50) {
            nextDay();
        }

        if (dx > 50) {
            previousDay();
        }

    } else {

        if (dy < -80) {

            hideWeekOverview();
            nextWeek();

        } else if (dy > 80) {

            hideWeekOverview();
            previousWeek();

        } else {

            hideWeekOverview();
        }
    }
});

window.addEventListener("resize", render);

render();
