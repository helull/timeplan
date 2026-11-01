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
