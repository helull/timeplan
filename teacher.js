export function isTeacher() {

    return (
        localStorage.getItem(
            "userType"
        ) === "teacher"
    );
}

export function loginTeacher(
    teacherName
) {

    localStorage.setItem(
        "userType",
        "teacher"
    );

    localStorage.setItem(
        "teacherName",
        teacherName
    );

    applyTeacherMode();
}

export function logoutTeacher() {

    localStorage.setItem(
        "userType",
        "student"
    );

    localStorage.removeItem(
        "teacherName"
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

    if (
        localStorage.getItem(
            "userType"
        ) === "teacher"
    ) {

        applyTeacherMode();

    } else {

        removeTeacherMode();
    }
}
