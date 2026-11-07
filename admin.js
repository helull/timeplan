import {
    getDocs,
    collection,
    doc,
    setDoc,
    deleteDoc
}
from "firebase/firestore";

import {
    db
}
from "./firebase.js";

loadRequests();

async function loadRequests() {

    const container =
        document.getElementById(
            "requests"
        );

    container.innerHTML =
        "";

    const snapshot =
        await getDocs(
            collection(
                db,
                "teacherRequests"
            )
        );

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
            <h3>${data.name}</h3>
            <p>${data.email}</p>

            <button
                data-id="${request.id}"
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


function addButtonEvents() {

    document
        .querySelectorAll(
            "button"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                    const email =
                        button.dataset.email;

                    const name =
                        button.dataset.name;

                    const requestId =
                        button.dataset.id;

                    await setDoc(
                        doc(
                            db,
                            "teachers",
                            email
                        ),
                        {
                            name,
                            email,
                            approved:
                                true
                        }
                    );

                    await deleteDoc(
                        doc(
                            db,
                            "teacherRequests",
                            requestId
                        )
                    );

                    loadRequests();
                };
            }
        );
}
