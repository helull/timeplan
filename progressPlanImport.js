import { loadTeacherSchedule } from "./teacherSchedule.js";
import { loadTeacherHomework, saveTeacherHomework } from "./teacherHomeworkService.js";

const weekdays = ["", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const minutes = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t)); return m ? Number(m[1])*60+Number(m[2]) : 9999; };

function parseTable(text, html) {
    if (html && /<table[\s>]/i.test(html)) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table");
        if (table) {
            if (table.querySelector("[rowspan]:not([rowspan='1']),[colspan]:not([colspan='1'])")) throw Error("Tabellen inneholder sammenslåtte celler. Bruk en tabell uten sammenslåing.");
            return [...table.rows].map(row => [...row.cells].map(cell => {
                const clone = cell.cloneNode(true);
                clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
                clone.querySelectorAll("p,div").forEach(p => p.append("\n"));
                return clone.textContent.trim();
            }));
        }
    }
    return String(text || "").trim().split(/\r?\n/).map(line => line.split("\t").map(v => v.trim()));
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
    </div>`;
    document.body.appendChild(modal);
    const result = modal.querySelector("#progressResult");
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
            if (rows.length < 2) throw Error("Tabellen må ha overskrift og minst én uke.");
            const data = [];
            const seen = new Set();
            for (const [index,row] of rows.entries()) {
                if (index === 0) continue;
                if (row.every(v=>!v)) continue;
                if (row.length !== expected) throw Error(`Rad ${index+1} har ${row.length} kolonner. Forventet ${expected}.`);
                const raw = row[0].replace(/^uke\s*/i,"").trim();
                const week = Number(raw);
                if (!Number.isInteger(week) || week < 1 || week > 53) throw Error(`Ugyldig ukenummer på rad ${index+1}: ${row[0]}`);
                if (seen.has(week)) throw Error(`Uke ${week} finnes flere ganger.`);
                seen.add(week);
                for (let j=0;j<lessons.length;j++) if (row[j+1].trim()) data.push({week,lesson:lessons[j],text:row[j+1].trim()});
            }
            if (!data.length) throw Error("Fant ingen utfylte lekser å importere.");
            const existing = await Promise.all(data.map(async item => {
                const l = item.lesson;
                const saved = await loadTeacherHomework(l.classId || classId,l.lessonId,item.week,blockCourse?.id || null,l.weekday,l.start);
                return {...item,existing:String(saved?.text || "").trim()};
            }));
            const filled = existing.filter(x=>x.existing).length;
            result.innerHTML = `<p><strong>${existing.length} utfylte celler</strong> fordelt på ${seen.size} uker. ${filled} har allerede lærerlekse og blir hoppet over.</p>
            <div style="overflow:auto;max-height:180px"><table style="width:100%"><thead><tr><th>Uke</th><th>Dag</th><th>Tekst</th><th>Status</th></tr></thead><tbody>${existing.map(x=>`<tr><td>${x.week}</td><td>${weekdays[x.lesson.weekday]}</td><td>${escape(x.text)}</td><td>${x.existing ? "Finnes fra før" : "Ny"}</td></tr>`).join("")}</tbody></table></div>
            <p>Eksisterende lærerlekser overskrives aldri av denne importen.</p><button id="progressSave">Importer ${existing.length-filled} nye lærerlekser</button>`;
            const save = result.querySelector("#progressSave");
            save.disabled = filled === existing.length;
            save.onclick = async () => {
                if (!confirm(`Importere opptil ${existing.length-filled} nye lærerlekser? Eksisterende blir ikke overskrevet.`)) return;
                save.disabled = true;
                let count = 0;
                try {
                    for (const x of existing.filter(x=>!x.existing)) {
                        const l=x.lesson;
                        const latest=await loadTeacherHomework(l.classId || classId,l.lessonId,x.week,blockCourse?.id || null,l.weekday,l.start);
                        if (String(latest?.text||"").trim()) continue;
                        await saveTeacherHomework(l.classId || classId,l.lessonId,x.week,x.text,teacherId,blockCourse?.id || null,l.weekday,l.start);
                        count++;
                    }
                    result.textContent = `Import fullført: ${count} lærerlekser lagret. Lukk vinduet og oppdater timeplanen ved behov.`;
                } catch(error) {
                    result.textContent = `Import avbrutt etter ${count} lagrede lekser: ${error.message}. Allerede lagrede lekser er beholdt.`;
                }
            };
        } catch(error) { result.textContent = error.message; }
    };
}
