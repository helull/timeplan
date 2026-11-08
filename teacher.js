import {
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";

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

    const snapshot =
        await getDoc(teacherRef);

    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.data().name;
}

export function giveTeacherId() {
    if isTeacher() {
        return localStorage.getItem("teacherId")
    } else {
        return null;
    }
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
        teacherId
    );
    
    sessionStorage.removeItem("adminMode");
    
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

    return (
        sessionStorage.getItem(
            "adminMode"
        ) === "true"
    );
}

export function enableAdminMode() {

    sessionStorage.setItem(
        "adminMode",
        "true"
    );

    applyAdminMode();
}

export function disableAdminMode() {

    sessionStorage.removeItem(
        "adminMode"
    );

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
}
