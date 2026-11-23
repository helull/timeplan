import {
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";

// Adminrettigheter gjelder kun så lenge denne siden er lastet.
// Fjern også eventuell status fra eldre versjoner.
let adminActive = false;
sessionStorage.removeItem("adminMode");

export function isTeacher() {

    return (
        localStorage.getItem(
            "userType"
        ) === "teacher"
    );
}

export async function giveTeacherName(teacherId) {

    const teacherRef = doc(
        db,
        "teachers",
        teacherId
    );
    
   console.log("teacherId: ",teacherId);
       console.log("teacherRef: ",teacherRef);

    
    const snapshot =
        await getDoc(teacherRef);

    if (!snapshot.exists()) {
        return null;
    }
    
    console.log("snapshot.data().name er",snapshot.data().name)
    const profile = snapshot.data();
    const link = profile.timeplanTilknytning;
    return (link?.status === "bekreftet" && String(link.navn || "").trim())
        ? link.navn.trim()
        : profile.name;
}

export async function giveTeacherId() {
    return localStorage.getItem("teacherId")
}

export function loginTeacher(
    teacherId
) {

    localStorage.setItem(
        "userType",
        "teacher"
    );

    localStorage.setItem(
        "teacherId",
        String(teacherId || '').trim().toLowerCase()
    );
    
    disableAdminMode();
    
    applyTeacherMode();
}

export function logoutTeacher() {

    localStorage.setItem(
        "userType",
        "student"
    );

    localStorage.removeItem(
        "teacherId"
    );

    removeTeacherMode();
}

export function applyTeacherMode() {

    document
        .getElementById(
            "menuButton"
        )
        ?.classList.add(
            "teacher-mode"
        );

    document
        .querySelectorAll(
            ".teacher-only"
        )
        .forEach(
            button => {

                button.classList.add(
                    "teacher-active"
                );

                button.disabled = false;
            }
        );
}

export function removeTeacherMode() {

    document
        .getElementById(
            "menuButton"
        )
        ?.classList.remove(
            "teacher-mode"
        );

    document
        .querySelectorAll(
            ".teacher-only"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "teacher-active"
                );

                button.disabled = true;
            }
        );
}

export function initializeTeacherMode() {

    if (isTeacher()) {

        applyTeacherMode();

    } else {

        removeTeacherMode();
    }

    if (isAdmin()) {

        applyAdminMode();

    } else {

        removeAdminMode();
    }
}


export function isAdmin() {
    return adminActive;
}

export function enableAdminMode() {
    adminActive = true;
    sessionStorage.removeItem("adminMode");
    applyAdminMode();
}

export function disableAdminMode() {
    adminActive = false;
    sessionStorage.removeItem("adminMode");
    removeAdminMode();
}

export function applyAdminMode() {

    document
        .querySelectorAll(
            ".admin-only"
        )
        .forEach(
            item => {

                item.classList.add(
                    "admin-active"
                );

                item.disabled = false;
            }
        );
        updateAdminButton();
}

export function removeAdminMode() {

    document
        .querySelectorAll(
            ".admin-only"
        )
        .forEach(
            item => {

                item.classList.remove(
                    "admin-active"
                );

                item.disabled = true;
            }
        );
        updateAdminButton();
}

export function updateAdminButton() {

    const button =
        document.getElementById(
            "adminMode"
        );

    if (!button) {
        return;
    }

    if (isAdmin()) {

        button.style.background =
            "#ff0000";

        button.style.color =
            "#ffffff";

    } else {

        button.style.background =
            "";

        button.style.color =
            "";
    }
}
