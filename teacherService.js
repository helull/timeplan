import {
    doc,
    getDoc
}
from
"https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    db
}
from "./firebase.js";

export async function teacherExists(
    teacherId
) {

    const snapshot =
        await getDoc(
            doc(
                db,
                "teachers",
                teacherId
            )
        );

    return snapshot.exists();
}
