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
            id="adminButton"
            class="admin-button">

            🛠 Administrasjon

        </button>
        `
    );

    document
        .getElementById("adminButton")
        ?.addEventListener(
            "click",
            openAdminPanel
        );
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

    document
        .getElementById("importSchedule")
        ?.addEventListener(
            "click",
            openImportModal
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

                <button
                    id="saveSchedule">

                    Lagre

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
