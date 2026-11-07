import {
    collection,
    addDoc,
    getDocs
}
from "firebase/firestore";

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
