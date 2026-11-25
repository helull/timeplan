import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { signInStudent, signInStaff } from "./secureAuth.js";
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

    await signInStudent();
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

            try {
            const studentId =

                (await signInStudent()).uid;

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
            } catch (error) { alert("Kunne ikke registrere elev. Prøv igjen."); }
        }

    );

    const teacherButton =
    document.getElementById(
        "teacherLoginButton"
    );

teacherButton.addEventListener("click", () => {
    if (document.getElementById("staffLoginDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "staffLoginDialog";
    dialog.style.cssText = "width:min(90vw,400px);border:0;border-radius:14px;padding:24px";
    dialog.innerHTML = `
        <form id="staffLoginForm" style="display:grid;gap:12px">
            <h2>Lærerinnlogging</h2>
            <label>E-postadresse<input id="staffEmail" type="email" autocomplete="username" required style="width:100%"></label>
            <label>Passord<input id="staffPassword" type="password" autocomplete="current-password" required style="width:100%"></label>
            <p id="staffStatus" role="status"></p>
            <button type="submit">Logg inn</button>
            <button type="button" id="staffRegister">Registrer lærer</button>
            <button type="button" id="staffForgot">Glemt passord?</button>
            <button type="button" id="staffClose">Avbryt</button>
        </form>`;
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove());
    dialog.addEventListener("cancel", event => { if (dialog.querySelector('[type="submit"]').disabled) event.preventDefault(); });
    dialog.querySelector("#staffClose").onclick = () => dialog.close();
    dialog.querySelector("#staffForgot").onclick = () => {
        const email = dialog.querySelector("#staffEmail");
        if (!email.reportValidity()) return;
        const subject = "Timeplan – glemt passord";
        const body = "Hei! Jeg har glemt passordet til timeplanen.\n\nE-postadresse: " + email.value.trim() + "\nNavn: \n\nVennligst hjelp meg med å gjenopprette innloggingen.";
        const status = dialog.querySelector("#staffStatus");
        status.textContent = "Send den ferdig utfylte e-posten i e-postprogrammet ditt. Ikke oppgi passord.";
        location.href = "mailto:helge_ullern@yahoo.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    };
    dialog.querySelector("form").onsubmit = async event => {
        event.preventDefault();
        const submit = dialog.querySelector('[type="submit"]');
        const controls = [...dialog.querySelectorAll('button')];
        controls.forEach(b => b.disabled = true);
        try {
            const identity = await signInStaff(dialog.querySelector("#staffEmail").value, dialog.querySelector("#staffPassword").value);
            loginTeacher(identity.teacherId);
            location.reload();
        } catch (error) {
            dialog.querySelector("#staffStatus").textContent = "Innlogging mislyktes. Kontroller opplysningene eller velg Glemt passord.";
            console.error("Lærerinnlogging mislyktes:", error.code || error.message);
        } finally { controls.forEach(b => b.disabled = false); }
    };
    dialog.querySelector("#staffRegister").onclick = async () => {
        const email = dialog.querySelector("#staffEmail").value.trim().toLowerCase();
        const password = dialog.querySelector("#staffPassword").value;
        const status = dialog.querySelector("#staffStatus");
        if (!/^[^\s@]+@afk\.no$/.test(email) || password.length < 6) {
            status.textContent = "Oppgi AFK-adresse og et passord på minst seks tegn."; return;
        }
        const name = prompt("Ditt fulle navn slik du ønsker det vist i timeplanen")?.trim();
        if (!name || name.length > 120) return;
        const controls = [...dialog.querySelectorAll("button")];
        controls.forEach(b => b.disabled = true);
        try {
            let credential;
            try { credential = await createUserWithEmailAndPassword(auth, email, password); }
            catch (error) {
                if (error.code !== "auth/email-already-in-use") throw error;
                credential = await signInWithEmailAndPassword(auth, email, password);
            }
            const uid = credential.user.uid;
            const role = await getDoc(doc(db, "userRoles", uid));
            if (role.exists()) { status.textContent = "Kontoen er allerede godkjent. Bruk Logg inn."; return; }
            const ref = doc(db, "teacherRequests", uid);
            if (!(await getDoc(ref)).exists()) await setDoc(ref, {name, email:credential.user.email, approved:false, createdAt:serverTimestamp()});
            status.textContent = "Registreringsforespørselen er sendt. Vent på godkjenning fra administrator.";
        } catch (error) {
            status.textContent = "Registrering mislyktes. Kontroller opplysningene eller kontakt administrator.";
            console.error(error.code || error.message);
        } finally {
            if (auth.currentUser && !auth.currentUser.isAnonymous) await signOut(auth);
            await signInStudent();
            dialog.querySelector("#staffPassword").value = "";
            controls.forEach(b => b.disabled = false);
        }
    };
    dialog.showModal();
});
}
