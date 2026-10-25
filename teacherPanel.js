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

            </div>

        </div>

        `
    );
}

document
    .getElementById(
        "adminButton"
    )
    ?.addEventListener(

        "click",

        openAdminPanel

    );
