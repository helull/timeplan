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
    dialog.style.cssText = "position:fixed;inset:0;margin:auto;width:min(92vw,400px);max-height:90dvh;overflow:auto;box-sizing:border-box;border:0;border-radius:18px;padding:24px;background:white;color:#172033;box-shadow:0 18px 60px #0003";
    const returning = localStorage.getItem("staffHasLoggedIn") === "true";
    dialog.innerHTML = `
        <form id="staffLoginForm" style="display:grid;gap:12px">
            <button type="button" id="staffClose" aria-label="Avbryt" style="position:absolute;right:12px;top:8px;width:36px;height:36px;margin:0;padding:0;background:transparent;color:#64748b;box-shadow:none;font-size:26px">×</button>
            <h2 style="margin:0 30px 8px 0">Lærerinnlogging</h2>
            <label>E-postadresse<input id="staffEmail" type="email" autocomplete="username" required style="display:block;width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:8px;margin-top:5px;font-size:16px"></label>
            <label>Passord<input id="staffPassword" type="password" autocomplete="current-password" required style="display:block;width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:8px;margin-top:5px;font-size:16px"></label>
            <p id="staffStatus" role="status"></p>
            <button type="submit" style="margin:0;padding:12px;box-shadow:none">Logg inn</button>
            <button type="button" id="staffRegister" style="margin:0;padding:12px;box-shadow:none">Registrer lærer</button>
            <button type="button" id="staffForgot" style="margin:0;padding:8px;background:transparent;color:#475569;box-shadow:none;font-size:14px;text-decoration:underline">Glemt passord?</button>
        </form>`;
    const primary = dialog.querySelector(returning ? '[type="submit"]' : '#staffRegister');
    const secondary = dialog.querySelector(returning ? '#staffRegister' : '[type="submit"]');
    primary.style.cssText += ";background:#2563eb;color:white;border:1px solid #2563eb;font-weight:700;width:100%";
    secondary.style.cssText += ";background:white;color:#2563eb;border:1px solid #cbd5e1;font-weight:500;width:100%";
    primary.before(secondary);
    if (!returning) secondary.before(primary);
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
            localStorage.setItem("staffHasLoggedIn", "true");
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
