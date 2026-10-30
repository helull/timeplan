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

const TEACHER_PASSWORD =
    "TEMP123";

export async function openHomeworkModal(
    lessonId,
    week,
    weekday
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

let examInfo =
    await loadExamFlag(
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
                    ${teacherMode ? "Ferie og undervisningsfri dager (for hele appen) og prøvemarkering (for din klasse)" : "Lekser(for deg) og prøvemarkering (for hele klassen)"}
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

    <br><br>
    `
}

                <button
                    id="saveHomework"
                    ${teacherMode ? "disabled" : ""}>

                    Lagre

                </button>

                <br><br>
                <button
                    id="toggleExam"
                    style="
                        background:${examEnabled ? "#ff0000" : ""};
                        color:${examEnabled ? "#ffffff" : ""};
                    ">

                    For denne timen: Prøve

                </button>

${
    teacherMode
    ?
    `
    <br><br>
    <button
        id="leggInnFridag">

        For alle klasser: Gjør denne dagen undervisningsfri

    </button>

    <br><br>
    <button
        id="leggInnFriuke">

        For alle klasser: Gjør hele uken til friuke

    </button>
    `
    :
    ""
}
                <br><br>
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

            const password =
                prompt(
                    "Passord for prøvemarkering:"
                );

            if (
                password !==
                TEACHER_PASSWORD
            ) {
                alert(
                    "Feil passord"
                );
                return;
            }

            examEnabled =
                !examEnabled;

            await saveExamFlag(
                lessonId,
                week,
                examEnabled
            );
            
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

            }
            else {

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
