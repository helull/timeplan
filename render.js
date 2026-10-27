import {
    openHomeworkModal
}
from "./homeworkModal.js";

import {
    getSubjectColor
}
from "./colors.js";

export function renderSchedule(
    schedule,
    homeworkMap = {}
) {

    const weeks =
        document.querySelectorAll(
            ".week"
        );

    weeks.forEach(week => {

        const weekNo =
            week.dataset.week;

        const days =
            week.querySelectorAll(
                ".day"
            );

        days.forEach(
            (day,index) => {

                const weekday =
                    index + 1;

                const dayName = [

                    "Mandag",
                    "Tirsdag",
                    "Onsdag",
                    "Torsdag",
                    "Fredag"

                ][index];

                const lessons =

                    schedule.lessons
                        .filter(

                            lesson =>

                                lesson.weekday ===
                                weekday

                        )
                        .sort(

                            (a,b) =>

                                a.start.localeCompare(
                                    b.start
                                )

                        );
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

                
                day.innerHTML = `

                    <div class="header">

                        <h1>

                            ${dayName}

                        </h1>

                        <div
                            class="week-number">

                            UKE ${weekNo}

                        </div>

                    </div>

                `;

                lessons.forEach(
                    lesson => {

const showTeacherNames =
    localStorage.getItem(
        "showTeacherNames"
    ) === "true";

const showRooms =
    localStorage.getItem(
        "showRooms"
    ) === "true";

const homework =
    homeworkMap[
        `${lesson.lessonId}_${weekNo}`
    ]
    || "";
                        
                        
                        day.innerHTML += `

                            <div class="lesson ${durationClass} ${getSubjectColor(lesson.subject)}">
                                
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
                                
${
    showRooms
    ?

    `
    <div class="room">

        📍 ${lesson.roomName || ""}

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

        👤 ${lesson.teacherName || ""}

    </div>
    `

    :

    ""
}


                                
                                

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
    <div
        class="lesson-homework">

        📝 ${homework}

    </div>
    `

    :

    ""
}
</div>                            

                        `;
                    }
                );


                document
    .querySelectorAll(
        ".homework-button"
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
                

                
            }
        );
    });
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
