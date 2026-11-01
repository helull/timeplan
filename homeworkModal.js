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
    isTeacher
}
from "./teacher.js";

export async function openHomeworkModal(
    lessonId,
    week,
    weekday,
    subject,
    roomName
) {

    if (
        document.getElementById(
            "homeworkModal"
        )
    ) {
        return;
    }

    const teacherMode =
        isTeacher();

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

    const classId =
        localStorage.getItem(
            "classId"
        ) || "";

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
                    ${teacherMode
                        ? "Fridager, prøver og EFP"
                        : "Lekser og prøveplan"}
                </h2>

                ${
                    teacherMode
                    ? ""
                    :
                    `
                    <textarea
                        id="homeworkText"
                        rows="8"
                        style="width:100%;">

${currentText || ""}

                    </textarea>
                    `
                }

                <button
                    id="saveHomework"
                    ${teacherMode ? "disabled" : ""}>

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
                    teacherMode
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
                console.log("subject og roomName er ", subject, roomName);

                if (isBlockSubject || isBlockRoom) {

                    const blockText =
                        await openBlockExamModal(week, weekday);

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
                            blockText
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
    day
) {

    const exams =
        await loadBlockExams(
            week,
            day
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
