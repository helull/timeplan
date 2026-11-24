import { loadTeacherSchedule } from "./teacherSchedule.js";
import { loadTeacherHomework, saveTeacherHomework } from "./teacherHomeworkService.js";
import { listProgressImports, saveProgressImport, undoProgressImport, homeworkDocumentId, markImportedHomework } from "./progressPlanService.js";

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

export async function openProgressPlanImport({teacherId, classId, subject, blockCourse}) {
    const old = document.getElementById("progressPlanImportModal");
    if (old) return;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "progressPlanImportModal";
    modal.style.zIndex = "10020";
    modal.innerHTML = `<div class="modal-card" style="max-width:850px;max-height:90vh;overflow:auto">
        <h2>Importer fremdriftsplan</h2>
        <p>${escape(subject)} – ${escape(blockCourse?.subject || classId)}</p>
        <p>Lim inn tabellen fra Word, Excel eller OneNote. Første kolonne skal inneholde ukenummer. De øvrige kolonnene følger undervisningsdagene i rekkefølge.</p>
        <p id="progressDays">Henter undervisningsdager …</p>
        <textarea id="progressPaste" rows="9" style="width:100%" placeholder="Lim inn tabellen her"></textarea>
        <div style="margin-top:12px"><button id="progressPreview">Forhåndsvis</button>
        <button id="progressClose">Lukk</button></div>
        <div id="progressResult" style="margin-top:12px;max-height:35vh;overflow:auto"></div>
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
        const entries = await listProgressImports(teacherId, classId, subject, blockCourse?.id || null);
        historyBox.innerHTML = entries.length
            ? "<h3>Tidligere importer</h3>" + entries.map((entry,i) => `<p>${escape(historyLabel(entry))} · ${entry.items?.length || 0} lekser <button type="button" data-undo="${i}">Angre denne importen</button></p>`).join("")
            : "<p>Ingen tidligere importer registrert.</p>";
        historyBox.querySelectorAll("[data-undo]").forEach(button => {
            button.onclick = async () => {
                const entry = entries[Number(button.dataset.undo)];
                if (!confirm("Angre denne importen? Lekser som er endret etter importen, beholdes.")) return;
                button.disabled = true;
                try {
                    const status = await undoProgressImport(entry);
                    result.textContent = `Angret: ${status.removed} lekser slettet, ${status.preserved} beholdt. Oppdater timeplanen ved behov.`;
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
    area.addEventListener("input", e => { if (!e.isTrusted) return; /* HTML fra siste innliming brukes ved forhåndsvisning. */ });
    modal.querySelector("#progressPreview").onclick = async () => {
        try {
            const rows = parseTable(area.value, pastedHtml);
            const expected = lessons.length + 1;
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
            if (!data.length) throw Error("Fant ingen utfylte lekser å importere.");
            const existing = await Promise.all(data.map(async item => {
                const l = item.lesson;
                const saved = await loadTeacherHomework(l.classId || classId,l.lessonId,item.week,null,blockCourse?.id || null,l.weekday,l.start);
                return {...item,existing:String(saved?.text || "").trim()};
            }));
            const filled = existing.filter(x=>x.existing).length;
            result.innerHTML = `<p><strong>${existing.length} utfylte celler</strong> fordelt på ${seen.size} uker. ${filled} har allerede lærerlekse og blir hoppet over.</p>
            <div style="overflow:auto;max-height:180px"><table style="width:100%"><thead><tr><th>Uke</th><th>Dag</th><th>Tekst</th><th>Status</th></tr></thead><tbody>${existing.map(x=>`<tr><td>${x.week}</td><td>${weekdays[x.lesson.weekday]}</td><td style="white-space:pre-wrap">${escape(x.text)}</td><td>${x.existing ? "Finnes fra før" : "Ny"}</td></tr>`).join("")}</tbody></table></div>
            <p>Eksisterende lærerlekser overskrives aldri av denne importen.</p><button id="progressSave">Importer ${existing.length-filled} nye lærerlekser</button>`;
            const save = result.querySelector("#progressSave");
            save.disabled = filled === existing.length;
            save.onclick = async () => {
                if (!confirm(`Importere opptil ${existing.length-filled} nye lærerlekser? Eksisterende blir ikke overskrevet.`)) return;
                save.disabled = true;
                let count = 0;
                const imported = [];
                try {
                    for (const x of existing.filter(x=>!x.existing)) {
                        const l=x.lesson;
                        const latest=await loadTeacherHomework(l.classId || classId,l.lessonId,x.week,null,blockCourse?.id || null,l.weekday,l.start);
                        if (String(latest?.text||"").trim()) continue;
                        await saveTeacherHomework(l.classId || classId,l.lessonId,x.week,x.text,teacherId,blockCourse?.id || null,l.weekday,l.start);
                        count++;
                        const id = homeworkDocumentId(l.classId || classId,l.lessonId,x.week,blockCourse?.id || null,l.weekday,l.start);
                        const token = crypto.randomUUID();
                        await markImportedHomework(id,token);
                        imported.push({id,text:x.text,token,week:x.week});
                    }
                    if (imported.length) await saveProgressImport(teacherId,classId,subject,blockCourse?.id || null,imported);
                    await refreshHistory();
                    result.textContent = `Import fullført: ${count} lærerlekser lagret. Lukk vinduet og oppdater timeplanen ved behov.`;
                } catch(error) {
                    result.textContent = `Import avbrutt etter ${count} lagrede lekser: ${error.message}. Allerede lagrede lekser er beholdt.`;
                }
            };
        } catch(error) { result.textContent = error.message; }
    };
}
