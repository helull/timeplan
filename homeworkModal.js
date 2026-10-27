import {
    saveHomework,
    loadHomework,
    saveExamFlag,
    loadExamFlag
}
from "./homeworkService.js";

const TEACHER_PASSWORD =
    "DITT_PASSORD";

export async function openHomeworkModal(
    lessonId,
    week
) {

    if (
        document.getElementById(
            "homeworkModal"
        )
    ) {
        return;
    }

    const currentText =
        await loadHomework(
            lessonId,
            week
        );

    let examEnabled =
        await loadExamFlag(
            lessonId,
            week
        );

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="homeworkModal">

            <div
                class="modal-card">

                <h2>
                    Lekser
                </h2>

                <textarea
                    id="homeworkText"
                    rows="8"
                    style="width:100%;">

${currentText || ""}

                </textarea>

                <br><br>

                <button
                    id="saveHomework">

                    Lagre

                </button>

                <button
                    id="toggleExam"
                    style="
                        background:${examEnabled ? "#ff0000" : ""};
                        color:${examEnabled ? "#ffffff" : ""};
                    ">

                    Prøve

                </button>

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
