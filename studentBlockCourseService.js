import {
    doc,
    getDoc,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { db } from "./firebase.js";

export async function loadStudentBlockCourses(
    studentId
) {
    const ref =
        doc(
            db,
            "students",
            studentId
        );

    const snap =
        await getDoc(ref);

    if (!snap.exists()) {
        return [];
    }

    return (
        snap.data()
            .selectedBlockCourses
    ) || [];
}

export async function saveStudentBlockCourse(
    studentId,
    blockCourseId
) {
    const existing =
        await loadStudentBlockCourses(
            studentId
        );

    if (
        existing.includes(
            blockCourseId
        )
    ) {
        return;
    }

    await updateDoc(
        doc(
            db,
            "students",
            studentId
        ),
        {
            selectedBlockCourses: [
                ...existing,
                blockCourseId
            ]
        }
    );
}

export async function removeStudentBlockCourse(
    studentId,
    blockCourseId
) {
    const existing =
        await loadStudentBlockCourses(
            studentId
        );

    await updateDoc(
        doc(
            db,
            "students",
            studentId
        ),
        {
            selectedBlockCourses:
                existing.filter(
                    id =>
                        id !==
                        blockCourseId
                )
        }
    );
}
