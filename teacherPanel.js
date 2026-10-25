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
