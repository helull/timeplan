import {
    studentExists,
    createStudent
}
from "./studentService.js";

import {
    loadClasses
}
from "./classService.js";

export async function showRegister() {

    document.body.insertAdjacentHTML(

        "beforeend",

        `

        <div
            class="register-screen"
            id="registerScreen">

            <div
                class="register-card">

                <h2>
                    Velkommen
                </h2>

                <input
                    id="nameInput"
                    placeholder="Navn">
                    <select id="classSelect"></select>

                <button
                    id="startButton">

                    Fortsett

                </button>

            </div>

        </div>

        `

    );

    const classSelect =
    document.getElementById(
        "classSelect"
    );

const classes =
    await loadClasses();

classes.forEach(item => {

    const option =
        document.createElement(
            "option"
        );

    option.value =
        item.id;

    option.textContent =
        item.name;

    classSelect.appendChild(
        option
    );
});

    const button =
    document.getElementById(
        "startButton"
    );

button.addEventListener(

    "click",

    async () => {

        const name =

            document
            .getElementById(
                "nameInput"
            )
            .value
            .trim();

        if (!name) {

            alert(
                "Skriv inn navn"
            );

            return;
        }

        const selectedClass =

            document
            .getElementById(
                "classSelect"
            )
            .value;

        const studentId =

            `${name}_${selectedClass}`;

        const exists =

            await studentExists(
                studentId
            );

        if (exists) {

            alert(

                "Navnet finnes allerede i denne klassen."

            );

            return;
        }

        await createStudent(

            studentId,
            name,
            selectedClass

        );

        localStorage.setItem(

            "studentName",
            name

        );

        localStorage.setItem(

            "classId",
            selectedClass

        );

        localStorage.setItem(

            "studentId",
            studentId

        );

        location.reload();
    }
);
}
