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
    teacherId,
    blockCourseId = null,
    weekday = null,
    startTime = null
) {

    const documentId = blockCourseId
        ? `block_${blockCourseId}_${week}_${weekday}_${startTime}`
        : `${classId}_${lessonId}_${week}`;

    await setDoc(
        doc(db, "teacherHomework", documentId),
        {
            classId,
            lessonId,
            week,
            text,
            teacherId,
            blockCourseId,
            weekday,
            startTime,
            updatedAt: serverTimestamp()
        }
    );
    window.dispatchEvent(new CustomEvent("schedule:homework-saved", {
        detail: {kind:"teacher", classId, lessonId, week, text, blockCourseId, weekday, startTime}
    }));
}

export async function loadTeacherHomework(
    classId,
    lessonId,
    week,
    teacherId,
    blockCourseId = null,
    weekday = null,
    startTime = null
) {

    const documentId = blockCourseId
        ? `block_${blockCourseId}_${week}_${weekday}_${startTime}`
        : `${classId}_${lessonId}_${week}`;

    const snapshot = await getDoc(
        doc(db, "teacherHomework", documentId)
    );

    if (!snapshot.exists()) {
        return { text: "" };
    }

    const data = snapshot.data();

    if (
        teacherId &&
        data.teacherId !== teacherId
    ) {
        return { text: "" };
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
