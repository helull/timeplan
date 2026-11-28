import {
    collection,
    addDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    writeBatch
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";

export async function saveBlockCourse(
    blockCourse
) {

    await addDoc(

        collection(
            db,
            "blockCourses"
        ),

        {

            ...blockCourse,

            createdAt:
                serverTimestamp()

        }

    );

}



export async function loadBlockCoursesByGradeAndTeacher(
    grade,
    teacherId
) {
    const snapshot =
        await getDocs(
            query(
                collection(db, "blockCourses"),
                where("grade", "==", grade),
                where("teacherId", "==", teacherId)
            )
        );

    return snapshot.docs.map(
        document => ({
            id: document.id,
            ...document.data()
        })
    );
}


export async function loadBlockCourseByLesson(
    lessonId,
    grade,
    teacherId
) {

    console.log(
    "Søker etter lessonId:",
    lessonId
);
    
    let snapshot;
    if (teacherId === "") {
    snapshot =
        await getDocs(
            query(
                collection(db, "blockCourses"),
                where("grade", "==", grade)
                )
        );
    } else {

    snapshot =
        await getDocs(
            query(
                collection(db, "blockCourses"),
                where("grade", "==", grade),
                where("teacherId", "==", teacherId)
            )
        );
    }

    
    for (
        const document of
        snapshot.docs
    ) {

        const data =
            document.data();

        const found =
            data.sessions?.some(
                session =>
                    session.lessonId ===
                    lessonId
            );

        if (found) {

            return {

                id:
                    document.id,

                ...data

            };

        }

    }
    
console.log(
    "Fant ikke lessonId:",
    lessonId,
    "grade:",
    grade,
    "teacher:",
    teacherId
);

    return null;

}


export async function loadBlockCoursesForStudentsByLesson(
    lessonId,
    grade
) {
    const snapshot =
        await getDocs(
            query(
                collection(db, "blockCourses"),
                where("grade", "==", grade)
            )
        );

    const results = [];

    snapshot.docs.forEach(docSnap => {

        const data = docSnap.data();

        const found =
            data.sessions?.some(
                session =>
                    session.lessonId === lessonId
            );

        if (found) {
            results.push({
                id: docSnap.id,
                ...data
            });
        }
    });

    return results;
}



export async function updateBlockCourse(
    id,
    data
) {

    await updateDoc(

        doc(
            db,
            "blockCourses",
            id
        ),

        data

    );

}

export async function deleteBlockCourse(
    id
) {

    const exams = await getDocs(query(collection(db, "blockExams"), where("blockCourseId", "==", id)));
    if (exams.size >= 500) throw new Error("For mange prøver til én sikker sletting.");
    const batch = writeBatch(db);
    exams.docs.forEach(exam => batch.delete(exam.ref));
    batch.delete(doc(db, "blockCourses", id));
    await batch.commit();
    exams.docs.forEach(exam => window.dispatchEvent(new CustomEvent("schedule:exam-data-changed", {detail:{type:"block-deleted",id:exam.id}})));

}

export async function loadBlockCoursesForSession(
    grade,
    weekday,
    start,
    teacherId = null
) {

    const snapshot = await getDocs(
        query(
            collection(db, "blockCourses"),
            where("grade", "==", grade)
        )
    );

    const results = [];

    snapshot.forEach(docSnap => {

        const data = docSnap.data();

        // Hvis lærer er oppgitt, filtrer på lærer
        if (teacherId && data.teacherId !== teacherId) {
            return;
        }

        // Finn blokkurs på samme dag og tidspunkt
        const found = (data.sessions ?? []).some(session =>
            Number(session.weekday) === Number(weekday) &&
            session.start === start
        );

        if (found) {
            results.push({
                id: docSnap.id,
                ...data
            });
        }
    });

    return results;
}
