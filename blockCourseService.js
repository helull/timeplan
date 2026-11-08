import {
    collection,
    addDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    doc
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



export async function loadBlockCourseByLesson(
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
