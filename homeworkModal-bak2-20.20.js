import {
    saveHomework,
    loadHomework,
    saveExamFlag,
    loadExamFlag
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

var teacherMode =
    isTeacher();
    
 const homeworkData =
    await loadHomework(
        lessonId,
        week
    );

const currentText =
    homeworkData.text;

const classId = localStorage.getItem("classId") || "";
    
let examInfo =
    await loadExamFlag(
        classId,
        lessonId,
        week
    );
    
let examEnabled = examInfo.exam;

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="homeworkModal">

            <div
                class="modal-card">

                <h2>
                    ${teacherMode ? "Ferie og undervisningsfri dager (for hele appen) og prøvemarkering (for din klasse)" : "Lekser og prøveplan"}
                </h2>

${
    teacherMode
    ? ""
    : `
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

                    Legg timen inn i Prøveplan for klassen

                </button>

${
    teacherMode
    ?
    `
    
    <button
        id="leggInnFridag">

        For alle klasser: Gjør denne dagen undervisningsfri

    </button>

    
    <button
        id="leggInnFriuke">

        For alle klasser: Gjør hele uken til friuke

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
                `${weekday} i uke ${week} er nå underevisningsfri`
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

            const newState =
                !examEnabled;

            let subjectToSave =
                subject;

            if (
                newState &&
                subject
                    .toUpperCase()
                    .includes("BLOKK")
            ) {

                const blockSubject =
                    await openBlockExamModal();

                if (
                    blockSubject === null
                ) {
                    return;
                }

                subjectToSave =
                    blockSubject;
            }

            const success =
                await saveExamFlag(
                    lessonId,
                    week,
                    newState,
                    subjectToSave
                );

            if (!success) {
                return;
            }

            examEnabled =
                newState;

            if (examEnabled) {

                alert(
                    "Prøve slått PÅ"
                );

                document
                    .getElementById(
                        "homeworkModal"
                    )
                    ?.remove();

            }
            else {

                const button =
                    document.getElementById(
                        "toggleExam"
                    );

                button.style.background =
                    "";

                button.style.color =
                    "";

                alert(
                    "Prøve slått AV"
                );
            }

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

function openBlockExamModal() {

    return new Promise(
        resolve => {

            document
                .body
                .insertAdjacentHTML(
                    "beforeend",
                    `
                    <div
                        class="modal"
                        id="blockExamModal">

                        <div
                            class="modal-card">

                            <h3>

                                Hva gjelder prøven?

                            </h3>

                            <input
                                id="blockExamText"
                                type="text"
                                maxlength="20"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            <br><br>

                            <button
                                id="saveBlockExam">

                                Lagre

                            </button>

                            <button
                                id="cancelBlockExam">

                                Avbryt

                            </button>

                        </div>

                    </div>
                    `
                );

            document
                .getElementById(
                    "saveBlockExam"
                )
                .addEventListener(
                    "click",
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

                    }
                );

            document
                .getElementById(
                    "cancelBlockExam"
                )
                .addEventListener(
                    "click",
                    () => {

                        document
                            .getElementById(
                                "blockExamModal"
                            )
                            ?.remove();

                        resolve(
                            null
                        );

                    }
                );

        }
    );

}
