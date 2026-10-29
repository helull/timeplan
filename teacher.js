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
    document.getElementById("menuButton").classList.add("teacher-mode");
        document
        .querySelectorAll(
            ".delete-week-holiday"
        )
        .forEach(
            button =>
                button.disabled = false
        );

    document
        .querySelectorAll(
            ".delete-day-holiday"
        )
        .forEach(
            button =>
                button.disabled = false
        );
}

export function disableTeacherMode(){

    localStorage.removeItem(
        "teacherMode"
    );
    
    document.getElementById("menuButton").classList.remove("teacher-mode");

        document
        .querySelectorAll(
            ".delete-week-holiday"
        )
        .forEach(
            button =>
                button.disabled = true
        );

    document
        .querySelectorAll(
            ".delete-day-holiday"
        )
        .forEach(
            button =>
                button.disabled = true
        );
}
