import {
    submitTeacherRequest
}
from "./teacherRequestService.js";

import {
    teacherApproved
}
from "./teacherService.js";

import {
    sendMagicLink
}
from "./authService.js";

import {
    studentExists,
    createStudent
}
from "./studentService.js";

import {
    loadClasses
}
from "./classService.js";

import {
    teacherExists
}
from "./teacherService.js";

import {
    loginTeacher
}
from "./teacher.js";

function askTeacherName() {
    return new Promise(resolve => {
        const backdrop=document.createElement('div');
        backdrop.style.cssText='position:fixed;inset:0;z-index:3000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
        const panel=document.createElement('div');
        panel.style.cssText='background:white;color:#172033;border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 15px 45px #0003';
        const title=document.createElement('h2');title.textContent='Hva heter du?';title.style.margin='0 0 10px';
        const description=document.createElement('p');description.textContent='Skriv inn navnet ditt. Hvis du finnes i skolens importerte timeplan, kan du velge navnet ditt der i neste steg.';
        const field=document.createElement('input');field.placeholder='Fornavn og etternavn';field.type='text';field.autocomplete='name';field.style.cssText='box-sizing:border-box;width:100%;padding:12px;border:1px solid #94a3b8;border-radius:9px;font-size:16px';
        const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px;justify-content:flex-end;margin-top:18px';
        const cancel=document.createElement('button');cancel.textContent='Avbryt';cancel.type='button';
        const ok=document.createElement('button');ok.textContent='Fortsett';ok.type='button';ok.disabled=true;
        const finish=value=>{document.removeEventListener('keydown',onKey);backdrop.remove();resolve(value);};
        const onKey=e=>{if(e.key==='Escape')finish(null);};
        field.oninput=()=>{ok.disabled=!field.value.trim();};
        field.onkeydown=e=>{if(e.key==='Enter'&&field.value.trim())finish(field.value.trim());};
        cancel.onclick=()=>finish(null);ok.onclick=()=>finish(field.value.trim());
        document.addEventListener('keydown',onKey);
        actions.append(cancel,ok);panel.append(title,description,field,actions);backdrop.append(panel);document.body.append(backdrop);field.focus();
    });
}

export async function showRegister() {

    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="register-screen"
            id="registerScreen">

            <div
                class="register-card">

                <h2>
                    Velkommen
                </h2>

                <input
                    id="nameInput"
                    placeholder="Navn">

                <select
                    id="classSelect">
                </select>

                <button
                    id="startButton">

                    Fortsett

                </button>

                <hr>

                <button
                    id="teacherLoginButton">

                    Lærerinnlogging

                </button>

            </div>

        </div>
        `
    );

    const classSelect =
        document.getElementById(
            "classSelect"
        );

    const classes =
        await loadClasses();

    classes.forEach(item => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            item.id;

        option.textContent =
            item.name;

        classSelect.appendChild(
            option
        );

    });

    const startButton =
        document.getElementById(
            "startButton"
        );

    startButton.addEventListener(

        "click",

        async () => {

            const name =

                document
                .getElementById(
                    "nameInput"
                )
                .value
                .trim();

            if (!name) {

                alert(
                    "Skriv inn navn"
                );

                return;
            }

            const selectedClass =

                document
                .getElementById(
                    "classSelect"
                )
                .value;

            const studentId =

                `${name}_${selectedClass}`;

            const exists =

                await studentExists(
                    studentId
                );

            if (exists) {

                alert(
                    "Navnet finnes allerede i denne klassen."
                );

                return;
            }

            await createStudent(

                studentId,
                name,
                selectedClass

            );

            localStorage.setItem(
                "userType",
                "student"
            );

            localStorage.setItem(
                "studentName",
                name
            );

            localStorage.setItem(
                "classId",
                selectedClass
            );

            localStorage.setItem(
                "studentId",
                studentId
            );

            location.reload();
        }

    );

    const teacherButton =
    document.getElementById(
        "teacherLoginButton"
    );

teacherButton.addEventListener(
    "click",
    async () => {

        const email =
            prompt(
                "AFK e-post"
            );

        if (!email) {
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const approved =
            await teacherApproved(
                normalizedEmail
            );

        if (approved) {

            loginTeacher(
                normalizedEmail
            );

            location.reload();

            return;
        }

        const name = await askTeacherName();

        if (!name) {
            return;
        }

        await submitTeacherRequest({
            name,
            email: normalizedEmail
        });

        alert(
            "Forespørsel sendt. Du må godkjennes før første innlogging."
        );
    }
);    
    
}
