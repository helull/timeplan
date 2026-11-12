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

export async function loadStudentsBlockCourseByLesson(lessonId) {

    // Hent lagrede blokkurs-ID-er fra localStorage
    const blockCourseIds = JSON.parse(
        localStorage.getItem("lessonIds") || "[]"
    );

    if (blockCourseIds.length === 0) {
        return null;
    }

    // Gå gjennom alle lagrede blokkurs
    for (const id of blockCourseIds) {

        const docSnap = await getDoc(
            doc(db, "blockCourses", id)
        );

        // Hopp over blokkurs som ikke finnes i Firebase
        if (!docSnap.exists()) {
            continue;
        }

        const data = docSnap.data();

        // Undersøk om blokkurs inneholder lessonId
        const found = data.sessions?.some(
            session => session.lessonId === lessonId
        );

        if (found) {
            return {
                id: docSnap.id,
                ...data
            };
        }
    }

    // Ingen blokkurs inneholdt lessonId
    return null;
}
