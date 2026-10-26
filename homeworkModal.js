export function openHomeworkModal(
    lessonId,
    week
){

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="homeworkModal">

            <div
                class="modal-card">

                <h2>

                    Lekse

                </h2>

                <textarea
                    id="homeworkText"
                    rows="8"
                    style="width:100%;">

                </textarea>

                <br><br>

                <button
                    id="saveHomework">

                    Lagre

                </button>

            </div>

        </div>
        `
    );

}
