import {
    openHomeworkModal,
    formatTeacherHomework,
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
    teacherHomeworkMap = {},
    examMap = {},
    blockExams = [],
    tentamens = []
) {
    console.log("blockExams:", blockExams);
    console.log("schedule er", schedule)

    const totalDays =
    document.querySelectorAll(".day").length;

    let completed = 0;
    
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

                const grade =    `VG${schedule.className.charAt(0)}`;
                
                const dayName = [
                    "Mandag",
                    "Tirsdag",
                    "Onsdag",
                    "Torsdag",
                    "Fredag"
                ][index];

                const weekHolidaySet =
                  new Set();

              const dayHolidaySet =
                  new Set();

              holidays.forEach(
                  holiday => {

                      if (holiday.type === "week") {

                          weekHolidaySet.add(
                              holiday.week
                          );
                      }

                        if (holiday.type === "day") {
                          dayHolidaySet.add(
                              `${holiday.week}_${holiday.weekday}`
                          );
                      }
                    }
                );
              
                const isWeekHoliday =
                    weekHolidaySet.has(
                        weekNo
                    );

                const isDayHoliday =
                    dayHolidaySet.has(
                        `${weekNo}_${weekday}`
                    );
              
                const tentamenMap = {};

                tentamens.forEach(
                    item => {

                        tentamenMap[
                            `${item.week}_${item.day}_${item.grade}`
                        ] = item;
                    }
                );

                const tentamen =
                    tentamenMap[
                        `${weekNo}_${weekday}_${grade}`
                    ];


              const lessonsByWeekday = {};

              schedule.lessons.forEach(
                  lesson => {

                      if (
                          !lessonsByWeekday[
                              lesson.weekday
                            ]
                      ) {

                            lessonsByWeekday[
                                lesson.weekday
                          ] = [];
                      }

                      lessonsByWeekday[
                          lesson.weekday
                      ].push(
                          lesson
                      );
                  }
              );

              Object
                  .values(
                      lessonsByWeekday
                )
                  .forEach(
                      lessons => {

                        lessons.sort(
                              (a, b) =>
                                  a.start.localeCompare(
                                      b.start
                                  )
                          );
                      }
                 );

              const lessons =
                  lessonsByWeekday[
                        weekday
                    ] || [];


              

                const startsLate =
                    lessons.length > 0 &&
                    lessons[0].start !== "08:15";

                //day.innerHTML = `
                let html = `

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

                    html += `

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
                    day.innerHTML = html;

                    return;
                }

                if (isDayHoliday) {

                    html += `

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
                    day.innerHTML = html;

                    return;
                }
                
                if (tentamen) {

        html += `

        <div class="lesson tentamen-card">

            <div class="subject">
                ${tentamen.subject}
            </div>

            <div class="homework">

                Oppstart kl. ${tentamen.startTime}.

                <br><br>

                Møt opp minst 20 minutter før.

            </div>

        </div>

    `;
    day.innerHTML = html;

    return;
}

                let lunchRendered = false;
                lessons.forEach(
                    lesson => {
                        if (
                            !lunchRendered &&
                            lesson.start >= "12:00"
                        ) {
                            html += `
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

                        const teacherLessonData =
                    teacherHomeworkMap[
        `${schedule.className}_${lesson.lessonId}_${weekNo}`
    ];
                        
                        const examData =
                            examMap[
                                `${schedule.className}_${lesson.lessonId}_${weekNo}`
                            ];

                        const isExam =
                            examData?.exam ?? false;
                        
                        const grade = `VG${schedule.className.charAt(0)}`;                    
                        
                    const blockExamMap =
                        {};

                    blockExams.forEach(
                      exam => {

                        const key =

                          `${exam.week}_${exam.day}_${exam.grade}_${exam.examTime}`;

                        if (
                            !blockExamMap[key]
                        ) {

                          blockExamMap[key] =
                                [];
                        }

                        blockExamMap[key]
                          .push(
                              exam
                          );
                    }
                );
                 const matchingBlockExams =
                    blockExamMap[
                      `${weekNo}_${weekday}_${grade}_${lesson.start}`
                    ] || [];

                        const isBlockExam = matchingBlockExams.length > 0;
                        const hasExam =isExam || isBlockExam;
                        
                        let homework = "";
                        let teacherHomework = "";

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

if (teacherLessonData) {

    teacherHomework =
        teacherLessonData.text || "";
}
``

                        
                  const showTeacherNames =
                    localStorage.getItem(
                      "showTeacherNames"
                    ) === "true";

                const showRooms =
                      localStorage.getItem(
                      "showRooms"
                    ) === "true";





                        //day.innerHTML += `                    
                        //let html = "";
                        html += `
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

                                    <div class="time">

                                        ${lesson.start}
                                        -
                                        ${lesson.end}

                                    </div>

                                 </div>
           

                                <div class="room-teacher">
                                        <div class="room ${showRooms ? "" : "roomInvisible"}"}>
                                            ${lesson.roomName}
                                        </div>
                                        
                                        <div class="teacher ${showTeacherNames ? "" : "teacherNameInvisible"}"}>
                                            ${lesson.teacherName}
                                        </div>
                                </div>


 ${
    isBlockExam
    ? `
        <div class="exam-title">
            ${
                matchingBlockExams
                    .map(
                        exam => `📌 ${exam.title}`
                    )
                    .join("<br>")
            }
        </div>
      `
    : ""
}


                                <button
                                    class="homework-button"
                                    data-lesson="${lesson.lessonId}"
                                    data-week="${weekNo}"
                                    data-weekday="${weekday}"
                                    data-subject="${lesson.subject}"
                                    data-room-name="${lesson.roomName}"
                                    data-start-time="${lesson.start}">
                                    
                                    ✏️

                                </button>

                              ${
    teacherHomework
    ?
    `
    <div
        class="teacher-homework-preview"
        data-homework="${teacherHomework.replace(/"/g,"&quot;")}">

        📚 ${formatTeacherHomework(teacherHomework)}

    </div>
    `
    :
    ""
}

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
                 day.innerHTML = html;



                
                completed++;

const percent =
    Math.round(
        completed / totalDays * 100
    );

document.getElementById(
    "progressBar"
).style.width =
    `${percent}%`;

document.getElementById(
    "loadingText"
).textContent =
    `Laster ${percent}%`;



                
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
                            button.dataset.roomName,
                            button.dataset.startTime
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


    document
.querySelectorAll(
    ".teacher-homework-preview"
)
.forEach(
    preview => {

        preview.onclick =
            event => {

                event.stopPropagation();

                openTeacherHomeworkViewer(
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

function openTeacherHomeworkViewer(
    text
) {

    if (
        document.getElementById(
            "teacherHomeworkViewer"
        )
    ) {
        return;
    }

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="teacherHomeworkViewer">

            <div
                class="homework-viewer-card">

                <h2>

                    📚 Lærerlekse

                </h2>

                <div
                    class="homework-viewer-text">

                    ${text}

                </div>

                <button
                    id="closeTeacherHomeworkViewer">

                    Lukk

                </button>

            </div>

        </div>
        `
    );

    document
        .getElementById(
            "closeTeacherHomeworkViewer"
        )
        .onclick =
        () => {

            document
                .getElementById(
                    "teacherHomeworkViewer"
                )
                ?.remove();

        };
}
