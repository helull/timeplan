import { db }
from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function saveHomework(
    lessonId,
    week,
    text
) {

    const studentId =
        localStorage.getItem(
            "studentId"
        );

    const documentId =
        `${studentId}_${lessonId}_${week}`;

    await setDoc(

        doc(
            db,
            "homework",
            documentId
        ),

        {
            studentId,
            lessonId,
            week,
            text,
            updatedAt:
                serverTimestamp()
        }

    );
}

export async function loadHomework(
    lessonId,
    week
) {

    const studentId =
        localStorage.getItem(
            "studentId"
        );

    const documentId =
        `${studentId}_${lessonId}_${week}`;

    const snap =
        await getDoc(

            doc(
                db,
                "homework",
                documentId
            )

        );

    if (
        !snap.exists()
    ) {

        return "";
    }

    return (
        snap.data().text
        || ""
    );
}
