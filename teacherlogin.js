// teacherLogin.js

import {
    enableTeacherMode
}
from "./teacher.js";

export async function loginTeacher(){

    const password =
        prompt(
            "Lærerpassord"
        );

    if(
        password ===
        "TEMP123"
    ){

        enableTeacherMode();

        location.reload();
    }
}
