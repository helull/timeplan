import { db }
from "./firebase.js";

import {
    collection,
    getDocs
}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function loadClasses() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "classes"
            )
        );

    const result = [];

    snapshot.forEach(doc => {

        result.push({

            id: doc.id,

            ...doc.data()

        });

    });

    result.sort(
        (a,b)=>
        a.name.localeCompare(
            b.name
        )
    );

    return result;
}
