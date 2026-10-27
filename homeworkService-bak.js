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
    location.reload();
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

export async function loadAllHomework() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "homework"
            )
        );

    const studentId =
        localStorage.getItem(
            "studentId"
        );

    const homeworkMap = {};

    snapshot.docs.forEach(
        doc => {

            const data =
                doc.data();

            if (
                data.studentId !==
                studentId
            ) {
                return;
            }

            const key =
                `${data.lessonId}_${data.week}`;

            homeworkMap[key] =
                data.text;
        }
    );

    return homeworkMap;
}
