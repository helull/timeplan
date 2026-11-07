import {
    doc,
    setDoc,
    serverTimestamp
}
from "firebase/firestore";

import {
    db
}
from "./firebase.js";

export async function submitTeacherRequest(
    request
) {

    const email =
        request.email
            .trim()
            .toLowerCase();

    if (
        !email.endsWith(
            "@afk.no"
        )
    ) {

        throw new Error(
            "Kun AFK-epost er tillatt"
        );
    }

    await setDoc(
        doc(
            db,
            "teacherRequests",
            email
        ),
        {
            name:
                request.name
                    .trim(),

            email:
                email,

            approved:
                false,

            createdAt:
                serverTimestamp()
        }
    );
}
