import { db }
from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function studentExists(
    studentId
){

    const snap =
        await getDoc(
            doc(
                db,
                "students",
                studentId
            )
        );

    return snap.exists();
}

export async function createStudent(
    studentId,
    name,
    classId
){

    await setDoc(

        doc(
            db,
            "students",
            studentId
        ),

        {
            name,
            classId,
            createdAt:
                serverTimestamp()
        }

    );
}
