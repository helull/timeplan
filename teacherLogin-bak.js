// teacherLogin.js

import {
    applyTeacherMode,
    removeTeacherMode,
    isTeacher
}
from "./teacher.js";

export async function loginTeacher(){

    if (isTeacher()) {

        removeTeacherMode();

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

        applyTeacherMode();

        location.reload();
    }
}
