import {resolveStudentId} from "./studentPairing.js";
import { auth, db }
from "./firebase.js";

import {
    saveTeacherHomework
}
from "./teacherHomeworkService.js";

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
    query,
    where,
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
    
    const studentId = await resolveStudentId();

    if (!studentId) throw new Error("Elevinnlogging kreves.");
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

    // Oppdater bare det berørte timekortet etter vellykket lagring.
    // Ingen ny Firestore-lesing eller full omlasting av timeplanen.
    window.dispatchEvent(new CustomEvent("schedule:homework-saved", {
        detail: { kind: "student", lessonId, week, text, exam }
    }));
}

export async function loadHomework(
    lessonId,
    week
) {

    const studentId = await resolveStudentId();

    if (!studentId) return { text: "", exam: false };

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
    await auth.authStateReady();
    const studentId = await resolveStudentId();
    if (!studentId) return {};
    const snapshot = await getDocs(query(collection(db, "homework"), where("studentId", "==", studentId)));

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
    subject,
    sourceClassId = null
) {


    const className = sourceClassId || localStorage.getItem("classId") || "";
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
            window.dispatchEvent(new CustomEvent("schedule:exam-data-changed", {
                detail: {type:"exam", className, lessonId, week, exam:false}
            }));
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
        window.dispatchEvent(new CustomEvent("schedule:exam-data-changed", {
            detail: {type:"exam", className, lessonId, week, exam:false}
        }));
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

    window.dispatchEvent(new CustomEvent("schedule:exam-data-changed", {
        detail: {type:"exam", className, lessonId, week, exam:true, subject, teacher:isTeacher()}
    }));
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
                `${data.className}_${data.lessonId}_${data.week}`;

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
    day,
    title,
    startTime,
    sourceClassId = null,
    blockCourseId = null
) {

    const classId = sourceClassId || localStorage.getItem("classId") || "";

    let grade = "VG1";

    if (
        classId.startsWith("2")
    ) {
        grade = "VG2";
    }

    if (classId.startsWith("3")) grade = "VG3";
    if (classId.startsWith("4")) grade = "VG4";

    if (isTeacher() && !blockCourseId) return false;
    const blockExamData = {
        blockCourseId,
        lessonId, week, day, grade, title,
        teacher: isTeacher(),
        createdAt: serverTimestamp(),
        examTime: startTime
    };
    const saved = await addDoc(collection(db, "blockExams"), blockExamData);
    window.dispatchEvent(new CustomEvent("schedule:exam-data-changed", {
        detail: {type:"block-added", exam:{
            id:saved.id, lessonId, week, day, grade, title,
            teacher:blockExamData.teacher, examTime:startTime, blockCourseId
        }}
    }));
    return true;
}

export async function loadBlockExams(
    week,
    day,
    startTime,
    sourceClassId = null
) {

    const classId = sourceClassId || localStorage.getItem("classId") || "";

    let grade = "VG1";

    if (
        classId.startsWith("2")
    ) {
        grade = "VG2";
    }

    if (classId.startsWith("3")) grade = "VG3";
    if (classId.startsWith("4")) grade = "VG4";

    const snapshot =
        await getDocs(
            collection(
                db,
                "blockExams"
            )
        );

    return snapshot.docs
        .map(
            doc => ({
                id: doc.id,
                ...doc.data()
            })
        )
        .filter(
            exam =>
                exam.week === week &&
                exam.day === day &&
                exam.grade === grade &&
                exam.examTime === startTime
        );

}


export async function deleteBlockExam(
    docId
) {

    await deleteDoc(doc(db, "blockExams", docId));
    window.dispatchEvent(new CustomEvent("schedule:exam-data-changed", {
        detail: {type:"block-deleted", id:docId}
    }));
}

export async function loadAllBlockExams() {

    const snapshot =

        await getDocs(

            collection(
                db,
                "blockExams"
            )

        );

    return snapshot.docs.map(

        doc => ({

            id: doc.id,

            ...doc.data()

        })

    );

}


export function applicableBlockExams(exams, courseId) {
 const exact = courseId ? exams.filter(e => e.blockCourseId === courseId) : [];
 return courseId ? exact : exams.filter(e => !e.blockCourseId);
}
