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
document.head.append(css);
const colors=["#527caa","#57917d","#aa7957","#8878ae","#80934e","#527caa","#846b9b","#57917d","#8878ae","#aa7957"];
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
   const h=(end-start)/465*height;card.dataset.precise="1";card.style.setProperty("--pt",(top+(start-495)/465*height)+"px");card.style.setProperty("--ph",h+"px");const n=Number([...card.classList].find(c=>/^color-\d+$/.test(c))?.split("-")[1]||1);card.style.setProperty("--pc",(colors[(n-1)%colors.length]||colors[0])+"d9");card.classList.toggle("precise-small",h<76);
  }
 }
}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;layout()})}
new MutationObserver(queue).observe(document.querySelector(".weeks"),{childList:true,subtree:true});
window.addEventListener("resize",queue);setInterval(queue,60000);queue();
