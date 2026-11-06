import { db }
from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    collection,
    getDocs
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function saveTeacherHomework(
    classId,
    lessonId,
    week,
    text
) {

    const documentId =
        `${classId}_${lessonId}_${week}`;

    await setDoc(

        doc(
            db,
            "teacherHomework",
            documentId
        ),

        {
            classId,
            lessonId,
            week,
            text,
            updatedAt:
                serverTimestamp()
        }

    );
}

export async function loadTeacherHomework(
    classId,
    lessonId,
    week
) {

    const documentId =
        `${classId}_${lessonId}_${week}`;

    const snapshot =
        await getDoc(

            doc(
                db,
                "teacherHomework",
                documentId
            )
        );

    if (
        !snapshot.exists()
    ) {

        return {
            text: ""
        };
    }

    return snapshot.data();
}

export async function loadAllTeacherHomework() {

    const result = {};

    const snapshot =
        await getDocs(

            collection(
                db,
                "teacherHomework"
            )
        );

    snapshot.forEach(
        docSnap => {

            result[
                docSnap.id
            ] =
                docSnap.data();
        }
    );

    return result;
}
