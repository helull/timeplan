import { db }
from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function loadSchedule(
    classId
){

    const snap =
        await getDoc(
            doc(
                db,
                "schedules",
                classId
            )
        );

    if (!snap.exists()) {

        console.warn("Fant ingen timeplan for",classId);
        return {
            lessons: []
        };
    }

    return snap.data();
}

// Hentes bare ved behov i lærervisningen; mellomlagres i teacherSchedule.js.
export async function loadAllSchedules() {
    const snapshot = await getDocs(collection(db, "schedules"));
    return snapshot.docs.map(item => ({classId: item.id, ...item.data()}));
}
