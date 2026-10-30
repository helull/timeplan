import { db }
from "./firebase.js";

import {
    isTeacher
}
from "./teacher.js";

import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    serverTimestamp,
    collection,
    getDocs,
    deleteDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function saveHomework(
    lessonId,
    week,
    text,
    exam = false
) {

    const studentId =
        localStorage.getItem(
            "studentId"
        );

    const documentId =
        `${studentId}_${lessonId}_${week}`;

    await setDoc(

        doc(
            db,
            "homework",
            documentId
        ),

        {
            studentId,
            lessonId,
            week,
            text,
            exam,
            updatedAt:
                serverTimestamp()
        }

    );

    location.reload();
}

export async function loadHomework(
    lessonId,
    week
) {

    const studentId =
        localStorage.getItem(
            "studentId"
        );

    const documentId =
        `${studentId}_${lessonId}_${week}`;

    const snap =
        await getDoc(

            doc(
                db,
                "homework",
                documentId
            )

        );

    if (
        !snap.exists()
    ) {

        return {
            text: "",
            exam: false
        };
    }

    const data =
        snap.data();

    return {

        text:
            data.text || "",

        exam:
            data.exam || false

    };
}

export async function loadAllHomework() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "homework"
            )
        );

    const studentId =
        localStorage.getItem(
            "studentId"
        );

    const homeworkMap = {};

    snapshot.docs.forEach(
        doc => {

            const data =
                doc.data();

            if (
                data.studentId !==
                studentId
            ) {
                return;
            }

            const key =
                `${data.lessonId}_${data.week}`;

            homeworkMap[key] = {

                text:
                    data.text || "",

                exam:
                    data.exam || false

            };
        }
    );

    return homeworkMap;
}

export async function saveExamFlag(
    lessonId,
    week,
    exam,
    subject
) {


    const className = localStorage.getItem("classId") || "";
    const documentId =
        `${className}_${lessonId}_${week}`;

    const examRef =
        doc(
            db,
            "exams",
            documentId
        );

    if (!exam) {

        const snap =
            await getDoc(
                examRef
            );

        if (!snap.exists()) {
            return false;
        }

        const data =
            snap.data();

        if (isTeacher()) {

            await deleteDoc(
                examRef
            );

            return true;
        }

        if (
            data.subject !== subject
        ) {

            alert(
                "Kan ikke slette prøve for annet fag."
            );

            return false;
        }

        if (
            data.teacher === true
        ) {

            alert(
                "Kan ikke slettes, satt av lærer."
            );

            return false;
        }

        await deleteDoc(
            examRef
        );

        return true;
    }

    await setDoc(

        examRef,

        {
            className,
            lessonId,
            week,
            subject,
            exam: true,
            teacher: isTeacher(),
            updatedAt:
                serverTimestamp()
        }
    );

    return true;
}

export async function loadExamFlag(
    className,
    lessonId,
    week
) {

    const documentId =
        `${className}_${lessonId}_${week}`;

    const snap =
        await getDoc(

            doc(
                db,
                "exams",
                documentId
            )

        );

    if (!snap.exists()) {

    return {
        exam: false,
        teacher: false,
        subject: ""
    };
}

const data = snap.data();

return {
    exam: data.exam || false,
    teacher: data.teacher || false,
    subject: data.subject || ""
};
}

export async function loadAllExamFlags() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "exams"
            )
        );

    const examMap = {};

    snapshot.docs.forEach(
        doc => {

            const data =
                doc.data();

            const key =
                `${data.lessonId}_${data.week}`;

examMap[key] = {

    exam: data.exam || false,

    teacher:
        data.teacher || false,

    subject:
        data.subject || ""

};
        }
    );

    return examMap;
}

export async function saveBlockExam(
    lessonId,
    week,
    title
) {

    const classId =
        localStorage.getItem(
            "classId"
        ) || "";

    let grade = "VG1";

    if (
        classId.startsWith("2")
    ) {
        grade = "VG2";
    }

    if (
        classId.startsWith("3")
    ) {
        grade = "VG3";
    }

    await addDoc(

        collection(
            db,
            "blockExams"
        ),

        {
            lessonId,
            week,
            grade,
            title,

            teacher:
                isTeacher(),

            createdAt:
                serverTimestamp()
        }

    );

    return true;
}
