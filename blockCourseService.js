import {
    collection,
    addDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
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

    await deleteDoc(

        doc(
            db,
            "blockCourses",
            id
        )

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
