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
    examMap = {},
    blockExams = []
) {
    
    console.log("blockExams:", blockExams);
    console.log("schedule er", schedule)
    
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
                            •••
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
                                class="homework-button delete-week-holiday teacher-only"
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
                                class="homework-button delete-day-holiday teacher-only"
                                data-week="${weekNo}"
                                data-weekday="${weekday}"
                                disabled>

                                ✕

                            </button>

                        </div>

                    `;

                    return;
                }

                let lunchRendered = false;
                lessons.forEach(
                    lesson => {
                        if (
                            !lunchRendered &&
                            lesson.start >= "12:00"
                        ) {
                            day.innerHTML += `
                                <div class="lunch-break">
                                    •••
                                </div>
                            `;
                            lunchRendered = true;
                        }

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

                        console.log("${schedule.className}_${lesson.lessonId}_${weekNo} er", schedule.className, lesson.lessonId, weekNo);
                        const examData =
                            examMap[
                                `${schedule.className}_${lesson.lessonId}_${weekNo}`
                            ];

                        const isExam =
                            examData?.exam ?? false;
                        
                        const grade = `VG${schedule.className.charAt(0)}`;

                        const blockExam =
                            blockExams.find(
                                exam =>
                                    exam.week === weekNo &&
                                    exam.day === weekday &&
                                    exam.grade === grade
                            );

                        const isBlockExam = !!blockExam;
                        const hasExam =isExam || isBlockExam;
                        
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
                                ${hasExam ? "exam-lesson" : ""}
                            ">

                                <div class="lesson-top">

                                    <div class="subject">
    ${lesson.subject}
</div>

${
    isBlockExam
    ? `
    <div class="exam-title">
        📝 ${blockExam.title}
    </div>
    `
    : ""
}

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
                                    data-week="${weekNo}"
                                    data-weekday="${weekday}"
                                    data-subject="${lesson.subject}"
                                    data-room-name="${lesson.roomName}">
                                    
                                    ✏️

                                </button>

                                ${
                                    homework
                                    ?
                                    `
                                    <div
                                        class="lesson-homework-preview"
                                        data-homework="${homework.replace(/"/g,"&quot;")}">

                                    📖 ${homework}

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
                        console.log("før kallet: button.dataset.subject button.dataset.roomName", button.dataset.subject,button.dataset.roomName)
                        event.stopPropagation();
                        openHomeworkModal(
                            
                            button.dataset.lesson,

                            Number(
                                button.dataset.week
                            ),
                            
                            Number(
                                button.dataset.weekday
                            ),
                            button.dataset.subject,
                            button.dataset.roomName
                        );

                    };

            }
        );


    document
    .querySelectorAll(
        ".lesson-homework-preview"
    )
    .forEach(
        preview => {

            preview.onclick =
                event => {

                    event.stopPropagation();

                    openHomeworkViewer(
                        preview.dataset.homework
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

function openHomeworkViewer(
    text
) {

    if (
        document.getElementById(
            "homeworkViewer"
        )
    ) {
        return;
    }

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="homeworkViewer">

            <div
                class="homework-viewer-card">

                <h2>

                    📝 Lekser

                </h2>

                <div
                    class="homework-viewer-text">

                    ${text}

                </div>

                <button
                    id="closeHomeworkViewer">

                    Lukk

                </button>

            </div>

        </div>
        `
    );

    document
        .getElementById(
            "closeHomeworkViewer"
        )
        .onclick =
        () => {

            document
                .getElementById(
                    "homeworkViewer"
                )
                ?.remove();

        };

}
