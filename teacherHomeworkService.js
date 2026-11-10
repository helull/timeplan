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
    text,
    teacherId
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
            teacherId,
            updatedAt:
                serverTimestamp()
        }

    );
}

export async function loadTeacherHomework(
    classId,
    lessonId,
    week,
    teacherId
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

    const snapshot.data();
    
    // Hvis teacherId er satt, returner kun data som matcher
    if (teacherId !== "" && data.teacherId !== teacherId) {
        return {
            text: ""
        };
    }

    return data;
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
