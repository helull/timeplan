import {
    db
}
from "./firebase.js";

import {
    doc,
    setDoc,
    getDocs,
    collection,
    deleteDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


export async function saveDayHoliday(
    week,
    weekday
){

    await setDoc(

        doc(
            db,
            "holidays",
            `week_${week}_day_${weekday}`
        ),

        {
            type: "day",
            week,
            weekday
        }

    );

}


export async function saveWeekHoliday(
    week
){

    await setDoc(

        doc(
            db,
            "holidays",
            `week_${week}`
        ),

        {
            type: "week",
            week
        }

    );

}


export async function loadHolidays(){

    const snapshot =
        await getDocs(
            collection(
                db,
                "holidays"
            )
        );

    return snapshot.docs.map(
        doc => doc.data()
    );

}


export async function removeDayHoliday(
    week,
    weekday
){

    await deleteDoc(

        doc(
            db,
            "holidays",
            `week_${week}_day_${weekday}`
        )

    );

}


export async function removeWeekHoliday(
    week
){

    await deleteDoc(

        doc(
            db,
            "holidays",
            `week_${week}`
        )

    );

}
