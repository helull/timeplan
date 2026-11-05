import { db }
from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


import {
    isTeacher,
    applyTeacherMode,
    enableAdminMode,
    isAdmin
}
from "./teacher.js";

import {
    loadClasses
}
from "./classService.js";

import {
    reloadScheduleForClass
}
from "./app.js";

export function renderTeacherButton() {

    if (!isTeacher()) {
        return;
    }

    document.body.insertAdjacentHTML(

    "beforeend",

    `
    <button
        id="toolButton"
        class="admin-button">

        Admin - verktøy

    </button>
    `
);

    document
        .getElementById("toolButton")
        ?.addEventListener(
            "click",
            openAdminPanel
        );
}

export function openToolsPanel() {

    const teachersenabled = localStorage.getItem("showTeacherNames") === "true";
    const roomsenabled = localStorage.getItem("showRooms") === "true";
    
    if (document.getElementById("toolsModal")) 
    {
        return;
    }

const studentName =
    localStorage.getItem(
        "studentName"
    ) || "";

const classId =
    localStorage.getItem(
        "classId"
    ) || "";
    
    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="toolsModal">

            <div
                class="modal-card">

                <h2>
                    Verktøy - ${studentName} (${classId})
                </h2>

                <button id="toggleTeacherNames">
                   ${teachersenabled ? "Skjul lærere" : "Vis lærere"}
                </button>
                
                <button id="toggleRooms">
                   ${roomsenabled ? "Skjul rom" : "Vis rom"}
                </button>

                <button id="logoutUserFromTools">
                    Logg ut
                </button>
                
                <button id="closeTools">    
                    Lukk
                </button>

            </div>

        </div>
        `
    );

        document
        .getElementById(
            "logoutUserFromTools"
        )
        ?.addEventListener(
            "click",
            logoutUser
        );
    
    document
    .getElementById(
        "toggleTeacherNames"
    )
    ?.addEventListener(
        "click",
        toggleTeacherNames
    );

    document
    .getElementById(
        "toggleRooms"
    )
    ?.addEventListener(
        "click",
        toggleRooms
    );

    document
    .getElementById(
        "closeTools"
    )
    ?.addEventListener(
        "click",
        closeToolsPanel
    );
    
}

function logoutUser() {
    let svar = confirm("Du logger nå ut og får du mulighet til å knytte deg til en annen klasse. NB: Har du lagret lekser på din bruker blir de nå borte!");
    if (!svar) {
         return;
    }
        
    localStorage.clear();
    location.reload();
}

export function openAdminPanel() {

    // Ikke åpne flere modaler samtidig
    if (document.getElementById("adminModal")) {
        return;
    }

    const teacherName =
    localStorage.getItem(
        "teacherName"
    ) || "";

    const classId =
    localStorage.getItem(
        "classId"
    ) || "";
    
    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="adminModal">

            <div
                class="modal-card">

                <h2>
                    Administrasjon - ${teacherName}  - ${isAdmin() ? "👑" : ""}  (${classId})
                </h2>
                
                <button id="logoutUser">
                    Logg ut
                </button>

                <button id="changeClass">
                    Endre klasse
                </button>

                <button id="adminMode">
                    Administrator
                </button>
                
                <button class="admin-only" disabled id="importSchedule">
                    Importer JSON
                </button>
                
                <button class="admin-only" disabled  id="howToImport">
                    Bruk AI !
                </button>

                <button id="closeAdmin">    
                    Lukk
                </button>
            </div>

        </div>
        `
    );

    document
    .getElementById(
        "adminMode"
    )
    ?.addEventListener(
        "click",
        adminModeLogin
    );
    
    document
    .getElementById(
        "changeClass"
    )
    ?.addEventListener(
        "click",
        openChangeClassModal
    );
    
    document
        .getElementById(
            "logoutUser"
        )
        ?.addEventListener(
            "click",
            logoutUser
        );
    document
        .getElementById("importSchedule")
        ?.addEventListener(
            "click",
            openImportModal
        );
    document
    .getElementById("howToImport")
    ?.addEventListener(
        "click",
        openImportHelpModal
    );

    document
    .getElementById(
        "closeAdmin"
    )
    ?.addEventListener(
        "click",
        closeAdminPanel
    );
    
}

export function openImportModal() {

    if (document.getElementById("importModal")) {
        return;
    }

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="importModal">

            <div
                class="modal-card">

                <h2>
                    Importer timeplan, se FØRST instruksjon i "Bruk AI !"
                </h2>

                <textarea
                    id="scheduleJson"
                    rows="20"
                    style="width:100%;"></textarea>

                <br><br>

                <button id="saveSchedule">
                    Lagre
                </button>

                <button id="closeImport">    
                    Lukk
                </button>

            </div>

        </div>
        `
    );


    document
        .getElementById("saveSchedule")
        ?.addEventListener(
            "click",
            saveImportedSchedule
        );
    document
       .getElementById(
        "closeImport"
    )
    ?.addEventListener(
        "click",
        closeImportPanel
    );
    
}
export function openImportHelpModal() {

    if (
        document.getElementById(
            "importHelpModal"
        )
    ) {
        return;
    }

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="importHelpModal">

            <div
                class="modal-card">

                <h2>
                    Import fra bilde
                </h2>

                <p>
                    1. Ta skjermbilde av timeplanen.
                </p>

                <p>
                    2. Åpne Copilot eller ChatGPT.
                </p>

                <p>
                    3. Lim inn bildet.
                </p>

                <p>
                    4. Kopier prompten nedenfor.
                </p>

                <textarea
                    readonly
                    rows="15"
                    style="width:100%;">

Les timeplanbildet.

Returner KUN gyldig JSON.

Format:

{
  "classId": "1STB",
  "lessons": []
}

Regler:

- Returner kun JSON
- Bytt ut verdien i classId med det som står i boksen oppe til venstre i bildet
- Ingen markdown
- Ingen forklaringer
- weekday:
  Mandag=1
  Tirsdag=2
  Onsdag=3
  Torsdag=4
  Fredag=5
- Ett objekt per undervisningsøkt
- lessonId skal være unik
- Ta med subject
-- Hvis subject eller tekst nedenfor denne er "Blokk", skal subject være "<subject> - Blokk"
-- Hvis det er flere økter på samme tid i samme dag, skal subject være "Blokk". Da skal alle andre økter i samme tid og dag hoppes over
- Ta med teacherName hvis synlig.  Hvis det finnes flere lærere, skal teacherName være tom
- Ta med roomName hvis synlig.  Hvis det finnes flere rom, skal roomName være tom
- Ta med start og end. Hvis start og end ikke er synlig, sammenlign med tidene i nabodagene.
- Ikke ta med color
- JSON skal kunne leses direkte av JSON.parse()
                </textarea>

                <br><br>

                <button
                    id="copyPrompt">

                    Kopier prompt

                </button>

                <button
                    id="closeImportHelp">

                    Lukk

                </button>

            </div>

        </div>
        `

    );

    document
        .getElementById(
            "copyPrompt"
        )
        ?.addEventListener(
            "click",
            copyImportPrompt
        );

    document
        .getElementById(
            "closeImportHelp"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "importHelpModal"
                    )
                    ?.remove();

            }
        );
        document
       .getElementById(
        "closeImportHelp"
    )
    ?.addEventListener(
        "click",
        closeImportHelpPanel
    );
}

async function copyImportPrompt() {

    const prompt = `Les timeplanbildet.

Returner KUN gyldig JSON.

Format:

{
  "classId": "1STB",
  "lessons": []
}

Regler:

- Returner kun JSON
- Ingen markdown
- classId skal få verdi fra teksten i en liten boks oppe til venstre
- Ingen forklaringer
- weekday:
  Mandag=1
  Tirsdag=2
  Onsdag=3
  Torsdag=4
  Fredag=5
- Ett objekt per undervisningsøkt
- lessonId skal være unik
- Ta med subject
-- Hvis tekst inneholder ordet "Blokk", skal subject være "<subject> - Blokk"
-- Hvis det er flere økter på samme tidspunkt skal du kun bruke økten merket med "Blokk", hopp over de andre.
- Ta med teacherName hvis synlig, men hvis det finnes flere lærere skal ikke lærer tas med
- Ta med roomName hvis synlig, men hvis det finnes flere rom i økta skal ikke roomName tas med
- Ta med start og end. Hvis det ikke er mulig å lese start og end, sammenlign med nabodagene og bruk de riktige verdiene.
- Ikke ta med color
- JSON skal kunne leses direkte av JSON.parse()`;

    await navigator.clipboard.writeText(
        prompt
    );

    alert(
        "Prompt kopiert."
    );

}

async function saveImportedSchedule() {

    const jsonText =
        document.getElementById(
            "scheduleJson"
        ).value;

    try {

        const data =
            JSON.parse(jsonText);

        if (!data.classId) {

            alert(
                "Mangler classId"
            );

            return;

        }

       if (!Array.isArray(data.lessons)) {

    alert(
        "Mangler lessons-array"
    );

    return;

}

const lessons = data.lessons.map(
    lesson => ({
        lessonId: lesson.lessonId || "",
        subject: lesson.subject || "",
        teacherName: lesson.teacherName || "",
        roomName: lesson.roomName || "",
        start: lesson.start || "",
        end: lesson.end || "",
        weekday: lesson.weekday || 1,
        color: lesson.color || "default"
    })
);

await setDoc(
    doc(
        db,
        "schedules",
        data.classId
    ),
    {
        lessons: lessons
    }
);

// ----------------
// Lagre klasse hvis den ikke finnes
// ------------------
await setDoc(
    doc(
        db,
        "classes",
        data.classId
    ),
    {
        name: data.classId
    },
    {
        merge: true
    }
);

        
        
        alert(
            `Timeplan for ${data.classId} lagret`
        );

        console.log(data);

    }

    catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}

function toggleTeacherNames() {

    const current =

        localStorage.getItem(
            "showTeacherNames"
        ) === "true";

    localStorage.setItem(

        "showTeacherNames",

        (!current).toString()

    );

    location.reload();
}

function toggleRooms() {

    const current =

        localStorage.getItem(
            "showRooms"
        ) === "true";

    localStorage.setItem(

        "showRooms",

        (!current).toString()

    );

    location.reload();
}

function closeToolsPanel() {

    document
        .getElementById(
            "toolsModal"
        )
        ?.remove();

}

function closeAdminPanel() {

    document
        .getElementById(
            "adminModal"
        )
        ?.remove();

}


function closeImportPanel() {

    document
        .getElementById(
            "importModal"
        )
        ?.remove();

}

function closeImportHelpPanel() {

    document
        .getElementById(
            "importHelpModal"
        )
        ?.remove();

}


async function openChangeClassModal() {

    if (
        document.getElementById(
            "changeClassModal"
        )
    ) {
        return;
    }

    document.body.insertAdjacentHTML(
        "beforeend",
        `
        <div
            class="modal"
            id="changeClassModal">

            <div
                class="modal-card">

                <h2>
                    Velg klasse
                </h2>

                <select
                    id="teacherClassSelect"
                    style="width:100%">
                </select>

                <br><br>

                <button
                    id="saveClassChange">

                    Bytt klasse

                </button>

                <button
                    id="closeClassChange">

                    Lukk

                </button>

            </div>

        </div>
        `
    );

    const select =
        document.getElementById(
            "teacherClassSelect"
        );

    const classes =
        await loadClasses();

    classes.forEach(
        item => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item.id;

            option.textContent =
                item.name;

            select.appendChild(
                option
            );
        }
    );

    select.value =
        localStorage.getItem(
            "classId"
        ) || "";

    document
        .getElementById(
            "saveClassChange"
        )
        ?.addEventListener(
            "click",
            saveClassChange
        );

    document
        .getElementById(
            "closeClassChange"
        )
        ?.addEventListener(
            "click",
            closeChangeClassModal
        );
}

async function saveClassChange() {

    const classId =
        document.getElementById(
            "teacherClassSelect"
        ).value;

    if (!classId) {
        return;
    }

    closeChangeClassModal();
    closeAdminPanel();

    await reloadScheduleForClass(
        classId
    );
}

function closeChangeClassModal() {

    document
        .getElementById(
            "changeClassModal"
        )
        ?.remove();
}


function adminModeLogin() {

    if (isAdmin()) {

        alert(
            "Administrator er allerede aktiv."
        );

        return;
    }

    const password =
        prompt(
            "Administratorpassord"
        );

    if (
        password !==
        "NESBRU2025"
    ) {

        alert(
            "Feil passord"
        );

        return;
    }

    enableAdminMode();

    alert(
        "Administrator aktivert."
    );
}
