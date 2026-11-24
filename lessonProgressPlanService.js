import { db } from "./firebase.js";
import { collection, doc, getDoc, getDocs, query, where, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Independent storage. No writes to teacherHomework or student homework.
const plans = collection(db, "lessonProgressPlans");
const imports = collection(db, "lessonProgressPlanImports");
export function planId({classId, lessonId, week, blockCourseId, weekday, startTime}) {
    if (!Number.isInteger(week) || week < 1 || week > 53) throw Error("Ugyldig uke.");
    if (blockCourseId ? (!weekday || !startTime) : (!classId || !lessonId)) throw Error("Mangler undervisningsidentitet.");
    return blockCourseId ? `block_${blockCourseId}_${week}_${weekday}_${startTime}` : `${classId}_${lessonId}_${week}`;
}
export async function loadProgressPlansForWeek(week) {
    const snap = await getDocs(query(plans, where("week", "==", week)));
    return Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
}
export async function loadProgressPlan(identity) {
    const snap = await getDoc(doc(plans, planId(identity)));
    return snap.exists() ? snap.data() : null;
}
function scopeKey({classId, subject, blockCourseId}) {
    if (blockCourseId) return JSON.stringify(["block", blockCourseId]);
    if (!classId || !subject) throw Error("Mangler fag eller klasse.");
    return JSON.stringify(["class", classId, subject]);
}
export async function listPlanImports(scope) {
    const snap = await getDocs(query(imports, where("scopeKey", "==", scopeKey(scope))));
    return snap.docs.map(d => ({...d.data(), id:d.id})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
}
// Atomic import: reject oversized operations rather than silently split them.
export async function importProgressPlans(scope, teacherId, entries, {overwrite=false}={}) {
    const key = scopeKey(scope);
    const rows = entries.filter(e => String(e.text ?? "").trim()).map(e => {
        const identity = {classId:e.classId ?? scope.classId ?? null, lessonId:e.lessonId ?? null, week:e.week, blockCourseId:scope.blockCourseId || null, weekday:e.weekday ?? null, startTime:e.startTime ?? null};
        if (!identity.blockCourseId && identity.classId !== scope.classId) throw Error("Feil klasse i import.");
        return {identity, id:planId(identity), text:String(e.text).trim()};
    });
    if (rows.length > 400) throw Error("Importen er for stor. Del opp tabellen.");
    if (new Set(rows.map(r=>r.id)).size !== rows.length) throw Error("Duplikate undervisningsøkter.");
    const historyRef = doc(imports);
    const result = await runTransaction(db, async tx => {
        const snapshots = await Promise.all(rows.map(r=>tx.get(doc(plans,r.id))));
        const items = [];
        let skipped=0;
        rows.forEach((r,i)=>{
            const before = snapshots[i].exists() ? snapshots[i].data() : null;
            if (before && before.scopeKey !== key) throw Error("Planoppføringen tilhører et annet fag.");
            if (before && (!overwrite || before.text === r.text)) {skipped++;return;}
            const version = crypto.randomUUID();
            tx.set(doc(plans,r.id), {...r.identity, subject:scope.subject ?? null, scopeKey:key, text:r.text, version, teacherId, updatedAt:serverTimestamp(), createdAt:before?.createdAt ?? serverTimestamp()});
            items.push({id:r.id, week:r.identity.week, version, before});
        });
        if(items.length) tx.set(historyRef,{scopeKey:key, teacherId, classId:scope.classId ?? null, subject:scope.subject ?? null, blockCourseId:scope.blockCourseId || null, items, createdAt:serverTimestamp()});
        return {saved:items.length, skipped};
    });
    if(result.saved) window.dispatchEvent(new Event("schedule:refresh"));
    return result;
}
export async function undoPlanImport(importId) {
    const result = await runTransaction(db, async tx=>{
        const ref = doc(imports,importId);
        const history = await tx.get(ref);
        if(!history.exists()) throw Error("Importen finnes ikke.");
        const items = history.data().items || [];
        const snapshots = await Promise.all(items.map(i=>tx.get(doc(plans,i.id))));
        let removed=0, restored=0, preserved=0;
        items.forEach((item,i)=>{
            const current=snapshots[i];
            if(!current.exists() || current.data().version !== item.version){preserved++;return;}
            if(item.before){tx.set(current.ref,item.before);restored++;}
            else {tx.delete(current.ref);removed++;}
        });
        tx.delete(ref);
        return {removed,restored,preserved};
    });
    window.dispatchEvent(new Event("schedule:refresh"));
    return result;
}

 // Manual changes use a new version so undoing an import cannot erase them.
export async function changeExistingPlan(plan, teacherId, text) {
    if (!teacherId || plan.teacherId !== teacherId) throw Error("Du kan bare endre egne fremdriftsplaner.");
    const ref = doc(plans, planId(plan));
    await runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw Error("Planen er allerede slettet.");
        const current = snap.data();
        if (current.teacherId !== teacherId || current.version !== plan.version) throw Error("Planen er endret. Lukk vinduet og åpne planen på nytt.");
        if (text === null) tx.delete(ref);
        else {
            const value = String(text).trim();
            if (!value) throw Error("Skriv inn tekst, eller bruk Slett.");
            tx.update(ref, {text:value, version:crypto.randomUUID(), updatedAt:serverTimestamp()});
        }
    });
    window.dispatchEvent(new Event("schedule:refresh"));
}
