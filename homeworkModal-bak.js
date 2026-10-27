import {
    saveHomework,
    loadHomework
}
from "./homeworkService.js";

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

${currentText}

                </textarea>

                <br><br>

                <button
                    id="saveHomework">

                    Lagre

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
