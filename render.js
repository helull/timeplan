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

function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// Del opp leksetekst i tekst og lenker uten å gjøre rå OneNote-adresser synlige.
function homeworkParts(value) {
    const text = String(value ?? "");
    const pattern = /(?:onenote:(?:https?:\/\/)?|https?:\/\/|www\.)[^\s<>"']+/gi;
    const parts = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
        const start = match.index;
        let raw = match[0];
        // Vanlig tegnsetting etter en URL er ikke en del av lenken.
        const trimmed = raw.replace(/[.,;!?]+$/g, "");
        if (start > last) parts.push({type:"text", value:text.slice(last,start)});
        if (trimmed) {
            const isOneNote = /^onenote:/i.test(trimmed) || /(?:onenote\.com|onenote\.office\.com|1drv\.ms\/o\/|office\.com\/launch\/onenote)/i.test(trimmed);
            const href = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
            parts.push({type:"link", href, label:isOneNote ? "📓 OneNote" : "🔗 Åpne lenke"});
        }
        if (raw.length > trimmed.length) parts.push({type:"text",value:raw.slice(trimmed.length)});
        last = start + raw.length;
    }
    if (last < text.length) parts.push({type:"text",value:text.slice(last)});
    return parts.length ? parts : [{type:"text",value:text}];
}
function homeworkContent(text, card=false) {
    return homeworkParts(text).map(part => {
        if (part.type === "link") {
            // Blank fane beholder timeplanen urørt når man kommer tilbake.
            return `<a class="homework-inline-link" href="${escapeHtml(part.href)}" target="_blank" rel="noopener noreferrer">${part.label}</a>`;
        }
        if (!part.value.trim()) return card ? "" : escapeHtml(part.value);
        return card ? `<span class="homework-excerpt" tabindex="0" role="button" aria-label="Vis lekse eller notat">${escapeHtml(part.value.trim())}</span>` : escapeHtml(part.value);
    }).join("");
}

// Finn datoen for en ISO-uke, også når visningen går over nyttår.
function dateForSchoolDay(weekNo, weekday) {
    const today = new Date();
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const candidates = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
    const mondayOfISOWeek = (year, week) => {
        const jan4 = new Date(Date.UTC(year, 0, 4));
        const day = jan4.getUTCDay() || 7;
        jan4.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
        return jan4;
    };
    let nearest = null;
    let bestDistance = Infinity;
    for (const year of candidates) {
        const monday = mondayOfISOWeek(year, weekNo);
        // Forkast uke 53 i år som ikke har ISO-uke 53.
        if (weekNo === 53 && monday.getUTCFullYear() !== year &&
            monday.getUTCMonth() !== 11) continue;
        const distance = Math.abs(monday.getTime() - todayUTC);
        if (distance < bestDistance) {
            nearest = monday;
            bestDistance = distance;
        }
    }
    if (!nearest) return '';
    nearest.setUTCDate(nearest.getUTCDate() + weekday - 1);
    return `${String(nearest.getUTCDate()).padStart(2, '0')}.${String(nearest.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function renderSchedule(
    schedule,
    homeworkMap = {},
    teacherHomeworkMap = {},
    examMap = {},
    blockExams = [],
    tentamens = [],
    studentBlockCourseMap = new Map()
) {
    console.log("blockExams:", blockExams);
    console.log("schedule er", schedule)

    const showTeacherNames = localStorage.getItem("showTeacherNames") === "true";
    const showRooms = localStorage.getItem("showRooms") === "true";
    
    const totalDays = document.querySelectorAll(".day").length;

    let completed = 0;
    
    const grade =    `VG${schedule.className.charAt(0)}`;

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

                const dayDate = dateForSchoolDay(weekNo, weekday);

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
                            ${dayName}<span class="day-date">${dayDate}</span>
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

                        const key = `${grade}_${lesson.weekday}_${lesson.start}`;
                        const selectedBlockCourse = studentBlockCourseMap.get(key);

                        // Behold de opprinnelige timeplandataene
                        const isBlockLesson = lesson.subject?.toUpperCase().includes("BLOKK") || lesson.roomName?.toUpperCase().includes("BLOKK");

                        // Bestem hva eleven skal se
                        const displaySubject = isBlockLesson && selectedBlockCourse ? selectedBlockCourse.subject : lesson.subject;
                        const displayRoom = isBlockLesson && selectedBlockCourse ? selectedBlockCourse.room  : lesson.roomName;
                        const displayTeacher = isBlockLesson && selectedBlockCourse ? selectedBlockCourse.teacherName : lesson.teacherName;
                        
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

                        const homeworkKey =  isBlockLesson && selectedBlockCourse
                            ? `${schedule.className}_${lesson.lessonId}_${weekNo}_${selectedBlockCourse.id}`
                            : `${schedule.className}_${lesson.lessonId}_${weekNo}`;

                        const teacherLessonData = teacherHomeworkMap[homeworkKey]; 
                        
                        const examData =
                            examMap[
                                `${schedule.className}_${lesson.lessonId}_${weekNo}`
                            ];

                        const isExam =
                            examData?.exam ?? false;
                                               
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
                        const hasExam = isExam || isBlockExam;
                        // Lærerregistrering har forrang dersom flere prøver gjelder samme time.
                        const teacherExam = (isExam && examData?.teacher === true) ||
                            matchingBlockExams.some(exam => exam.teacher === true);
                        const examOriginClass = !hasExam ? "" :
                            (teacherExam ? "exam-teacher" : "exam-student");
                        
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
                                ${examOriginClass}
                            ">

                                <div class="lesson-top">

                                 <div class="subject">
                                    ${escapeHtml(displaySubject)}
                                </div>

                                    <div class="time">

                                        ${lesson.start}
                                        -
                                        ${lesson.end}

                                    </div>

                                 </div>
           

                                 <div class="room-teacher">
                                    <div class="room">
                                        ${escapeHtml(displayRoom)}
                                    </div>

                                    <div class="teacher">
                                        ${escapeHtml(displayTeacher)}
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
        data-homework="${escapeHtml(teacherHomework)}">

        ${homeworkContent(teacherHomework, true)}

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
        data-homework="${escapeHtml(homework)}">

        ${homeworkContent(homework, true)}

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

            preview.querySelectorAll(".homework-excerpt").forEach(excerpt => {
                excerpt.onclick = event => {
                    event.stopPropagation();
                    openHomeworkViewer(preview.dataset.homework);
                };
                excerpt.onkeydown = event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault(); excerpt.click();
                    }
                };
            });

        }
    );


    document
.querySelectorAll(
    ".teacher-homework-preview"
)
.forEach(
    preview => {

        preview.querySelectorAll(".homework-excerpt").forEach(excerpt => {
            excerpt.onclick = event => {
                event.stopPropagation();
                openTeacherHomeworkViewer(preview.dataset.homework);
            };
            excerpt.onkeydown = event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault(); excerpt.click();
                }
            };
        });

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

        if (!showRooms) {
            document.querySelectorAll(".room").forEach(el => {
                el.classList.add("roomInvisible");
            });
        }

        if (!showTeacherNames) {
            document.querySelectorAll(".teacher").forEach(el => {
            el.classList.add("teacherNameInvisible");
            });
        }
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

                    ${homeworkContent(text)}

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

                    ${homeworkContent(text)}

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
