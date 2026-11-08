
import {
   loadSchedule 
}
from "./scheduleService.js";

import {
    saveBlockCourse,
    loadBlockCourseByLesson,
    loadBlockCoursesByGradeAndTeacher,
    updateBlockCourse,
    deleteBlockCourse
}
from "./blockCourseService.js";

import {
    saveTeacherHomework,
    loadTeacherHomework
}
from "./teacherHomeworkService.js";

import {
    saveTentamen,
    loadTentamens,
    deleteTentamen
}
from "./tentamenService.js";

import {
    saveHomework,
    loadHomework,
    saveExamFlag,
    loadExamFlag,
    saveBlockExam,
    loadBlockExams,
    deleteBlockExam
}
from "./homeworkService.js";

import {
    saveDayHoliday,
    saveWeekHoliday,
    removeDayHoliday,
    removeWeekHoliday,
    hasDayHoliday,
    hasWeekHoliday
}
from "./holidayService.js";

import {
    isTeacher,
    isAdmin,
    giveTeacherName,
    giveTeacherId
}
from "./teacher.js";

export async function openHomeworkModal(
    lessonId,
    week,
    weekday,
    subject,
    roomName,
    startTime
) {

    if (
        document.getElementById(
            "homeworkModal"
        )
    ) {
        return;
    }

    const classId =
        localStorage.getItem(
            "classId"
        ) || "";

   const grade =
    classId.includes("1") ? "VG1" :
    classId.includes("2") ? "VG2" :
    classId.includes("3") ? "VG3" :
    classId.includes("4") ? "VG4" :
    null;
   
    var teacherMode = isTeacher();

    const isBlockSubject =
    subject
        ?.toUpperCase()
        .includes(
            "BLOKK"
        );

const isBlockRoom =
    roomName
        ?.toUpperCase()
        .includes(
            "BLOKK"
        );

const canCreateBlockCourse =
    teacherMode &&
    (
        isBlockSubject ||
        isBlockRoom
    );

   let existingBlockCourse =
    null;

if (
    canCreateBlockCourse
) {

    var teacher = false;   
    if (teacherMode === true) {teacher = await giveTeacherName(giveTeacherId();}
   
    existingBlockCourse =
        await loadBlockCourseByLesson(
            lessonId,
            grade,
           teacher
        );

}
    
    const dayHolidayEnabled =
        await hasDayHoliday(
            week,
            weekday
        );

    const weekHolidayEnabled =
        await hasWeekHoliday(
            week
        );

    
    const homeworkData =
        await loadHomework(
            lessonId,
            week
        );

    const currentText =
        homeworkData.text;

    const teacherHomeworkData =
    await loadTeacherHomework(
        classId,
        lessonId,
        week
    );

const teacherHomeworkText =
    teacherHomeworkData.text || "";
    
    console.log(
    "teacherHomeworkText råverdi",
    JSON.stringify(teacherHomeworkText)
);
    
    let examInfo =
        await loadExamFlag(
            classId,
            lessonId,
            week
        );

    let examEnabled =
        examInfo.exam;

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="homeworkModal">

            <div
                class="modal-card">

                <h2>
                    ${isAdmin()
                        ? "Fridager, prøver og EFP"
                        : `Lekser og prøveplan (${teacher})`}
                </h2>

                ${
    !teacherMode
    ?
    `
    ${
        teacherHomeworkText
        ?
        `
        <div
            class="teacher-homework-card">

            <div
                class="teacher-homework-title">

                📚 Lærerlekse (${classId})

            </div>

            <div
                class="teacher-homework-text">
                    $(formatTeacherHomework(
                    teacherHomeworkText)
                    )
            </div>

        </div>

        <br>
        `
        :
        ""
    }

    <div
        class="student-homework-title">

        📝 Mine notater

    </div>

    <textarea
        id="homeworkText"
        rows="8"
        style="width:100%;">

${currentText || ""}

    </textarea>
    `
    :
    ""
}
${
    teacherMode
    ?
    `
    <h3>
        📚 Lærerlekse (${classId})
    </h3>

    <textarea
        id="teacherHomeworkText"
        rows="5"
        style="width:100%;">

${teacherHomeworkText}

    </textarea>

    <br><br>

    <button
        id="saveTeacherHomework">

        Lagre lærerlekse

    </button>
${
    canCreateBlockCourse
    ?
    `
    <br><br>

    <button
        id="createBlockCourse">

        ${
    existingBlockCourse
    ?
    "Rediger blokkfag"
    :
    "Etabler fag i denne blokka"
}

    </button>

    <hr>
    `
    :
    ""
}
    <hr>
    `
    :
    ""
}
                

                <button
                    id="saveHomework"
                    ${isTeacher() ? "disabled" : ""}>

                    Lagre mine lekser

                </button>

                <button
                    id="toggleExam"
                    style="
                        background:${examEnabled ? "#ff0000" : ""};
                        color:${examEnabled ? "#ffffff" : ""};
                    ">

                    Inn/ut av prøveplan

                </button>

                ${
                    isAdmin()
                    ?
                    `
                    <button
                        id="leggInnFridag"
                        style="
                            background:${dayHolidayEnabled ? "#ff0000" : ""};
                            color:${dayHolidayEnabled ? "#ffffff" : ""};
                        ">

                        For alle klasser:
                        Gjør denne dagen undervisningsfri

                    </button>

                    <button
                        id="leggInnFriuke"
                            style="
                            background:${weekHolidayEnabled ? "#ff0000" : ""};
                            color:${weekHolidayEnabled ? "#ffffff" : ""};
                        ">

                        For alle klasser:
                        Gjør hele uken til friuke

                    </button>
                    <button
                        id="manageTentamens">

                        Legg inn/fjern Eksamensforberedende Prøve
                    </button>
                    `
                    :
                    ""
                }

                <button
                    id="closeHomework">

                    Lukk

                </button>

            </div>

        </div>
        `
    );

    document
    .getElementById(
        "manageTentamens"
    )
    ?.addEventListener(
        "click",
        async () => {

            await openTentamenModal(
                week,
                weekday
            );

        }
    );
    
let dayHolidayState =
    dayHolidayEnabled;

document
    .getElementById(
        "leggInnFridag"
    )
    ?.addEventListener(
        "click",
        async () => {

            const button =

                document.getElementById(
                    "leggInnFridag"
                );

            if (
                dayHolidayState
            ) {

                await removeDayHoliday(
                    week,
                    weekday
                );

                dayHolidayState =
                    false;

            } else {

                await saveDayHoliday(
                    week,
                    weekday
                );

                dayHolidayState =
                    true;
            }

            button.style.background =

                dayHolidayState
                    ? "#ff0000"
                    : "";

            button.style.color =

                dayHolidayState
                    ? "#ffffff"
                    : "";

        }
    );
    
  let weekHolidayState =
    weekHolidayEnabled;

document
    .getElementById(
        "leggInnFriuke"
    )
    ?.addEventListener(
        "click",
        async () => {

            const button =

                document.getElementById(
                    "leggInnFriuke"
                );

            if (
                weekHolidayState
            ) {

                await removeWeekHoliday(
                    week
                );

                weekHolidayState =
                    false;

            } else {

                await saveWeekHoliday(
                    week
                );

                weekHolidayState =
                    true;
            }

            button.style.background =

                weekHolidayState
                    ? "#ff0000"
                    : "";

            button.style.color =

                weekHolidayState
                    ? "#ffffff"
                    : "";

        }
    );

    document
        .getElementById(
            "saveHomework"
        )
        ?.addEventListener(
            "click",
            async () => {

                const text =

                    document
                        .getElementById(
                            "homeworkText"
                        )
                        .value
                        .trim();

                await saveHomework(
                    lessonId,
                    week,
                    text
                );

                alert(
                    "Lagret"
                );

                document
                    .getElementById(
                        "homeworkModal"
                    )
                    ?.remove();

            }
        );

    document
    .getElementById(
        "saveTeacherHomework"
    )
    ?.addEventListener(
        "click",
        async () => {

            const text =

                document
                    .getElementById(
                        "teacherHomeworkText"
                    )
                    .value
                    .trim();

            await saveTeacherHomework(

                classId,
                lessonId,
                week,
                text

            );

            alert(
                "Lærerlekse lagret"
            );

        }
    );

    document
.getElementById(
    "createBlockCourse"
)
?.addEventListener(
    "click",
    async () => {
       if (window.matchMedia("(orientation: landscape) and (min-width: 901px)").matches) {           
        await openBlockCourseModal(existingBlockCourse);
       } else {
          alert("Du må være i landskapsmodus");
       }
       

    }
);
    
    document
        .getElementById(
            "toggleExam"
        )
        ?.addEventListener(
            "click",
            async () => {

                const isBlockSubject =
                    subject
                        ?.toUpperCase()
                        .includes(
                            "BLOKK"
                        );
                const isBlockRoom =
                    roomName
                        ?.toUpperCase()
                        .includes(
                            "BLOKK"
                        );
                

                /* BLOKKFAG */
                console.log("subject, roomName og startTime er ", subject, roomName, startTime);

                if (isBlockSubject || isBlockRoom) {

                    const blockText =
                        await openBlockExamModal(week, weekday, startTime);

                    if (
                        blockText === null
                    ) {
                        return;
                    }

                    const success =
                        await saveBlockExam(
                            lessonId,
                            week,
                            weekday,
                            blockText,
                            startTime
                        );

                    if (!success) {
                        return;
                    }

                    alert(
                        "Blokkprøve lagret"
                    );

                    document
                        .getElementById(
                            "homeworkModal"
                        )
                        ?.remove();

                    return;
                }

                /* VANLIG FAG */

                const newState =
                    !examEnabled;

                const success =
                    await saveExamFlag(
                        lessonId,
                        week,
                        newState,
                        subject
                    );

                if (!success) {
                    return;
                }

                examEnabled =
                    newState;

                const button =
                    document.getElementById(
                        "toggleExam"
                    );

                if (
                    examEnabled
                ) {

                    button.style.background =
                        "#ff0000";

                    button.style.color =
                        "#ffffff";

                } else {

                    button.style.background =
                        "";

                    button.style.color =
                        "";

                }

                alert(
                    examEnabled
                        ? "Prøve slått PÅ"
                        : "Prøve slått AV"
                );

            }
        );

    document
        .getElementById(
            "closeHomework"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "homeworkModal"
                    )
                    ?.remove();

            }
        );
}

async function openBlockExamModal(
    week,
    day,
    startTime
) {

    const exams =
        await loadBlockExams(
            week,
            day,
            startTime
        );

    return new Promise(
        resolve => {

            document.body
                .insertAdjacentHTML(
                    "beforeend",
                    `
                    <div
                        class="modal"
                        id="blockExamModal">

                        <div
                            class="modal-card">

                            <h3>

                                BLOKK-prøver

                            </h3>

                            <div
                                id="blockExamList">

                                ${
                                    exams.length
                                    ?
                                    exams
                                        .map(
                                            exam =>
                                                `
                                                <div
                                                    class="block-exam-row"
                                                    style="
                                                        display:flex;
                                                        justify-content:space-between;
                                                        align-items:center;
                                                        margin:4px 0;
                                                    ">

                                                    <span>

                                                        🧪 ${exam.title}

                                                    </span>

                                                    <button
                                                        class="delete-block-exam"
                                                        data-id="${exam.id}"
                                                        data-teacher="${exam.teacher}">

                                                        ✕

                                                    </button>

                                                </div>
                                                `
                                        )
                                        .join("")
                                    :
                                    `
                                    <div>

                                        Ingen registrerte prøver.

                                    </div>
                                    `
                                }

                            </div>

                            <hr>

                            <input
                                id="blockExamText"
                                type="text"
                                maxlength="20"
                                placeholder="Ny prøve"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            <br><br>

                            <button
                                id="saveBlockExam">

                                Ny prøve

                            </button>

                            <button
                                id="cancelBlockExam">

                                Lukk

                            </button>

                        </div>

                    </div>
                    `
                );

            document
                .querySelectorAll(
                    ".delete-block-exam"
                )
                .forEach(
                    button => {

                        button.onclick =
                            async () => {

                                const isTeacherExam = button.dataset.teacher === "true";
                                if (isTeacherExam && !isTeacher()) {
                                    alert("Denne prøven kan bare slettes av lærer.");
                                    return;
                                }
                                
                                if (
                                    !confirm(
                                        "Slette denne prøven?"
                                    )
                                ) {
                                    return;
                                }

                                await deleteBlockExam(
                                    button.dataset.id
                                );

                                document
                                    .getElementById(
                                        "blockExamModal"
                                    )
                                    ?.remove();

                                resolve(
                                    null
                                );

                            };

                    }
                );

            document
                .getElementById(
                    "saveBlockExam"
                )
                .onclick =
                () => {

                    const text =
                        document
                            .getElementById(
                                "blockExamText"
                            )
                            .value
                            .trim();

                    if (!text) {

                        alert(
                            "Skriv inn hva prøven gjelder."
                        );

                        return;
                    }

                    document
                        .getElementById(
                            "blockExamModal"
                        )
                        ?.remove();

                    resolve(
                        text
                    );

                };

            document
                .getElementById(
                    "cancelBlockExam"
                )
                .onclick =
                () => {

                    document
                        .getElementById(
                            "blockExamModal"
                        )
                        ?.remove();

                    resolve(
                        null
                    );

                };

        }
    );

}

async function openTentamenModal(
    week,
    day
) {

    if (!isTeacher()) {
        return;
    }

    const tentamens =
        await loadTentamens();

    return new Promise(
        resolve => {

            document.body
                .insertAdjacentHTML(

                    "beforeend",

                    `
                    <div
                        class="modal"
                        id="tentamenModal">

                        <div
                            class="modal-card">

                            <h3>
                                Tentamener
                            </h3>

                            <div
                                id="tentamenList">

                                ${
                                    tentamens.length

                                    ?

                                    tentamens
                                        .map(
                                            tentamen =>

                                                `
                                                <div
                                                    style="
                                                        display:flex;
                                                        justify-content:space-between;
                                                        align-items:center;
                                                        margin:6px 0;
                                                    ">

                                                    <span>

                                                        ${tentamen.grade}
                                                        -
                                                        uke ${tentamen.week}
                                                        -
                                                        dag ${tentamen.day}
                                                        -
                                                        ${tentamen.subject}
                                                        -
                                                        ${tentamen.startTime}

                                                    </span>

                                                    <button
                                                        class="delete-tentamen"
                                                        data-id="${tentamen.id}">

                                                        ✕

                                                    </button>

                                                </div>
                                                `
                                        )
                                        .join("")

                                    :

                                    `
                                    <div>
                                        Ingen registrerte tentamener
                                    </div>
                                    `
                                }

                            </div>

                            <hr>

                            <label>
                                Trinn
                            </label>

                            <select
                                id="tentamenGrade"
                                style="
                                    width:100%;
                                    padding:8px;
                                    margin-top:4px;
                                ">

                                <option value="VG1">
                                    VG1
                                </option>

                                <option value="VG2">
                                    VG2
                                </option>

                                <option value="VG3">
                                    VG3
                                </option>

                            </select>

                            <br><br>

                            <label>
                                Fag
                            </label>

                            <input
                                id="tentamenSubject"
                                type="text"
                                maxlength="50"
                                placeholder="F.eks. Norsk"

                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            <br><br>

                            <label>
                                Oppstart
                            </label>

                            <input
                                id="tentamenStart"
                                type="time"
                                value="09:00"

                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            <br><br>

                            <button
                                id="saveTentamen">

                                Lagre tentamen

                            </button>

                            <button
                                id="cancelTentamen">

                                Lukk

                            </button>

                        </div>

                    </div>
                    `
                );

            document
                .querySelectorAll(
                    ".delete-tentamen"
                )
                .forEach(
                    button => {

                        button.onclick =
                            async () => {

                                if (
                                    !confirm(
                                        "Slette tentamen?"
                                    )
                                ) {
                                    return;
                                }

                                await deleteTentamen(
                                    button.dataset.id
                                );

                                alert(
                                    "Tentamen slettet"
                                );

                                document
                                    .getElementById(
                                        "tentamenModal"
                                    )
                                    ?.remove();

                                resolve();
                            };

                    }
                );

            document
                .getElementById(
                    "saveTentamen"
                )
                .onclick =
                async () => {

                    const grade =

                        document
                            .getElementById(
                                "tentamenGrade"
                            )
                            .value;

                    const subject =

                        document
                            .getElementById(
                                "tentamenSubject"
                            )
                            .value
                            .trim();

                    const startTime =

                        document
                            .getElementById(
                                "tentamenStart"
                            )
                            .value;

                    if (
                        !subject
                    ) {

                        alert(
                            "Skriv inn fag."
                        );

                        return;
                    }

                    await saveTentamen(

                        week,
                        day,
                        grade,
                        subject,
                        startTime

                    );

                    alert(
                        "Tentamen lagret"
                    );

                    document
                        .getElementById(
                            "tentamenModal"
                        )
                        ?.remove();

                    resolve();
                };

            document
                .getElementById(
                    "cancelTentamen"
                )
                .onclick =
                () => {

                    document
                        .getElementById(
                            "tentamenModal"
                        )
                        ?.remove();

                    resolve();
                };

        }
    );

}

export function formatTeacherHomework(text) {

    if (!text) {
        return "";
    }

    // Finn første vanlig URL
    const urlMatch =
        text.match(
            /https:\/\/[^\s]+/
        );

    if (urlMatch) {

        const url =
            urlMatch[0];

        return `
            <a
                href="${url}"
                target="_blank"
                rel="noopener noreferrer"
                class="teacher-homework-link">

                📓 Åpne OneNote-side

            </a>
        `;
    }

    // Vanlig tekst
    return text;
}

async function openBlockCourseModal(blockCourse = null) {

    const classId =
        localStorage.getItem(
            "classId"
        );

   const grade =
    classId.includes("1") ? "VG1" :
    classId.includes("2") ? "VG2" :
    classId.includes("3") ? "VG3" :
    classId.includes("4") ? "VG4" :
    null;
   
   if (!grade) {
      alert ("Fant ikke trinn, avslutter...")
      return;
   }


    const teacher = await giveTeacherName(giveTeacherId);
      
    const schedule =
        await loadSchedule(
            classId
        );

    const lessons =
        schedule.lessons || [];

    const weekdayNames = {
        1: "Mandag",
        2: "Tirsdag",
        3: "Onsdag",
        4: "Torsdag",
        5: "Fredag"
    };

    const dayColumns = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
};

lessons
    .sort(
        (a, b) => {

            if (
                a.weekday !==
                b.weekday
            ) {

                return (
                    a.weekday -
                    b.weekday
                );

            }

            return a.start.localeCompare(
                b.start
            );

        }
    )
    .forEach(
        lesson => {
           const checked =
    blockCourse?.sessions?.some(
        session =>
            session.lessonId ===
            lesson.lessonId
    );

            const isBlock =
                lesson.subject
                    ?.toUpperCase()
                    .includes(
                        "BLOKK"
                    )
                ||
                lesson.roomName
                    ?.toUpperCase()
                    .includes(
                        "BLOKK"
                    );

            const text =
                isBlock
                ? "🟢 Blokk"
                : (
                    lesson.subject
                        ?.substring(
                            0,
                            5
                        ) || ""
                ) + "...";

            dayColumns[
                lesson.weekday
            ].push(
                `
                <div
                    style="
                        font-size:11px;
                        white-space:nowrap;
                        margin:2px 0;
                    ">

                    <input
                        type="checkbox"
                        ${checked ? "checked" : ""}
                        ${
                            isBlock
                            ? ""
                            : "disabled"
                        }
                        class="blockLesson"
                        data-id="${lesson.lessonId}"
                        data-weekday="${lesson.weekday}"
                        data-start="${lesson.start}"
                        data-subject="${lesson.subject}"
                        data-room="${lesson.roomName}">

                    ${lesson.start}
                    ${text}

                </div>
                `
            );

        }
    );

    document
        .getElementById(
            "blockCourseModal"
        )
        ?.remove();

    document.body
        .insertAdjacentHTML(
            "beforeend",
            `
            <div
                class="modal"
                id="blockCourseModal">

                <div
                    class="modal-card">

                    <h3>

                        Etabler blokkfag

                    </h3>

                    <label>

                        Fagnavn

                    </label>

                    <input
                        id="blockCourseSubject"
                        type="text"
                        value="${blockCourse?.subject || ""}"
                        style="width:100%;">

                    <br><br>

                    <label>

                        Rom

                    </label>

                    <input
                        id="blockCourseRoom"
                        type="text"
                        value="${blockCourse?.room || ""}"
                        style="width:100%;">

                    <br><br>

                    <h4>

                        Velg øktene som tilhører blokkfaget

                    </h4>

<div
    id="blockCourseLessonList"
    style="
        display:grid;
        grid-template-columns:
            repeat(5, 1fr);
        gap:10px;
        margin-top:10px;
    ">

    <div>
        <b>Man</b>
        ${dayColumns[1].join("")}
    </div>

    <div>
        <b>Tir</b>
        ${dayColumns[2].join("")}
    </div>

    <div>
        <b>Ons</b>
        ${dayColumns[3].join("")}
    </div>

    <div>
        <b>Tor</b>
        ${dayColumns[4].join("")}
    </div>

    <div>
        <b>Fre</b>
        ${dayColumns[5].join("")}
    </div>

</div>

                    <br>

                    <button
                        id="saveBlockCourse">

                        ${blockCourse
                          ? "Lagre endringer"      
                          : "Opprett fag"
                      }

                    </button>

${
    blockCourse
    ?
    `
    <button
        id="deleteBlockCourse">

        Slett blokkfag

    </button>
    `
    :
    ""
}
                    <button
                        id="cancelBlockCourse">

                        Avbryt

                    </button>

                </div>

            </div>
            `
        );

    document
        .getElementById(
            "saveBlockCourse"
        )
        .onclick =
        async () => {

            const subject =
                document
                    .getElementById(
                        "blockCourseSubject"
                    )
                    .value
                    .trim();

            const room =
                document
                    .getElementById(
                        "blockCourseRoom"
                    )
                    .value
                    .trim();

            const sessions =
                Array.from(
                    document.querySelectorAll(
                        ".blockLesson:checked"
                    )
                )
                .map(
                    checkbox => ({

                        lessonId:
                            checkbox.dataset.id,

                        weekday:
                            Number(
                                checkbox.dataset.weekday
                            ),

                        start:
                            checkbox.dataset.start,

                        subject:
                            checkbox.dataset.subject,

                        room:
                            checkbox.dataset.room

                    })
                );

            if (!subject) {

                alert(
                    "Skriv inn fagnavn"
                );

                return;

            }

            if (!room) {

                alert(
                    "Skriv inn rom"
                );

                return;

            }

            if (
                sessions.length === 0
            ) {

                alert(
                    "Velg minst én blokkøkt"
                );

                return;

            }

if (
    blockCourse
) {

    await updateBlockCourse(

        blockCourse.id,

        {
            subject,
            room,
            teacher,
            grade,
            sessions
        }

    );

    alert(
        "Blokkfag oppdatert"
    );

}
else {

    await saveBlockCourse({

        subject,
        room,
        teacher,
        grade,
        sessions

    });

    alert(
        "Blokkfag opprettet"
    );

}

            document
                .getElementById(
                    "blockCourseModal"
                )
                ?.remove();

        };

    document
        .getElementById(
            "cancelBlockCourse"
        )
        .onclick =
        () => {

            document
                .getElementById(
                    "blockCourseModal"
                )
                ?.remove();

        };

   document
.getElementById(
    "deleteBlockCourse"
)
?.addEventListener(
    "click",
    async () => {

        if (
            !confirm(
                "Slette blokkfaget?"
            )
        ) {

            return;

        }

        await deleteBlockCourse(
            blockCourse.id
        );

        alert(
            "Blokkfag slettet"
        );

        document
        .getElementById(
            "blockCourseModal"
        )
        ?.remove();

    }
);

}
