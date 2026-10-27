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
    isTeacher
}
from "./teacher.js";

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

        🛠 Verktøy

    </button>
    `
);

    document
        .getElementById("toolButton")
        ?.addEventListener(
            "click",
            openToolsPanel
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

                <button id="logoutUser">
                    Logg ut
                </button>

                <button id="openAdmin">
                    Login lærer
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
            "openAdmin"
        )
        ?.addEventListener(
            "click",
            adminLogin
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

function adminLogin() {

    const password =
        prompt(
            "Lærerpassord"
        );

    if (
        password !==
        "TEMP123"
    ) {

        alert(
            "Feil passord"
        );

        return;
    }

    openAdminPanel();
}

function logoutUser() {

    localStorage.clear();

    location.reload();
}

export function openAdminPanel() {

    // Ikke åpne flere modaler samtidig
    if (document.getElementById("adminModal")) {
        return;
    }

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

                <button id="importSchedule">
                    Importer JSON
                </button>
                
                <button id="howToImport">
                    Hvordan importere fra bilde?
                </button>

                <button id="closeAdmin">    
                    Lukk
                </button>
            </div>

        </div>
        `
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
                    Importer timeplan
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
-- Hvis subject eller tekst under er "Blokk", skal subject være "<subject> - Blokk"
- Ta med teacherName hvis synlig
- Ta med roomName hvis synlig
- Ta med start og end
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
- Ta med teacherName hvis synlig
- Ta med roomName hvis synlig
- Ta med start og end
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


