import {
    collection,
    addDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where
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

    await deleteDoc(

        doc(
            db,
            "blockCourses",
            id
        )

    );

}
