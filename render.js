import {
    openHomeworkModal
}
    
from "./homeworkModal.js";

import {
    isTeacher
}
from "./teacher.js";

import {
    loadHolidays,
    removeDayHoliday,
    removeWeekHoliday
}
from "./holidayService.js";

import {
    getSubjectColor
}
from "./colors.js";

const holidays =
    await loadHolidays();

export function renderSchedule(
    schedule,
    homeworkMap = {},
    examMap = {}
) {

    const weeks =
        document.querySelectorAll(
            ".week"
        );

    weeks.forEach(week => {

        const weekNo =
            Number(
                week.dataset.week
            );

        const days =
            week.querySelectorAll(
                ".day"
            );

        days.forEach(
            (day, index) => {

                const weekday =
                    index + 1;

                const dayName = [
                    "Mandag",
                    "Tirsdag",
                    "Onsdag",
                    "Torsdag",
                    "Fredag"
                ][index];

                const isWeekHoliday =
                    holidays.some(
                        holiday =>
                            holiday.type === "week" &&
                            holiday.week === weekNo
                    );

                const isDayHoliday =
                    holidays.some(
                        holiday =>
                            holiday.type === "day" &&
                            holiday.week === weekNo &&
                            holiday.weekday === weekday
                    );

                const lessons =
                    schedule.lessons
                        .filter(
                            lesson =>
                                lesson.weekday ===
                                weekday
                        )
                        .sort(
                            (a, b) =>
                                a.start.localeCompare(
                                    b.start
                                )
                        );

                const startsLate =
                    lessons.length > 0 &&
                    lessons[0].start !== "08:15";

                day.innerHTML = `

                    <div class="header">

                        <h1>
                            ${dayName}
                        </h1>

                        <div class="week-number">
                            UKE ${weekNo}
                        </div>

                    </div>

                    ${
                        startsLate
                        ?
                        `
                        <div class="late-start">
                            ⋯ ⋯
                        </div>
                        `
                        :
                        ""
                    }

                `;

                if (isWeekHoliday) {

                    day.innerHTML += `

                        <div class="lesson holiday-card">

                            <div class="subject">
                                FRI DENNE UKE
                            </div>

                            <button
                                class="homework-button delete-week-holiday"
                                data-week="${weekNo}"
                                disabled>

                                ✕

                            </button>

                        </div>

                    `;

                    return;
                }

                if (isDayHoliday) {

                    day.innerHTML += `

                        <div class="lesson dayoff-card">

                            <div class="subject">
                                IKKE UNDERVISNING IDAG!
                            </div>

                            <button
                                class="homework-button delete-day-holiday"
                                data-week="${weekNo}"
                                data-weekday="${weekday}"
                                disabled>

                                ✕

                            </button>

                        </div>

                    `;

                    return;
                }

                lessons.forEach(
                    lesson => {

                        const duration =

                            (
                                parseInt(
                                    lesson.end.split(":")[0]
                                ) * 60 +

                                parseInt(
                                    lesson.end.split(":")[1]
                                )

                            )

                            -

                            (
                                parseInt(
                                    lesson.start.split(":")[0]
                                ) * 60 +

                                parseInt(
                                    lesson.start.split(":")[1]
                                )

                            );

                        const durationClass =

                            duration <= 45
                                ? "lesson-short"
                                : "lesson-long";

                        const lessonData =
                            homeworkMap[
                                `${lesson.lessonId}_${weekNo}`
                            ];

                        const isExam =

                            examMap[
                                `${lesson.lessonId}_${weekNo}`
                            ] === true;

                        let homework = "";

                        if (
                            typeof lessonData ===
                            "string"
                        ) {

                            homework =
                                lessonData;

                        } else if (
                            lessonData
                        ) {

                            homework =
                                lessonData.text || "";

                        }

                        const showTeacherNames =
                            localStorage.getItem(
                                "showTeacherNames"
                            ) === "true";

                        const showRooms =
                            localStorage.getItem(
                                "showRooms"
                            ) === "true";

                        day.innerHTML += `

                            <div class="
                                lesson
                                ${durationClass}
                                ${getSubjectColor(
                                    lesson.subject
                                )}
                                ${isExam ? "exam-lesson" : ""}
                            ">

                                <div class="lesson-top">

                                    <div class="subject">
                                        ${lesson.subject}
                                    </div>

                                    <div class="time">
                                        ${lesson.start}
                                        -
                                        ${lesson.end}
                                    </div>

                                </div>

                                <div class="room-teacher">

                                    ${
                                        showRooms
                                        ?
                                        `
                                        <div class="room">
                                            ${lesson.roomName || ""}
                                        </div>
                                        `
                                        :
                                        ""
                                    }

                                    ${
                                        showTeacherNames
                                        ?
                                        `
                                        <div class="teacher">
                                            ${lesson.teacherName || ""}
                                        </div>
                                        `
                                        :
                                        ""
                                    }

                                </div>

                                <button
                                    class="homework-button"
                                    data-lesson="${lesson.lessonId}"
                                    data-week="${weekNo}">

                                    📝

                                </button>

                                ${
                                    homework
                                    ?
                                    `
                                    <div class="lesson-homework">
                                        ${homework}
                                    </div>
                                    `
                                    :
                                    ""
                                }

                            </div>

                        `;
                    }
                );
            }
        );
    });

    /* Lekseknapper */

    document
        .querySelectorAll(
            ".homework-button:not(.delete-week-holiday):not(.delete-day-holiday)"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        openHomeworkModal(

                            button.dataset.lesson,

                            Number(
                                button.dataset.week
                            )

                        );

                    };

            }
        );

    /* Slett friuke */

    document
        .querySelectorAll(
            ".delete-week-holiday"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                        await removeWeekHoliday(

                            Number(
                                button.dataset.week
                            )

                        );

                        location.reload();

                    };

            }
        );

    /* Slett fridag */

    document
        .querySelectorAll(
            ".delete-day-holiday"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                        await removeDayHoliday(

                            Number(
                                button.dataset.week
                            ),

                            Number(
                                button.dataset.weekday
                            )

                        );

                        location.reload();

                    };

            }
        );
}

export function renderHomework(homework) {

    document
        .querySelectorAll(
            ".homework-card"
        )
        .forEach(
            card => card.remove()
        );

    homework.forEach(item => {

        const selector =

            `.week[data-week="${item.week}"]
             .day[data-day="${item.weekday}"]`;

        const day =
            document.querySelector(
                selector
            );

        if (!day) return;

        const card =
            document.createElement(
                "div"
            );

        card.className =

            "lesson social homework-card";

        card.innerHTML = `

            <div
                class="subject">

                📝 ${item.title}

            </div>

            <div
                class="homework">

                ${item.description}

            </div>

        `;

        day.appendChild(card);
    });
}
