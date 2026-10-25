const weeks = document.querySelectorAll(".week");
const dots = document.querySelectorAll(".dot");

let currentWeek = 0;
let currentDay = 0;

let startX = 0;
let startY = 0;

let overviewMode = false;

/* ==========================
   LASTE LAGRET POSISJON
========================== */

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

/* ==========================
   DAGINDIKATORER
========================== */

function updateDots() {

    dots.forEach(dot =>
        dot.classList.remove("active")
    );

    if (dots[currentDay]) {
        dots[currentDay].classList.add("active");
    }
}

/* ==========================
   RENDER
========================== */

function render() {

    weeks.forEach((week, index) => {

        week.classList.remove(
            "active",
            "overview",
            "preview-next",
            "preview-prev"
        );

        week.style.visibility = "";
        week.style.opacity = "";

        if (index === currentWeek) {
            week.classList.add("active");
        }

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

    localStorage.setItem(
        "week",
        currentWeek
    );

    localStorage.setItem(
        "day",
        currentDay
    );
}

/* ==========================
   DAGNAVIGASJON
========================== */

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

/* ==========================
   UKENAVIGASJON
========================== */

function nextWeek() {

    if (currentWeek >= weeks.length - 1) {
        return;
    }

    currentWeek++;
    render();
}

function previousWeek() {

    if (currentWeek <= 0) {
        return;
    }

    currentWeek--;
    render();
}

/* ==========================
   UKEOVERSIKT
========================== */

function showWeekOverview(direction) {

    if (overviewMode) return;

    overviewMode = true;

    const current = weeks[currentWeek];

    current.classList.add("overview");

    if (
        direction === "next" &&
        currentWeek < weeks.length - 1
    ) {

        const next =
            weeks[currentWeek + 1];

        next.classList.add(
            "preview-next"
        );

        next.style.visibility =
            "visible";

        next.style.opacity =
            ".45";
    }

    if (
        direction === "prev" &&
        currentWeek > 0
    ) {

        const prev =
            weeks[currentWeek - 1];

        prev.classList.add(
            "preview-prev"
        );

        prev.style.visibility =
            "visible";

        prev.style.opacity =
            ".45";
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

        week.style.visibility = "";
        week.style.opacity = "";
    });

    render();
}

/* ==========================
   TOUCH START
========================== */

document.addEventListener(
    "touchstart",
    (e) => {

        startX =
            e.touches[0].clientX;

        startY =
            e.touches[0].clientY;
    }
);

/* ==========================
   TOUCH MOVE
========================== */

document.addEventListener(
    "touchmove",
    (e) => {

        const moveX =
            e.touches[0].clientX;

        const moveY =
            e.touches[0].clientY;

        const dx =
            moveX - startX;

        const dy =
            moveY - startY;

        if (
            Math.abs(dy) > 40 &&
            Math.abs(dy) >
                Math.abs(dx) &&
            !overviewMode
        ) {

            if (dy < 0) {

                showWeekOverview(
                    "next"
                );

            } else {

                showWeekOverview(
                    "prev"
                );
            }
        }
    }
);

/* ==========================
   TOUCH END
========================== */

document.addEventListener(
    "touchend",
    (e) => {

        const endX =
            e.changedTouches[0].clientX;

        const endY =
            e.changedTouches[0].clientY;

        const dx =
            endX - startX;

        const dy =
            endY - startY;

        if (
            Math.abs(dx) >
            Math.abs(dy)
        ) {

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

            } else if (
                dy > 80
            ) {

                hideWeekOverview();
                previousWeek();

            } else {

                hideWeekOverview();
            }
        }
    }
);

/* ==========================
   RESIZE
========================== */

window.addEventListener(
    "resize",
    render
);

/* ==========================
   START
========================== */

render();
