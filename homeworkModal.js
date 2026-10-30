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
    saveWeekHoliday
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
    subject
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
                        ? "Ferie og undervisningsfri dager (for hele appen) og prøvemarkering (for din klasse)"
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

                    Legg timen inn i Prøveplan

                </button>

                ${
                    teacherMode
                    ?
                    `
                    <button
                        id="leggInnFridag">

                        For alle klasser:
                        Gjør denne dagen undervisningsfri

                    </button>

                    <button
                        id="leggInnFriuke">

                        For alle klasser:
                        Gjør hele uken til friuke

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
            "leggInnFridag"
        )
        ?.addEventListener(
            "click",
            async () => {

                await saveDayHoliday(
                    week,
                    weekday
                );

                alert(
                    `${weekday} i uke ${week} er nå undervisningsfri`
                );

            }
        );

    document
        .getElementById(
            "leggInnFriuke"
        )
        ?.addEventListener(
            "click",
            async () => {

                await saveWeekHoliday(
                    week
                );

                alert(
                    `Fri-uke lagret for uke ${week}`
                );

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

                /* BLOKKFAG */

                if (
                    isBlockSubject
                ) {

                    const blockText =
                        await openBlockExamModal();

                    if (
                        blockText === null
                    ) {
                        return;
                    }

                    const success =
                        await saveBlockExam(
                            lessonId,
                            week,
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
    week
) {

    const exams =
        await loadBlockExams(
            week
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
                                                        data-id="${exam.id}">

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
