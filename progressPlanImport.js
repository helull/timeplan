import { loadTeacherSchedule } from "./teacherSchedule.js";
import { loadProgressPlansForWeek, planId, listPlanImports, importProgressPlans, undoPlanImport } from "./lessonProgressPlanService.js";

const weekdays = ["", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const minutes = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t)); return m ? Number(m[1])*60+Number(m[2]) : 9999; };

function parseTable(text, html) {
    if (html && /<table[\s>]/i.test(html)) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table");
        if (table) {
            const rows = [];
            const occupied = [];
            for (const [r, tr] of [...table.rows].entries()) {
                const row = rows[r] = [];
                let c = 0;
                for (const cell of tr.cells) {
                    while ((occupied[c] || 0) > r) { row[c++] = ""; }
                    if (cell.colSpan !== 1) throw Error("Tabellen inneholder horisontalt sammenslåtte celler. Bruk én kolonne per undervisningsdag.");
                    const clone = cell.cloneNode(true);
                    clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
                    clone.querySelectorAll("p,div").forEach(p => p.append("\n"));
                    row[c] = clone.textContent.trim();
                    occupied[c] = cell.rowSpan === 0 ? table.rows.length : r + cell.rowSpan;
                    c++;
                }
                while ((occupied[c] || 0) > r) row[c++] = "";
            }
            return rows;
        }
    }
    return String(text || "").replace(/^[\r\n]+|[\r\n]+$/g,"").split(/\r?\n/).map(line => line.split("\t").map(v => v.trim()));
}

export async function openProgressPlanImport({teacherId, classId, subject, blockCourse, advanced=false}) {
    const scope = {classId, subject, blockCourseId:blockCourse?.id || null};
    const old = document.getElementById("progressPlanImportModal");
    if (old) return;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "progressPlanImportModal";
    modal.style.zIndex = "10020";
    modal.innerHTML = `<div class="modal-card" style="max-width:850px;max-height:90vh;overflow:auto">
        <h2>Importer fremdriftsplan${advanced ? " (avansert)" : ""}</h2>
        <p>${escape(subject)} – ${escape(blockCourse?.subject || classId)}</p>
        <p>Lim inn tabellen fra Word, Excel eller OneNote. Første kolonne skal inneholde ukenummer. ${advanced ? "Programmet foreslår kolonner automatisk. Du kan korrigere koblingen før forhåndsvisning." : "De øvrige kolonnene følger undervisningsdagene i rekkefølge."}</p>
        <p id="progressDays">Henter undervisningsdager …</p>
        <textarea id="progressPaste" rows="9" style="width:100%" placeholder="Lim inn tabellen her"></textarea>
        <div style="margin-top:12px"><button id="progressPreview">Forhåndsvis</button>
        <button id="progressClose">Lukk</button></div>
        <div id="progressMapping"></div><div id="progressResult" style="margin-top:12px;max-height:35vh;overflow:auto"></div>
        <div id="progressHistory" style="margin-top:12px"></div>
    </div>`;
    document.body.appendChild(modal);
    const result = modal.querySelector("#progressResult");
    const historyBox = modal.querySelector("#progressHistory");
    function historyLabel(entry) {
        const weeks = [...new Set((entry.items || []).map(item => {
            if (Number.isInteger(item.week)) return item.week;
            const match = entry.blockCourseId ? /_(\d{1,2})_\d+_[^_]+$/.exec(item.id || "") : /_(\d{1,2})$/.exec(item.id || "");
            return match ? Number(match[1]) : null;
        }).filter(w => w >= 1 && w <= 53))].sort((a,b)=>a-b);
        const ranges = [];
        for (const week of weeks) {
            const last = ranges[ranges.length-1];
            if (last && week === last[1]+1) last[1] = week;
            else ranges.push([week,week]);
        }
        const label = ranges.length ? "Uke " + ranges.map(([a,b])=>a===b ? a : a+"–"+b).join(", ") : "Uker ukjent";
        const date = entry.createdAt?.toDate?.();
        return label + (date ? " (" + date.toLocaleString("nb-NO",{dateStyle:"short",timeStyle:"short"}) + ")" : "");
    }
    async function refreshHistory() {
        const entries = await listPlanImports(scope);
        historyBox.innerHTML = entries.length
            ? "<h3>Tidligere importer</h3>" + entries.map((entry,i) => `<p>${escape(historyLabel(entry))} · ${entry.items?.length || 0} planoppføringer <button type="button" data-undo="${i}">Angre denne importen</button></p>`).join("")
            : "<p>Ingen tidligere importer registrert.</p>";
        historyBox.querySelectorAll("[data-undo]").forEach(button => {
            button.onclick = async () => {
                const entry = entries[Number(button.dataset.undo)];
                if (!confirm("Angre denne importen? Planoppføringer som er endret etter importen, beholdes.")) return;
                button.disabled = true;
                try {
                    const status = await undoPlanImport(entry.id);
                    result.textContent = `Angret: ${status.removed} slettet, ${status.restored} gjenopprettet, ${status.preserved} beholdt. Oppdater timeplanen ved behov.`;
                    await refreshHistory();
                } catch(error) { result.textContent = "Kunne ikke fullføre angre: " + error.message; button.disabled=false; }
            };
        });
    }
    refreshHistory().catch(error => { historyBox.textContent = "Kunne ikke hente importhistorikk: " + error.message; });

    const close = () => modal.remove();
    modal.querySelector("#progressClose").onclick = close;
    let lessons;
    try {
        const schedule = await loadTeacherSchedule(teacherId);
        if (blockCourse?.id) {
            lessons = (schedule.lessons || []).filter(l => l.blockCourseId === blockCourse.id);
        } else {
            lessons = (schedule.lessons || []).filter(l => l.source === "class" && l.classId === classId && l.subject === subject);
        }
        const firstPerDay = new Map();
        for (const lesson of [...lessons].sort((a,b) => minutes(a.start)-minutes(b.start))) {
            const day = Number(lesson.weekday);
            if (day >= 1 && day <= 5 && !firstPerDay.has(day)) firstPerDay.set(day, lesson);
        }
        lessons = [...firstPerDay.entries()].sort((a,b)=>a[0]-b[0]).map(([day,lesson])=>({...lesson,weekday:day}));
        if (!lessons.length) throw Error("Fant ingen undervisningsøkter for dette faget i lærerens timeplan.");
        modal.querySelector("#progressDays").textContent = "Forventer " + lessons.length + " dagskolonner: " + lessons.map(l=>weekdays[l.weekday]).join(", ");
    } catch (error) {
        result.textContent = error.message;
        modal.querySelector("#progressPreview").disabled = true;
        return;
    }
    let pastedHtml = "";
    const area = modal.querySelector("#progressPaste");
    area.addEventListener("paste", e => { pastedHtml = e.clipboardData?.getData("text/html") || ""; });
    area.addEventListener("input", e => { if(e.inputType !== "insertFromPaste") pastedHtml=""; result.replaceChildren(); });
    modal.querySelector("#progressPreview").onclick = async () => {
        try {
            const rows = parseTable(area.value, pastedHtml);
            const expected = lessons.length + 1;
            if (advanced) {
                const mapping = modal.querySelector("#progressMapping");
                const signature = JSON.stringify(rows);
                if (mapping.dataset.signature !== signature) {
                    mapping.replaceChildren();
                    mapping.dataset.signature = signature;
                    const header = rows[0] || [];
                    const norm = v => String(v || "").trim().toLowerCase();
                    const width = Math.max(0,...rows.map(r=>r.length));
                    if (!width) throw Error("Tabellen er tom.");
                    const week = header.findIndex(v=>/^(uke|ukenr\.?|ukenummer|week)$/.test(norm(v)));
                    const aliases=["","man","tir","ons","tor","fre"];
                    const matches=lessons.map(l=>header.findIndex(v=>[weekdays[l.weekday].toLowerCase(),aliases[l.weekday],aliases[l.weekday]+"."].includes(norm(v))));
                    const hasHeader=week>=0 || matches.some(i=>i>=0);
                    const skip=document.createElement("input");skip.type="checkbox";skip.checked=hasHeader;skip.id="progressSkipHeader";
                    const label=document.createElement("label");label.append(skip," Første rad er overskrifter");mapping.append(label);
                    ["Uke",...lessons.map(l=>weekdays[l.weekday])].forEach((name,i)=>{
                        const row=document.createElement("div"), label=document.createElement("label"), select=document.createElement("select");
                        label.textContent=name+" ";select.dataset.mapping=String(i);
                        const empty=new Option("Velg kolonne","");select.add(empty);
                        for(let c=0;c<width;c++)select.add(new Option("Kolonne "+(c+1)+(header[c]?" – "+String(header[c]).slice(0,80):""),String(c)));
                        const guess=i===0?(week>=0?week:0):(matches[i-1]>=0?matches[i-1]:(!hasHeader&&width===expected?i:-1));
                        select.value=guess>=0?String(guess):"";
                        label.append(select);row.append(label);mapping.append(row);
                    });
                    mapping.addEventListener("change",()=>{result.replaceChildren();});
                    result.textContent="Kontroller kolonnene og trykk Forhåndsvis igjen.";
                    return;
                }
                const selections=[...mapping.querySelectorAll("select[data-mapping]")].map(s=>s.value);
                if(selections.some(v=>v==="")||new Set(selections).size!==selections.length)throw Error("Velg forskjellige kolonner for uke og hver undervisningsdag.");
                const start=mapping.querySelector("#progressSkipHeader").checked?1:0;
                const selected=rows.slice(start).map(row=>selections.map(c=>row[Number(c)]||""));
                rows.splice(0,rows.length,...selected);
            }
            if (!rows.length || rows.every(row => row.every(cell => !cell))) throw Error("Tabellen er tom.");
            const data = [];
            const seen = new Set();
            const grouped = new Map();
            let currentWeek = null;
            for (const [index,row] of rows.entries()) {
                if (index === 0 && /^(uke|ukenr\.?|ukenummer|week)$/i.test(String(row[0] || "").trim())) continue;
                if (row.every(v=>!v)) continue;
                if (row.length !== expected) throw Error("Rad " + (index+1) + " har " + row.length + " kolonner. Forventet " + expected + ".");
                const raw = row[0].replace(/^uke\s*/i,"").trim();
                if (raw) {
                    const week = Number(raw);
                    if (!/^\d{1,2}$/.test(raw) || week < 1 || week > 53) throw Error("Ugyldig ukenummer på rad " + (index+1) + ": " + row[0]);
                    if (seen.has(week) && currentWeek !== week) throw Error("Uke " + week + " finnes i flere adskilte grupper.");
                    currentWeek = week;
                    seen.add(week);
                    if (!grouped.has(week)) grouped.set(week, lessons.map(()=>[]));
                }
                if (currentWeek === null) throw Error("Første datarad må ha ukenummer.");
                for (let j=0;j<lessons.length;j++) if (row[j+1].trim()) grouped.get(currentWeek)[j].push(row[j+1].trim());
            }
            for (const [week, columns] of grouped) {
                columns.forEach((parts,j) => {
                    if (parts.length) data.push({week,lesson:lessons[j],text:parts.join("\n")});
                });
            }
            if (!data.length) throw Error("Fant ingen utfylte planoppføringer å importere.");
            const byWeek = new Map(await Promise.all([...new Set(data.map(x=>x.week))].map(async week=>[week,await loadProgressPlansForWeek(week)])));
            const existing = data.map(x=>{
                const l=x.lesson;
                const identity={classId:l.classId || classId,lessonId:l.lessonId,week:x.week,blockCourseId:scope.blockCourseId,weekday:l.weekday,startTime:l.start};
                const saved=byWeek.get(x.week)[planId(identity)];
                return {...x,identity,status:!saved?"Ny":saved.text===x.text?"Uendret":"Endret"};
            });
            const fresh=existing.filter(x=>x.status==="Ny").length;
            const changed=existing.filter(x=>x.status==="Endret").length;
            result.innerHTML = `<p>${fresh} nye, ${changed} endrede, ${existing.length-fresh-changed} uendrede planoppføringer.</p>
            <div style="overflow:auto;max-height:180px"><table style="width:100%"><thead><tr><th>Uke</th><th>Dag</th><th>Tekst</th><th>Status</th></tr></thead><tbody>${existing.map(x=>`<tr><td>${x.week}</td><td>${weekdays[x.lesson.weekday]}</td><td style="white-space:pre-wrap">${escape(x.text)}</td><td>${x.status}</td></tr>`).join("")}</tbody></table></div>
            <label><input type="checkbox" id="progressOverwrite"> Oppdater også eksisterende fremdriftsplan</label>
            <p>Lærerlekser og elevlekser påvirkes ikke.</p><button id="progressSave">Importer fremdriftsplan</button>`;
            const save=result.querySelector("#progressSave"), overwrite=result.querySelector("#progressOverwrite");
            const refreshSave=()=>{save.disabled=!(fresh+(overwrite.checked?changed:0));};
            overwrite.onchange=refreshSave;
            refreshSave();
            save.onclick=async()=>{
                if(!confirm("Lagre fremdriftsplanen?"))return;
                save.disabled=true;
                overwrite.disabled=true;
                try{
                    const status=await importProgressPlans(scope,teacherId,existing.map(x=>({...x.identity,text:x.text})),{overwrite:overwrite.checked});
                    result.textContent=`Import fullført: ${status.saved} planoppføringer lagret, ${status.skipped} hoppet over.`;
                    await refreshHistory();
                }catch(error){result.textContent="Kunne ikke fullføre import eller oppdatere historikk: "+error.message;}
            };
        } catch(error) { result.textContent = error.message; }
    };
}
