import {loadProgressPlansForWeek, planId, changeExistingPlan, loadProgressPlansForScope} from "./lessonProgressPlanService.js";
import {isTeacher} from "./teacher.js";
const cache=new Map();
let generation=0;
const days=["","Mandag","Tirsdag","Onsdag","Torsdag","Fredag"];
function weekPlans(week){
    if(!cache.has(week)){
        const p=loadProgressPlansForWeek(week);
        cache.set(week,p);
        p.catch(()=>{if(cache.get(week)===p)cache.delete(week);});
    }
    return cache.get(week);
}
function identity(button){
    const d=button.dataset;
    return {classId:d.classId,lessonId:d.lesson,week:Number(d.week),weekday:Number(d.weekday),startTime:d.startTime,blockCourseId:d.blockCourseId||null};
}
function makeButton(action){
    const b=document.createElement("button");
    b.type="button"; b.className="progress-plan-icon";
    b.title="Vis fremdriftsplan";b.setAttribute("aria-label",b.title);
    b.style.cssText="display:inline-flex;align-items:center;justify-content:center;min-width:36px;min-height:32px;padding:4px;background:transparent;color:inherit;border:0;cursor:pointer;position:relative;";
    b.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h8M8 17h5"/></svg>';
    b.onclick=e=>{e.stopPropagation();action();};
    return b;
}
function appendText(node,text){
    const parts=String(text||"").split(/(https?:\/\/[^\s<>]+)/gi);
    parts.forEach((part,i)=>{
        if(i%2){try{const url=new URL(part);if(!["http:","https:"].includes(url.protocol))throw Error();const a=document.createElement("a");a.href=url.href;a.textContent=part;a.target="_blank";a.rel="noopener noreferrer";node.append(a);return;}catch{}}
        node.append(document.createTextNode(part));
    });
}
function currentSchoolWeek(){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Oslo",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());
    const get=k=>Number(parts.find(p=>p.type===k).value);
    const d=new Date(Date.UTC(get("year"),get("month")-1,get("day")));
    d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
    return Math.ceil(((d-new Date(Date.UTC(d.getUTCFullYear(),0,1)))/86400000+1)/7);
}
async function openFullPlan(plan,parent,trigger){
    if(document.getElementById("fullProgressPlanViewer"))return;
    const modal=document.createElement("div");modal.id="fullProgressPlanViewer";modal.className="modal";modal.style.zIndex="10040";
    const card=document.createElement("div");card.className="homework-viewer-card";card.style.cssText="width:min(760px,94vw);max-height:85vh;display:flex;flex-direction:column;overflow:hidden;";
    card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");card.setAttribute("aria-label","Hele fremdriftsplanen");
    const heading=document.createElement("h2");heading.textContent="Hele fremdriftsplanen";
    const info=document.createElement("p");const week=currentSchoolWeek();info.textContent=[plan.subject,"Fra uke "+week].filter(Boolean).join(" · ");
    const scroll=document.createElement("div");scroll.style.cssText="overflow-y:auto;min-height:0;flex:1 1 auto;font-size:0.85rem;line-height:1.45;overflow-wrap:anywhere;";scroll.tabIndex=0;scroll.textContent="Henter fremdriftsplan …";
    const close=document.createElement("button");close.type="button";close.textContent="Tilbake";
    const previous=parent.style.display;
    const finish=()=>{modal.remove();if(parent.isConnected){parent.style.display=previous;trigger.focus();}};
    close.onclick=finish;
    modal.addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();finish();}});
    card.append(heading,info,scroll,close);modal.append(card);parent.style.display="none";document.body.append(modal);close.focus();
    try{
        const entries=await loadProgressPlansForScope(plan);
        const order=w=>w>=34?w-34:w+20;
        const sorted=entries.filter(p=>Number.isInteger(p.week)&&p.week>=1&&p.week<=53&&order(p.week)>=order(week)).sort((a,b)=>order(a.week)-order(b.week)||Number(a.weekday||0)-Number(b.weekday||0)||String(a.startTime||"").localeCompare(String(b.startTime||"")));
        scroll.replaceChildren();
        if(!sorted.length){scroll.textContent="Ingen fremdriftsplan fra denne uken og fremover.";return;}
        let previousWeek=null;
        for(const entry of sorted){
            if(entry.week!==previousWeek){
                const h=document.createElement("h3");h.textContent="Uke "+entry.week;h.style.cssText="font-size:1rem;margin:12px 0 5px;border-bottom:1px solid #94a3b8;padding-bottom:3px;";scroll.append(h);previousWeek=entry.week;
            }
            const day=document.createElement("div");day.style.cssText="font-weight:600;margin:7px 0 2px;";day.textContent=[days[entry.weekday],entry.startTime].filter(Boolean).join(" · ");
            const body=document.createElement("div");body.style.cssText="white-space:pre-wrap;margin-bottom:8px;";appendText(body,entry.text);scroll.append(day,body);
        }
    }catch(error){scroll.textContent="Kunne ikke hente fremdriftsplanen: "+error.message;}
}
export function openPlanViewer(plan,parent=null,teacherText=""){
    if(!plan||document.getElementById("progressPlanViewer"))return;
    const modal=document.createElement("div");modal.id="progressPlanViewer";modal.className="modal";modal.style.zIndex="10030";
    const card=document.createElement("div");card.className="homework-viewer-card";card.style.cssText="max-height:85vh;overflow:auto";
    const h=document.createElement("h2");h.textContent="Fremdriftsplan";
    const info=document.createElement("p");info.textContent=[plan.subject,"Uke "+plan.week,days[plan.weekday]].filter(Boolean).join(" · ");
    const body=document.createElement("div");body.className="homework-viewer-text";body.style.whiteSpace="pre-wrap";appendText(body,plan.text);
    card.append(h,info,body);
    if(plan.updatedAt?.toDate){const p=document.createElement("p");p.textContent="Sist oppdatert: "+plan.updatedAt.toDate().toLocaleString("nb-NO");card.append(p);}
    if(teacherText){const details=document.createElement("details");const summary=document.createElement("summary");summary.textContent="Vis også lærerlekse";const text=document.createElement("div");text.style.whiteSpace="pre-wrap";appendText(text,teacherText);details.append(summary,text);card.append(details);}
    const close=document.createElement("button");close.type="button";close.textContent=parent?"Tilbake":"Lukk";
    const previousDisplay=parent?.style.display;
    close.onclick=()=>{modal.remove();if(parent?.isConnected)parent.style.display=previousDisplay;};
    const teacherId = isTeacher() ? localStorage.getItem("teacherId") : null;
    if (teacherId && teacherId === plan.teacherId) {
        const controls = document.createElement("div");
        const edit = document.createElement("button");
        const remove = document.createElement("button");
        const status = document.createElement("p");
        edit.type = remove.type = "button";
        edit.textContent = "✎ Rediger";
        remove.textContent = "Slett";
        status.setAttribute("role","status");
        controls.append(edit,remove,status);
        card.append(controls);
        let busy = false;
        async function save(value) {
            if (busy) return;
            busy = true;
            controls.querySelectorAll("button").forEach(b=>b.disabled=true);
            close.disabled=true;
            try {
                if (!isTeacher() || localStorage.getItem("teacherId") !== teacherId) throw Error("Logg inn som lærer på nytt.");
                await changeExistingPlan(plan,teacherId,value);
                close.onclick();
            } catch(error) {
                status.textContent=error.message;
            } finally {
                busy=false;
                controls.querySelectorAll("button").forEach(b=>b.disabled=false);
                close.disabled=false;
            }
        }
        edit.onclick=()=>{
            const area=document.createElement("textarea");
            area.value=plan.text;
            area.rows=8;
            area.style.width="100%";
            const submit=document.createElement("button");
            submit.type="button";submit.textContent="Lagre";
            const cancel=document.createElement("button");
            cancel.type="button";cancel.textContent="Avbryt";
            body.hidden=true;
            controls.replaceChildren(area,submit,cancel,status);
            submit.onclick=()=>save(area.value);
            cancel.onclick=()=>{body.hidden=false;controls.replaceChildren(edit,remove,status);status.textContent="";};
            area.focus();
        };
        remove.onclick=()=>{if(confirm("Vil du slette denne fremdriftsplanen? Leksene påvirkes ikke."))save(null);};
    }
    const full=document.createElement("button");full.type="button";full.textContent="Se hele planen";full.onclick=()=>openFullPlan(plan,modal,full);card.append(full);
    card.append(close);modal.append(card);if(parent)parent.style.display="none";document.body.append(modal);close.focus();
}
export async function attachPlanToModal(modal,id,teacherText=""){
    try{
        const plan=(await weekPlans(id.week))[planId(id)];
        if(!modal?.isConnected||!plan?.text)return;
        const h=modal.querySelector("h2");
        if(h&&!h.querySelector(".progress-plan-icon"))h.append(makeButton(()=>openPlanViewer(plan,modal,teacherText)));
    }catch(e){console.warn("Kunne ikke hente fremdriftsplan",e);}
}
export function attachCardPlanToModal(modal,card){
    const b=card?.querySelector(".homework-button[data-lesson]");
    if(b)attachPlanToModal(modal,identity(b),card.querySelector(".teacher-homework-preview")?.dataset.homework||"");
}
export async function refreshPlanIcons(){
    const run=++generation;
    const buttons=[...document.querySelectorAll(".lesson .homework-button[data-lesson][data-week]")];
    const active=document.querySelector(".week.active")||[...document.querySelectorAll(".week")].find(w=>w.classList.contains("active-week"));
    const visible=active?buttons.filter(b=>active.contains(b)):buttons;
    const weeks=[...new Set(visible.map(b=>Number(b.dataset.week)))];
    await Promise.all(weeks.map(async week=>{
        try{
            const plans=await weekPlans(week);
            if(run!==generation)return;
            for(const b of visible.filter(b=>Number(b.dataset.week)===week)){
                if(!b.isConnected)continue;
                const card=b.closest(".lesson");card.querySelector(".progress-plan-icon")?.remove();
                let key;
                try {key=planId(identity(b));} catch(e){continue;}
                const plan=plans[key];
                if(plan?.text){
                    const icon=makeButton(()=>openPlanViewer(plan,null,card.querySelector(".teacher-homework-preview")?.dataset.homework||""));
                    icon.style.cssText="display:inline-flex!important;align-items:center;justify-content:center;vertical-align:middle;flex:0 0 20px;width:20px!important;min-width:20px!important;height:20px!important;min-height:20px!important;padding:0!important;margin:0 3px 0 0!important;background:transparent!important;color:white;border:0!important;box-shadow:none!important;border-radius:0!important;cursor:pointer;position:static!important;";
                    const svg=icon.querySelector("svg");svg.setAttribute("width","14");svg.setAttribute("height","14");
                    const preview=card.querySelector(".teacher-homework-preview,.lesson-homework-preview");
                    if(preview){
                        preview.style.setProperty("display","inline-block","important");
                        preview.style.setProperty("width","auto","important");
                        preview.style.maxWidth="calc(100% - 48px)";
                        preview.style.verticalAlign="middle";
                        preview.before(icon);
                    }else card.append(icon);
                }
            }
        }catch(e){console.warn("Kunne ikke hente fremdriftsplaner",e);}
    }));
}
window.addEventListener("schedule:refresh",()=>{cache.clear();refreshPlanIcons();});
document.addEventListener("schedule:week-changed",()=>refreshPlanIcons());
