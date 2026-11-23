import { db } from "./firebase.js";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const history = collection(db, "progressPlanImports");
const homework = collection(db, "teacherHomework");
export const homeworkDocumentId = (classId, lessonId, week, blockId, weekday, start) =>
    blockId ? `block_${blockId}_${week}_${weekday}_${start}` : `${classId}_${lessonId}_${week}`;

export async function listProgressImports(teacherId, classId, subject, blockId) {
    const snap = await getDocs(query(history, where("teacherId", "==", teacherId)));
    return snap.docs.map(d => ({id:d.id,...d.data()}))
        .filter(h => blockId ? h.blockCourseId === blockId : !h.blockCourseId && h.classId === classId && h.subject === subject)
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function saveProgressImport(teacherId, classId, subject, blockId, items) {
    const ref = doc(history);
    await setDoc(ref, {teacherId, classId, subject, blockCourseId:blockId || null, items, createdAt:serverTimestamp()});
    return ref.id;
}

export async function undoProgressImport(record) {
    let removed=0, preserved=0;
    // Slett bare dersom teksten fremdeles er identisk med importert tekst.
    for (const item of record.items || []) {
        const ref=doc(db,"teacherHomework",item.id);
        const snap=await getDoc(ref);
        if (!snap.exists() || snap.data().text !== item.text) {preserved++;continue;}
        await deleteDoc(ref); removed++;
    }
    await deleteDoc(doc(db,"progressPlanImports",record.id));
    window.dispatchEvent(new Event("schedule:refresh"));
    return {removed,preserved};
}

export async function clearBlockCourseHomework(blockId) {
    const [lessonSnap, importSnap] = await Promise.all([
        getDocs(query(homework,where("blockCourseId","==",blockId))),
        getDocs(query(history,where("blockCourseId","==",blockId)))
    ]);
    const refs=[...lessonSnap.docs,...importSnap.docs].map(d=>d.ref);
    for(let i=0;i<refs.length;i+=400) {
        const batch=writeBatch(db);
        refs.slice(i,i+400).forEach(ref=>batch.delete(ref));
        await batch.commit();
    }
    return {homework:lessonSnap.size,imports:importSnap.size};
}

export function blockCourseSessionsChanged(previous,next) {
    const normalize = sessions => (sessions || []).map(s=>`${Number(s.weekday)}|${s.start}| ${s.end || ""}|${s.lessonId || ""}`).sort().join(";");
    return normalize(previous) !== normalize(next);
}
