import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";



// Samme passordkilde som administratormodus i hovedprogrammet.
// Ingen forespørsler hentes før passordet er kontrollert.
const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("adminLoginStatus");
const loginButton = document.getElementById("adminLoginButton");

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const enteredPassword = document.getElementById("adminPassword").value;
    loginButton.disabled = true;
    loginStatus.textContent = "Kontrollerer passord ...";

    try {
        const snapshot = await getDoc(doc(db, "settings", "adminAccess"));
        const storedPassword = snapshot.exists() ? snapshot.data().password : null;
        if (typeof storedPassword !== "string" || !storedPassword || enteredPassword !== storedPassword) {
            loginStatus.textContent = "Feil passord, eller administratorpassord mangler.";
            return;
        }
        document.getElementById("adminLogin").hidden = true;
        document.getElementById("adminContent").hidden = false;
        document.getElementById("adminPassword").value = "";
        listenForRequests();
    } catch (error) {
        console.error("Kunne ikke kontrollere administratorpassord:", error);
        loginStatus.textContent = "Kunne ikke kontrollere passordet. Prøv igjen.";
    } finally {
        loginButton.disabled = false;
    }
});

function listenForRequests() {

    const container =
        document.getElementById(
            "requests"
        );

    onSnapshot(

        collection(
            db,
            "teacherRequests"
        ),

        snapshot => {

            container.innerHTML =
                "";

            if (
                snapshot.empty
            ) {

                container.innerHTML =
                `
                <div class="empty-message">
                    Ingen ventende forespørsler
                </div>
                `;

                return;
            }

            snapshot.forEach(
                request => {

                    const data =
                        request.data();

                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "request-card";

                    card.innerHTML =
                    `
                    <h3>
                        ${data.name}
                    </h3>

                    <p>
                        ${data.email}
                    </p>

                    <button
                        class="approve-button"
                        data-email="${data.email}"
                        data-name="${data.name}">
                        Godkjenn
                    </button>
                    `;

                    container.appendChild(
                        card
                    );
                }
            );

            addButtonEvents();
        }
    );
}



function addButtonEvents() {

    const buttons =
        document.querySelectorAll(
            ".approve-button"
        );

    buttons.forEach(
        button => {

            button.onclick =
                async () => {

                    const email =
                        button.dataset.email
                            .toLowerCase();

                    const name =
                        button.dataset.name;

                    try {

                        await setDoc(
                            doc(
                                db,
                                "teachers",
                                email
                            ),
                            {
                                name:
                                    name,

                                email:
                                    email,

                                approved:
                                    true,

                                createdAt:
                                    Date.now()
                            }
                        );

                        await deleteDoc(
                            doc(
                                db,
                                "teacherRequests",
                                email
                            )
                        );

                        console.log(
                            `${email} godkjent`
                        );

                    }
                    catch (
                        error
                    ) {

                        console.error(
                            error
                        );

                        alert(
                            "Kunne ikke godkjenne bruker."
                        );
                    }
                };
        }
    );
}
