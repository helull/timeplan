import {loadProgressPlansForWeek, planId} from "./lessonProgressPlanService.js";
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
                    icon.style.cssText+="vertical-align:middle;flex:0 0 auto;color:white;z-index:2;width:30px;min-width:30px;height:26px;min-height:26px;padding:2px;border:1px solid rgba(255,255,255,.5);border-radius:8px;";
                    const preview=card.querySelector(".teacher-homework-preview,.lesson-homework-preview");
                    if(preview){
                        preview.style.display="inline-block";
                        preview.style.maxWidth="calc(100% - 38px)";
                        preview.style.verticalAlign="middle";
                        preview.after(icon);
                    }else card.append(icon);
                }
            }
        }catch(e){console.warn("Kunne ikke hente fremdriftsplaner",e);}
    }));
}
window.addEventListener("schedule:refresh",()=>{cache.clear();refreshPlanIcons();});
document.addEventListener("schedule:week-changed",()=>refreshPlanIcons());
