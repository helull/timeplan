import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { db }
from "./firebase.js";

import {
    isTeacher
}
from "./teacher.js";


export async function saveTentamen(
    week,
    day,
    grade,
    subject,
    startTime
) {

    if (!isTeacher()) {

        alert(
            "Kun lærere kan opprette tentamener."
        );

        return false;
    }

    await addDoc(

        collection(
            db,
            "tentamens"
        ),

        {
            week,
            day,
            grade,
            subject,
            startTime
        }

    );

    return true;
}


export async function loadTentamens() {

    const snapshot =

        await getDocs(

            collection(
                db,
                "tentamens"
            )

        );

    return snapshot.docs.map(

        doc => ({

            id: doc.id,

            ...doc.data()

        })

    );

}


export async function deleteTentamen(
    id
) {

    if (!isTeacher()) {

        alert(
            "Kun lærere kan slette tentamener."
        );

        return false;
    }

    await deleteDoc(

        doc(
            db,
            "tentamens",
            id
        )

    );

    return true;
}
