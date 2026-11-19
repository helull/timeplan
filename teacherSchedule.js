import {db} from "./firebase.js";
import {doc, getDoc, collection, getDocs} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import {loadAllSchedules} from "./scheduleService.js";

let cache = null;
let pending = null;
export function invalidateTeacherScheduleCache() {cache = null; pending = null;}
const normalize = value => String(value ?? "").trim().toLocaleLowerCase("nb-NO").replace(/\s+/g," ");
function time(value) {const m=/^(\d{1,2}):(\d{2})$/.exec(String(value??""));return m?Number(m[1])*60+Number(m[2]):NaN;}
function gradeFor(classId) {const match=/^[1-4]/.exec(String(classId));return match ? `VG${match[0]}` : null;}
export function teacherAliasKey(id) {return `teacherScheduleAliases:${id}`;}
export function readTeacherAliases(id) {try {return JSON.parse(localStorage.getItem(teacherAliasKey(id))||"[]").filter(x=>typeof x==="string");}catch{return [];}}
export function saveTeacherAliases(id,aliases) {localStorage.setItem(teacherAliasKey(id),JSON.stringify(aliases));}
export async function loadTeacherSchedule(teacherId, force=false) {
    if (!teacherId) return {lessons:[],aliases:[],teacherName:"",missingIdentity:true};
    if (!force && cache?.teacherId===teacherId) return cache.data;
    if (!force && pending?.teacherId===teacherId) return pending.promise;
    const promise=(async()=>{
        const [teacherSnap,schedules,blocksSnap]=await Promise.all([
            getDoc(doc(db,"teachers",teacherId)),loadAllSchedules(),getDocs(collection(db,"blockCourses"))
        ]);
        const teacher=teacherSnap.exists()?teacherSnap.data():{};
        const confirmed=teacher.timeplanTilknytning;
        const aliases=confirmed?.status==="bekreftet" && confirmed.navn ? [confirmed.navn] : [];
        const names=new Set(aliases.map(normalize));
        const lessons=[];
        for(const schedule of schedules){
            const classId=schedule.classId;
            for(const lesson of (Array.isArray(schedule.lessons)?schedule.lessons:[])){
                const raw=normalize(lesson.teacherName);
                // Kun eksakte treff. Ikke gjett ved delvise navn eller OCR-feil.
                if(raw && names.has(raw)) lessons.push({...lesson,classId,grade:gradeFor(classId),source:"class"});
            }
        }
        const blocks=blocksSnap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.teacherId===teacherId);
        const seenBlockSlots=new Set();
        for(const block of blocks){
            for(const session of (Array.isArray(block.sessions)?block.sessions:[])){
                const weekday=Number(session.weekday),start=session.start;
                if(!(weekday>=1&&weekday<=5)||!Number.isFinite(time(start)))continue;
                // Én blokkøkt skal vises én gang, selv om samme økt ligger i
                // timeplanene til flere klasser på samme trinn.
                const candidates=schedules.flatMap(s=>(s.lessons||[]).filter(l=>Number(l.weekday)===weekday&&l.start===start&&gradeFor(s.classId)===block.grade&&(String(l.subject||"").toUpperCase().includes("BLOKK")||String(l.roomName||"").toUpperCase().includes("BLOKK"))).map(l=>({...l,classId:s.classId,grade:block.grade,source:"block",blockCourseId:block.id,displaySubject:block.subject||l.subject,displayRoom:block.room||l.roomName,teacherName:block.teacherName||teacher.name||""})));
                // Bruk lessonId fra blokkregistreringen dersom det finnes.
                // Da får lekse-/prøvevinduet riktig opprinnelig time.
                const preferred=candidates.find(c=>session.lessonId!=null&&String(c.lessonId)===String(session.lessonId))||candidates[0];
                if(!preferred)continue;
                const slotKey=`${block.id}|${weekday}|${start}|${session.end||preferred.end||""}`;
                if(!seenBlockSlots.has(slotKey)) {
                    seenBlockSlots.add(slotKey);
                    // Ordinær navnematching kan allerede ha tatt med den samme timen.
                    const existing=lessons.findIndex(l=>l.classId===preferred.classId&&l.lessonId===preferred.lessonId);
                    if(existing>=0)lessons.splice(existing,1);
                    lessons.push(preferred);
                }
            }
        }
        lessons.sort((a,b)=>Number(a.weekday)-Number(b.weekday)||time(a.start)-time(b.start)||a.classId.localeCompare(b.classId));
        const data={lessons,aliases,teacherName:teacher.name||"",unmatchedBlockSessions:blocks.reduce((n,b)=>n+(b.sessions||[]).filter(session=>!lessons.some(l=>l.source==="block"&&l.grade===b.grade&&Number(l.weekday)===Number(session.weekday)&&l.start===session.start)).length,0)};
        cache={teacherId,data};return data;
    })();
    pending={teacherId,promise};
    try{return await promise;}finally{pending=null;}
}
