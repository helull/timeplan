// teacherLogin.js

import {
    enableTeacherMode,
    disableTeacherMode,
    isTeacher
}
from "./teacher.js";

export async function loginTeacher(){

    if (isTeacher()) {

        disableTeacherMode();

        location.reload();

        return;
    }

    const password =
        prompt(
            "Lærerpassord"
        );

    if (
        password ===
        "TEMP123"
    ) {

        enableTeacherMode();

        location.reload();
    }
}
