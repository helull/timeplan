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

    const validIds = [];
    let matchingBlockCourse = null;

    // Gå gjennom alle lagrede blokkurs
    for (const id of blockCourseIds) {

        const docSnap = await getDoc(
            doc(db, "blockCourses", id)
        );

        // Hvis blokkurset ikke finnes i Firebase,
        // skal ID-en ikke beholdes i localStorage
        if (!docSnap.exists()) {
            console.log("Fjerner ugyldig blokkurs-ID:", id);
            continue;
        }

        // Blokkurset finnes, behold ID-en
        validIds.push(id);

        const data = docSnap.data();

        // Undersøk om blokkurset inneholder lessonId
        const found = data.sessions?.some(
            session => session.lessonId === lessonId
        );

        if (found && !matchingBlockCourse) {
            matchingBlockCourse = {
                id: docSnap.id,
                ...data
            };
        }
    }

    // Oppdater localStorage dersom ugyldige ID-er ble funnet
    if (validIds.length !== blockCourseIds.length) {

        localStorage.setItem(
            "lessonIds",
            JSON.stringify(validIds)
        );
    }

    // Returner matchende blokkurs, eller null
    return matchingBlockCourse;
}



export async function loadStudentsBlockCourseMap() {

    const ids = JSON.parse(
        localStorage.getItem("lessonIds") || "[]"
    );

    const blockCourseMap = new Map();
    const validIds = [];

    for (const id of ids) {

        const docSnap = await getDoc(
            doc(db, "blockCourses", id)
        );

        if (!docSnap.exists()) {
            continue;
        }

        validIds.push(id);

        const blockCourse = {
            id: docSnap.id,
            ...docSnap.data()
        };

        for (const session of blockCourse.sessions ?? []) {
            blockCourseMap.set(
                session.lessonId,
                blockCourse
            );
        }
    }

    if (validIds.length !== ids.length) {
        localStorage.setItem(
            "lessonIds",
            JSON.stringify(validIds)
        );
    }

    return blockCourseMap;
}
