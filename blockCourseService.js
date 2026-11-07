import {
    collection,
    addDoc,
    getDocs
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    db
}
from "./firebase.js";

export async function saveBlockCourse(
    data
) {

    await addDoc(
        collection(
            db,
            "blockCourses"
        ),
        data
    );

}
