import {
    isTeacher
}
from "./teacher.js";

export function renderTeacherButton(){

    if (!isTeacher()) {
        return;
    }

    document.body.insertAdjacentHTML(

        "beforeend",

        `

        <button
            id="adminButton"
            class="admin-button">

            🛠 Administrasjon

        </button>

        `
    );
}

export function openAdminPanel(){

    document.body.insertAdjacentHTML(

        "beforeend",

        `

        <div
            class="modal"
            id="adminModal">

            <div
                class="modal-card">

                <h2>

                    Administrasjon

                </h2>

                <button id="newLesson">

                    Ny time

                </button>

                <button id="newHoliday">

                    Ferie

                </button>

                <button id="newDayOff">

                    Fridag

                </button>
                <button id="importSchedule">

                    Importer JSON

                </button>

            </div>

        </div>

        `
    );
    document.getElementById("importSchedule")?.addEventListener("click",openImportModal);
}

document
    .getElementById(
        "adminButton"
    )
    ?.addEventListener(

        "click",

        openAdminPanel

    );

export function openImportModal() {

    document.body.insertAdjacentHTML(

        "beforeend",

        `

        <div
            class="modal"
            id="importModal">

            <div
                class="modal-card">

                <h2>

                    Importer timeplan

                </h2>

                <textarea
                    id="scheduleJson"
                    rows="20"
                    style="width:100%;"></textarea>

                <br><br>

                <button
                    id="saveSchedule">

                    Lagre

                </button>

            </div>

        </div>

        `

    );

}
