import { db }
from "./firebase.js";

import {
    doc,
    getDoc
}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function loadSchedule(
    classId
){

    const snap =
        await getDoc(
            doc(
                db,
                "schedules",
                classId
            )
        );

    if (!snap.exists()) {

        return {
            lessons: []
        };
    }

    return snap.data();
}
