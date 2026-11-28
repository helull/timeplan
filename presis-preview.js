// Opt-in layout preview; existing application and Firebase operations are unchanged.
document.documentElement.classList.add("presis-preview");
const css=document.createElement("style");
css.textContent=`
.presis-preview .day{position:relative;overflow:hidden!important;isolation:isolate}
.presis-preview .day>.late-start,.presis-preview .day>.lunch-break,.presis-preview .day>.teacher-late-start-space,.presis-preview .day>.teacher-free-gap{display:none!important}
.presis-preview .day>.lesson[data-precise]{position:absolute!important;left:5px;right:5px;top:var(--pt)!important;height:var(--ph)!important;min-height:0!important;max-height:none!important;margin:0!important;padding:3px 5px!important;border-radius:8px!important;box-shadow:none!important;overflow:hidden;z-index:2;background:var(--pc)!important;display:flex;flex-direction:column;gap:1px}
.presis-preview .day>.lesson[data-precise] .lesson-top{gap:4px;flex:none}
.presis-preview .day>.lesson[data-precise] .subject{font-size:clamp(13px,2vw,19px);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.presis-preview .day>.lesson[data-precise] .time{font-size:11px;line-height:1.1}
.presis-preview .day>.lesson[data-precise] .room-teacher{margin:0;gap:5px;min-width:0;flex:none;line-height:1.1}
.presis-preview .day>.lesson[data-precise] .room{font-style:italic;font-size:10px}
.presis-preview .day>.lesson[data-precise] .teacher{font-style:normal;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;margin:0}
.presis-preview .day>.lesson[data-precise] .teacher-homework-preview,.presis-preview .day>.lesson[data-precise] .lesson-homework-preview{display:block!important;width:auto!important;max-width:none!important;margin:0 25px 0 0!important;padding:1px 3px!important;border-radius:3px;line-height:14px;font-size:11px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;opacity:1}
.presis-preview .day>.lesson[data-precise] .teacher-homework-preview{background:#fff3c2;color:#6a4b00}
.presis-preview .day>.lesson[data-precise] .lesson-homework-preview{background:#dceaf8;color:#234c83}
.presis-preview .day>.lesson[data-precise] .progress-plan-icon{position:absolute!important;right:25px;bottom:2px;margin:0!important}
.presis-preview .day>.lesson[data-precise] .homework-button{bottom:2px;right:3px}
.presis-preview .day>.lesson[data-precise].exam-lesson{border:2px solid #d73535!important}
.presis-preview .day>.lesson[data-precise].exam-student{border-color:#ef942d!important}
.presis-preview .day>.lesson[data-precise].exam-lesson::before{display:none}
.presis-preview .precise-grid{position:absolute;left:2px;right:2px;pointer-events:none;z-index:0}
.presis-preview .precise-grid i{position:absolute;left:0;right:0;height:1px;background:#aab6c433}
.presis-preview .precise-grid .now{background:repeating-linear-gradient(to right,#c52b35 0 18px,transparent 18px 24px);opacity:.85}
.presis-preview .day>.lesson[data-precise].precise-small .subject{font-size:13px}
.presis-preview .day>.lesson[data-precise].precise-small .teacher-homework-preview,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview{font-size:9px!important;line-height:10px}
@media(orientation:landscape) and (max-width:900px){.presis-preview .day>.lesson[data-precise]{left:1px;right:1px;padding:2px!important;pointer-events:none}.presis-preview .day>.lesson[data-precise] .subject{font-size:10px}.presis-preview .day>.lesson[data-precise] .time,.presis-preview .day>.lesson[data-precise] .teacher,.presis-preview .day>.lesson[data-precise] .room{font-size:8px}.presis-preview .day>.lesson[data-precise] .teacher-homework-preview,.presis-preview .day>.lesson[data-precise] .lesson-homework-preview{font-size:8px!important;line-height:9px;margin-right:0!important}.presis-preview .day>.lesson[data-precise] .progress-plan-icon{right:2px;bottom:1px;pointer-events:none!important}}
`;
css.textContent+=`
.presis-preview .day>.lesson[data-precise]{border-radius:5px!important}
.presis-preview .day>.lesson[data-precise] .subject,.presis-preview .day>.lesson[data-precise] .teacher-subject-name{font-size:17px!important;line-height:1.12!important}
.presis-preview .day>.lesson[data-precise] .teacher-class-label{font-size:11px!important}
.presis-preview .day>.lesson[data-precise] .teacher-homework-preview,.presis-preview .day>.lesson[data-precise] .lesson-homework-preview{min-width:0!important;max-width:calc(100% - 48px)!important;align-self:flex-start;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.presis-preview .day>.lesson[data-precise] .teacher-homework-preview .homework-excerpt,.presis-preview .day>.lesson[data-precise] .lesson-homework-preview .homework-excerpt{display:inline!important;white-space:nowrap!important;max-width:100%;font-size:inherit!important;background:none!important;border:0!important;padding:0!important;color:inherit!important}
.presis-preview .day>.lesson[data-precise] .teacher-homework-preview{background:#fff3c2!important;color:#6a4b00!important}
.presis-preview .day>.lesson[data-precise] .lesson-homework-preview{background:#dceaf8!important;color:#234c83!important}
@media(orientation:portrait){.presis-preview .day>.lesson[data-precise] .subject,.presis-preview .day>.lesson[data-precise] .teacher-subject-name{font-size:19px!important}.presis-preview .day>.lesson[data-precise].precise-small .teacher-homework-preview,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview{position:relative;display:inline-flex!important;width:19px!important;height:15px!important;max-width:19px!important;overflow:hidden!important;font-size:0!important;flex:none;cursor:pointer}.presis-preview .day>.lesson[data-precise].precise-small .homework-excerpt,.presis-preview .day>.lesson[data-precise].precise-small .homework-inline-link{position:absolute;inset:0;opacity:0}.presis-preview .day>.lesson[data-precise].precise-small .teacher-homework-preview::before,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview::before{content:"▤";font-size:12px;line-height:13px;pointer-events:none}}
@media(orientation:landscape) and (max-width:900px){.presis-preview .day>.lesson[data-precise] .subject,.presis-preview .day>.lesson[data-precise] .teacher-subject-name{font-size:11px!important}.presis-preview .day>.lesson[data-precise] .teacher-class-label{font-size:8px!important}}
`;
css.textContent+=`
.presis-preview .day>.lesson[data-precise].precise-small .teacher-homework-preview,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview{position:absolute!important;bottom:3px;left:5px;display:block!important;width:19px!important;height:15px!important;max-width:19px!important;margin:0!important;padding:0!important;font-size:0!important;overflow:hidden!important}
.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview{left:29px}
.presis-preview .day>.lesson[data-precise].precise-small .homework-excerpt,.presis-preview .day>.lesson[data-precise].precise-small .homework-inline-link{position:absolute!important;inset:0;opacity:0}
.presis-preview .day>.lesson[data-precise].precise-small .teacher-homework-preview::before,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview::before{content:"▤";display:block;text-align:center;font-size:12px;line-height:15px;pointer-events:none}
.presis-preview .day>.lesson[data-precise].precise-small .progress-plan-icon{left:53px!important;right:auto!important;bottom:1px!important}
`;
css.textContent+=`
.presis-preview .day>.lesson[data-precise] .precise-plan-row{display:flex;align-items:center;justify-content:flex-end;gap:4px;min-width:0;flex:none;margin-right:25px;min-height:20px}
.presis-preview .day>.lesson[data-precise] .precise-plan-row .teacher-homework-preview{position:relative!important;left:auto!important;bottom:auto!important;margin:0!important;max-width:calc(100% - 24px)!important;min-width:0;align-self:center}
.presis-preview .day>.lesson[data-precise] .precise-plan-row .progress-plan-icon{position:static!important;left:auto!important;right:auto!important;bottom:auto!important;flex:0 0 20px!important;margin:0!important}
.presis-preview .day>.lesson[data-precise].precise-small .precise-plan-row{position:absolute;bottom:3px;right:28px;margin:0;min-height:20px}
.presis-preview .day>.lesson[data-precise].precise-small .precise-plan-row .teacher-homework-preview{width:19px!important;max-width:19px!important}
.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview{left:5px}
`;
css.textContent+=`
.presis-preview .day>.lesson[data-precise].precise-small .precise-plan-row{height:20px!important;min-height:20px!important;max-height:20px!important;display:flex!important;align-items:center!important;bottom:3px!important;top:auto!important}
.presis-preview .day>.lesson[data-precise].precise-small .precise-plan-row .teacher-homework-preview,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview{box-sizing:border-box!important;display:block!important;flex:0 0 19px!important;width:19px!important;min-width:19px!important;max-width:19px!important;height:16px!important;min-height:16px!important;max-height:16px!important;padding:0!important;border:0!important;line-height:16px!important;align-self:center!important;transform:none!important}
.presis-preview .day>.lesson[data-precise].precise-small .precise-plan-row .teacher-homework-preview{position:relative!important;inset:auto!important}
.presis-preview .day>.lesson[data-precise].precise-small .teacher-homework-preview::before,.presis-preview .day>.lesson[data-precise].precise-small .lesson-homework-preview::before{position:absolute!important;inset:0!important;display:block!important;content:"▤"!important;font-size:12px!important;line-height:16px!important;text-align:center!important}
`;
css.textContent+=`
.presis-preview .day>.lesson[data-precise] .precise-exam-label{font-size:10px!important;line-height:12px!important;font-weight:700;color:#fff;background:#a92525;border-radius:3px;padding:0 4px;align-self:flex-start;flex:none;white-space:nowrap}
.presis-preview .day>.lesson[data-precise].exam-student .precise-exam-label{background:#a65313}
@media(orientation:landscape) and (max-width:900px){.presis-preview .day>.lesson[data-precise] .precise-exam-label{font-size:8px!important;line-height:10px!important}}
`;
css.textContent+=`
.presis-preview .day>.lesson[data-precise].exam-lesson{overflow:visible!important}
.presis-preview .day>.lesson[data-precise] .precise-exam-label{position:absolute!important;top:-7px;left:8px;z-index:4;margin:0!important;line-height:12px!important;padding:0 4px}
.presis-preview .day>.lesson[data-precise].exam-lesson .lesson-top{margin-top:4px}
.presis-preview .day>.lesson[data-precise] .lesson-top>.room{font-size:10px!important;font-style:italic;white-space:nowrap;flex:none;margin:0!important}
.presis-preview .day>.lesson[data-precise] .room-teacher:empty{display:none}
@media(orientation:landscape) and (max-width:900px){.presis-preview .day>.lesson[data-precise] .precise-exam-label{top:-5px;line-height:10px!important;font-size:8px!important}.presis-preview .day>.lesson[data-precise] .lesson-top>.room{font-size:8px!important}}
`;
css.textContent+="@media(orientation:portrait){.presis-preview .day>.lesson[data-precise] .lesson-top>.room{font-size:13px!important}}";
document.head.append(css);
const colors=["#60a5fa","#34d399","#f87171","#a78bfa","#fbbf24","#22d3ee","#fb7185","#4ade80","#c084fc","#f97316"]; const dark=["#2563eb","#059669","#dc2626","#7c3aed","#d97706","#0891b2","#be123c","#15803d","#9333ea","#c2410c"];
const minutes=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(s);return m?+m[1]*60 + +m[2]:NaN};
function layout(){
 const now=new Date(), current=now.getHours()*60+now.getMinutes();
 for(const day of document.querySelectorAll(".day")){
  const header=day.querySelector(".header");if(!header)continue;
  const top=header.offsetTop+header.offsetHeight+5;
  const bottom=matchMedia("(orientation:portrait)").matches?30:5;
  const height=day.clientHeight-top-bottom;if(height<=0)continue;
  let grid=day.querySelector(":scope > .precise-grid");
  if(!grid){grid=document.createElement("div");grid.className="precise-grid";grid.setAttribute("aria-hidden","true");for(let h=9;h<=15;h++){const l=document.createElement("i");l.style.top=((h*60-495)/465*100)+"%";grid.append(l)}const l=document.createElement("i");l.className="now";grid.append(l);day.append(grid)}
  grid.style.top=top+"px";grid.style.height=height+"px";
  const line=grid.querySelector(".now");line.hidden=!day.classList.contains("is-today")||current<495||current>960;line.style.top=((current-495)/465*100)+"%";
  for(const card of day.querySelectorAll(":scope > .lesson")){
   const b=card.querySelector(".homework-button[data-start-time]"),t=card.querySelector(".time");if(!b||!t)continue;
   if(!card.dataset.preciseEnd){const times=t.textContent.match(/\d{1,2}:\d{2}/g);if(!times||times.length<2)continue;card.dataset.preciseEnd=times[1];t.textContent=times[0]}
   const start=minutes(b.dataset.startTime),end=minutes(card.dataset.preciseEnd);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||start<495||end>960)continue;
   const h=(end-start)/465*height;card.dataset.precise="1";card.style.setProperty("--pt",(top+(start-495)/465*height)+"px");card.style.setProperty("--ph",h+"px");const n=Number([...card.classList].find(c=>/^color-\d+$/.test(c))?.split("-")[1]||1);card.style.setProperty("--pc","linear-gradient(135deg,"+(colors[(n-1)%10]||colors[0])+"d9,"+(dark[(n-1)%10]||dark[0])+"d9)");const small=h<90 || matchMedia("(orientation:landscape) and (max-width:900px)").matches;if(card.classList.contains("precise-small")!==small)card.classList.toggle("precise-small",small);
   const room=card.querySelector(".room"), time=card.querySelector(".lesson-top .time");if(room&&time&&room.parentNode!==time.parentNode)time.before(room);
   let badge=card.querySelector(":scope > .precise-exam-label");
   const label=card.classList.contains("personal-assessment-lesson")?"Annen vurdering":card.classList.contains("exam-teacher")?"Prøve":card.classList.contains("exam-student")?"Prøve (elev)":card.classList.contains("exam-lesson")?"Prøve":"";
   if(label){if(!badge){badge=document.createElement("span");badge.className="precise-exam-label";card.querySelector(".lesson-top").after(badge)}if(badge.textContent!==label)badge.textContent=label}else if(badge)badge.remove();
   let row=card.querySelector(":scope > .precise-plan-row");
   const icon=card.querySelector(".progress-plan-icon"), teacher=card.querySelector(".teacher-homework-preview");
   if(icon||teacher){
    if(!row){row=document.createElement("div");row.className="precise-plan-row";const own=card.querySelector(":scope > .lesson-homework-preview");card.insertBefore(row,own||null)}
    if(teacher&&teacher.parentNode!==row)row.prepend(teacher);
    if(icon&&(icon.parentNode!==row||row.lastElementChild!==icon))row.append(icon);
   }else if(row)row.remove();

  }
 }
}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;layout()})}
new MutationObserver(queue).observe(document.querySelector(".weeks"),{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
window.addEventListener("resize",queue);setInterval(queue,60000);queue();
