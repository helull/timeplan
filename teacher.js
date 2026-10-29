export function isTeacher(){

    return localStorage.getItem(
        "teacherMode"
    ) === "true";
}

export function enableTeacherMode(){

    localStorage.setItem(
        "teacherMode",
        "true"
    );

    document
        .getElementById(
            "menuButton"
        )
        .classList.add(
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

export function disableTeacherMode(){

    localStorage.setItem(
        "teacherMode",
        "false"
    );

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
