import {
    collection,
    addDoc,
    getDocs,
    serverTimestamp
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
