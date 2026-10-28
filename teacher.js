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
}

export function disableTeacherMode(){

    localStorage.removeItem(
        "teacherMode"
    );
    document.getElementById("menuButton").classList.remove("teacher-mode");

}
