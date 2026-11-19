import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";



const password =
    prompt(
        "Administratorpassord"
    );

if (
    password !==
    "NESBRU2025"
) {

    document.body.innerHTML =
        "<h2>Ingen tilgang</h2>";

    throw new Error(
        "Ingen tilgang"
    );
}



listenForRequests();



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
