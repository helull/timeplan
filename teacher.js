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
}

export function disableTeacherMode(){

    localStorage.removeItem(
        "teacherMode"
    );
}
