import { db }
from "./firebase.js";

import {

    collection,
    getDocs,

    doc,
    getDoc,
    setDoc,

    serverTimestamp

}

from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const app =
    document.getElementById("app");

const studentName =
    localStorage.getItem(
        "studentName"
    );

const classId =
    localStorage.getItem(
        "classId"
    );

const studentId =
    localStorage.getItem(
        "studentId"
    );

if (
    studentName &&
    classId &&
    studentId
) {

    showHome();

} else {

    showRegister();
}

async function showRegister() {

    app.innerHTML = `

        <div class="card">

            <h1>Velkommen</h1>

            <p>

                Registrer deg
                første gang.

            </p>

            <input
                id="nameInput"
                placeholder="Ditt navn">

            <select
                id="classSelect">
            </select>

            <button
                id="registerBtn">

                Fortsett

            </button>

            <div
                id="message">
            </div>

        </div>

    `;

    const classSelect =
        document.getElementById(
            "classSelect"
        );

    const classes =
        await getDocs(
            collection(
                db,
                "classes"
            )
        );

    classes.forEach(docData => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            docData.id;

        option.textContent =
            docData.data().name;

        classSelect.appendChild(
            option
        );
    });

    document
        .getElementById(
            "registerBtn"
        )
        .addEventListener(
            "click",
            registerStudent
        );
}

async function registerStudent() {

    const name =
        document
        .getElementById(
            "nameInput"
        )
        .value
        .trim();

    const classId =
        document
        .getElementById(
            "classSelect"
        )
        .value;

    const message =
        document
        .getElementById(
            "message"
        );

    if (!name) {

        message.textContent =
            "Skriv inn navn.";

        return;
    }

    const studentId =
        `${name}_${classId}`;

    const studentRef =
        doc(
            db,
            "students",
            studentId
        );

    const existing =
        await getDoc(
            studentRef
        );

    if (
        existing.exists()
    ) {

        message.textContent =
            "Navnet er allerede registrert i denne klassen.";

        return;
    }

    await setDoc(
        studentRef,
        {
            name,
            classId,

            createdAt:
                serverTimestamp()
        }
    );

    localStorage.setItem(
        "studentName",
        name
    );

    localStorage.setItem(
        "classId",
        classId
    );

    localStorage.setItem(
        "studentId",
        studentId
    );

    location.reload();
}

function showHome() {

    app.innerHTML = `

        <div class="card">

            <h1>

                Hei
                ${studentName}

            </h1>

            <p>

                Klasse:
                ${classId}

            </p>

            <button
                id="switchUser">

                Bytt bruker

            </button>

        </div>

    `;

    document
        .getElementById(
            "switchUser"
        )
        .addEventListener(
            "click",
            switchUser
        );
}

function switchUser() {

    localStorage.removeItem(
        "studentName"
    );

    localStorage.removeItem(
        "classId"
    );

    localStorage.removeItem(
        "studentId"
    );

    location.reload();
}

    render();
}

init();
