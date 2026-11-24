import {openTeacherLinkDialog} from "./teacherScheduleLink.js";
import {showScheduleView, currentScheduleView} from "./app.js";
import { visLitePassordvindu } from "./litePassordvindu.js";
import { openProveplan } from "./proveplan.js";

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
    isAdmin,
    applyAdminMode,
    disableAdminMode,
    giveTeacherName,
    giveTeacherId
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

export function renderButton() {

    if (!isAdmin()) {
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

function refreshAdminMenuVisibility() {
    document.querySelectorAll("[data-admin-menu-only]").forEach(button => {
        button.hidden = !isAdmin();
        button.style.display = isAdmin() ? "" : "none";
    });
}

window.addEventListener("admin-mode-changed", refreshAdminMenuVisibility);

export function openToolsPanel() {

    /* kan  umulig fungere
    const showRoomsenabled = localStorage.getItem("showNames") === "true";
    const roomsenabled = localStorage.getItem("showRooms") === "true";
    */
    
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

                <button id="toggleTeacherNames" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">
                   Vis/skjul lærer
                </button>
                
                <button id="toggleRooms" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">
                  Vis/skjul rom
                </button>

                <button id="openProveplanTools" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">Prøveplan</button>

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
        .getElementById("openProveplanTools")
        ?.addEventListener("click", openProveplan);

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
    const message = isTeacher()
        ? "Vil du logge ut som lærer?\n\nLærerlekser, blokkfag og andre lagrede opplysninger blir ikke slettet."
        : "Vil du logge ut og velge en annen klasse?\n\nPersonlige lekser på denne enheten kan bli utilgjengelige etter utlogging.";
    let svar = confirm(message);
    if (!svar) {
         return;
    }

    // Vis riktig melding mens lærerøkten avsluttes.
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    if (loadingText) loadingText.textContent = "Logger ut...";
    if (overlay) {
        overlay.hidden = false;
        overlay.style.display = "";
        overlay.classList.remove("swipe-guide-done");
        overlay.style.opacity = "1";
    }
    disableAdminMode();
    localStorage.clear();
    // Gi nettleseren tid til å vise meldingen før ny innlogging lastes.
    setTimeout(() => location.reload(), 450);
}

export async function openAdminPanel() {

    // Ikke åpne flere modaler samtidig
    if (document.getElementById("adminModal")) {
        return;
    }

    const teacherId = await giveTeacherId();

    console.log("teacherId", teacherId);
    
    const teacher = await giveTeacherName(teacherId);

    console.log("teacher", teacher);


    

    const classId =
    localStorage.getItem(
        "classId"
    ) || "";
    const displayedSchedule = currentScheduleView() === "teacher"
        ? "egen timeplan"
        : classId;
    
    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="adminModal">

            <div
                class="modal-card">

                <h2>
                    Administrasjon - ${teacher}  -  (${displayedSchedule})
                </h2>
                
                <button id="openProveplanAdmin" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">Prøveplan</button>
                <button id="adminToggleTeacherNames" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">Vis/skjul lærer</button>
                <button id="adminToggleRooms" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">Vis/skjul rom</button>

                <button id="logoutUser">
                    Logg ut
                </button>

                <button id="changeTeacherScheduleLink">Min tilknytning til timeplanen</button>
                <label for="progressImportMode" style="display:block;margin-top:12px">Importmodus for fremdriftsplan</label>
                <select id="progressImportMode" style="width:100%">
                    <option value="none">Ingen</option>
                    <option value="standard">Standard</option>
                    <option value="advanced">Avansert</option>
                </select>
                <small style="display:block;color:#64748b;font-size:12px;margin:5px 0 12px;">Valget lagres automatisk på denne enheten.</small>

                <button id="changeClass" data-admin-menu-only style="display:${isAdmin() ? "" : "none"}">
                    Bytt klasse
                </button>


               
                <button class="admin-only" disabled id="importSchedule">
                    Lag en timeplan
                </button>
                
                <button class="admin-only" disabled  id="howToImport">
                    AI-prompt
                </button>

                <div style="margin-top:18px;padding-top:10px;border-top:1px solid #cbd5e1;text-align:right;">
                    <button id="adminMode" style="background:transparent;color:#475569;border:1px solid #94a3b8;box-shadow:none;font-size:12px;font-weight:500;padding:5px 10px;min-height:28px;width:auto;margin:0;border-radius:6px;">Admin</button>
                </div>

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
    
    const progressMode = document.getElementById("progressImportMode");
    progressMode.value = ["standard","advanced"].includes(localStorage.getItem("progressImportMode")) ? localStorage.getItem("progressImportMode") : "none";
    progressMode.addEventListener("change",()=>localStorage.setItem("progressImportMode",progressMode.value));

    document.getElementById("changeTeacherScheduleLink")?.addEventListener("click", async () => {
        document.getElementById("adminModal")?.remove();
        try {
            await openTeacherLinkDialog({force:true,onSaved: async status => {
                await showScheduleView(status==="bekreftet"?"teacher":"class",true);
            }});
        } catch(error) {console.error(error);alert("Kunne ikke åpne navnevalg.");}
    });

    document
    .getElementById(
        "changeClass"
    )
    ?.addEventListener(
        "click",
        openChangeClassModal
    );
    
    document
        .getElementById("openProveplanAdmin")
        ?.addEventListener("click", openProveplan);

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
    
    document.getElementById("adminToggleTeacherNames")?.addEventListener("click", toggleTeacherNames);
    document.getElementById("adminToggleRooms")?.addEventListener("click", toggleRooms);
    refreshAdminMenuVisibility();
    if (isAdmin()) {
        applyAdminMode();
    }
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
                    1. Ta skjermbilde av timeplanen til EN klasse i inSchool, velg timeplanvisning, så f.eks "1STA". Bildet må få med alle øktene i ett og samme bilde, forminsk visningen nok!
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
                <p>
                    5. Lim JSON-koden inn i "Lag en timeplan" i forrig meny.
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
-- Hvis det en dag er flere økter på SAMME tidspunkt, skal du kun lage en eneste økt.  Økten skal få subject "Blokk".  Det er viktig at du ikke hopper over denne timen, den skal være med, men siden subjectnavn er uklart pga flere muligheter, skal du gi subject navnet "Blokk"
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

    const newValue = localStorage.getItem("showTeacherNames") !== "true";

    localStorage.setItem("showTeacherNames",newValue.toString());

    document.querySelectorAll(".teacher").forEach(el =>  el.classList.toggle("teacherInvisible",!newValue));
}

function toggleRooms() {


    const newValue = localStorage.getItem("showRooms") !== "true";

    localStorage.setItem("showRooms",newValue.toString());

    document.querySelectorAll(".room").forEach(el =>  el.classList.toggle("roomInvisible",!newValue));

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


async function adminModeLogin() {
    if (isAdmin()) {
        disableAdminMode();
        return;
    }

    const button = document.getElementById("adminMode");
    if (button) button.disabled = true;
    try {
        const godkjent = await visLitePassordvindu({
            dokument: "adminAccess",
            tittel: "Administratormodus"
        });
        if (godkjent) enableAdminMode();
    } finally {
        if (button) button.disabled = false;
    }
}
