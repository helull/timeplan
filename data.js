import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export const CLASS_ID = "1STB";

export async function loadSchedule() {

    const ref = doc(
        db,
        "schedules",
        CLASS_ID
    );

    const snapshot =
        await getDoc(ref);

    if (!snapshot.exists()) {
        return {};
    }

    return snapshot.data();
}

export function listenToHomework(callback) {

    return onSnapshot(

        collection(
            db,
            "homework"
        ),

        snapshot => {

            const items = [];

            snapshot.forEach(doc => {

                const data =
                    doc.data();

                if (
                    data.classId ===
                    CLASS_ID
                ) {

                    items.push({

                        id: doc.id,
                        ...data

                    });
                }
            });

            callback(items);
        }
    );
}
