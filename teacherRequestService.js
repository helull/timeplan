import {
    addDoc,
    collection,
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

    await addDoc(
        collection(
            db,
            "teacherRequests"
        ),
        {
            name:
                request.name,

            email:
                request.email
                    .toLowerCase(),

            approved:
                false,

            createdAt:
                serverTimestamp()
        }
    );
}
