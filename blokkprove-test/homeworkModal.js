import { loadOneNoteLink, saveOneNoteLink, validateOneNoteUrl } from "./lessonProgressPlanService.js";
import { attachPlanToModal } from "./progressPlanViewer.js";
import { db } from "./firebase.js";
import { doc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    loadStudentsBlockCourseByLesson
}
from "./studentBlockCourseService.js";

import {
   loadSchedule
}
from "./scheduleService.js";

import {
    saveBlockCourse,
    loadBlockCourseByLesson,
    loadBlockCoursesForStudentsByLesson,
    loadBlockCoursesByGradeAndTeacher,
    updateBlockCourse,
    deleteBlockCourse,
    loadBlockCoursesForSession
}
from "./blockCourseService.js";

import {
    saveTeacherHomework,
    loadTeacherHomework
}
from "./teacherHomeworkService.js";

import { openProgressPlanImport } from "./progressPlanImport.js";
import { clearBlockCourseHomework, blockCourseSessionsChanged } from "./progressPlanService.js";

import {
    saveTentamen,
    loadTentamens,
    deleteTentamen
}
from "./tentamenService.js";

import {
    saveHomework,
    loadHomework,
    saveExamFlag,
    loadExamFlag,
    saveBlockExam,
    loadBlockExams,
    deleteBlockExam
}
from "./homeworkService.js";

import {
    saveDayHoliday,
    saveWeekHoliday,
    removeDayHoliday,
    removeWeekHoliday,
    hasDayHoliday,
    hasWeekHoliday
}
from "./holidayService.js";

import {
    isTeacher,
    isAdmin,
    giveTeacherName,
    giveTeacherId
}
from "./teacher.js";

// Enkel sperre for elevers oppretting og sletting av prøver.
// Dette er en UI-sperre, ikke sikker autentisering (Firestore-reglene er åpne).
async function bekreftProveTilgang() {
    if (isTeacher()) return true;
    return confirm("Vil du endre den felles prøveplanen?");
}

export async function openHomeworkModal(
    lessonId,
    week,
    weekday,
    subject,
    roomName,
    startTime,
    sourceClassId = null,
    sourceBlockCourseId = null
) {

   

   
    if (document.getElementById("homeworkModal")) {
        return;
    }

    // Vis vinduet straks; behold samme ID for å hindre dobbeltåpning.
    const loadingModal = document.createElement("div");
    loadingModal.id = "homeworkModal";
    loadingModal.className = "modal";
    loadingModal.innerHTML = `<div class="modal-card" role="status" aria-live="polite">
        <h2>Lekser og prøver</h2>
        <p style="opacity:.7">Henter opplysninger …</p>
        <button type="button" id="closeHomeworkLoading">Lukk</button>
    </div>`;
    document.body.appendChild(loadingModal);
    let cancelled = false;
    loadingModal.querySelector("#closeHomeworkLoading").addEventListener("click", () => {
        cancelled = true;
        loadingModal.remove();
    });
    // Gi nettleseren anledning til å tegne vinduet før datahenting.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (cancelled) return;
    try {

    const classId = sourceClassId || localStorage.getItem("classId") || "";

   const grade =
    classId.includes("1") ? "VG1" :
    classId.includes("2") ? "VG2" :
    classId.includes("3") ? "VG3" :
    classId.includes("4") ? "VG4" :
    null;
   
    var teacherMode = isTeacher();
    const progressMode = localStorage.getItem("progressImportMode");

    const isBlockSubject = subject?.toUpperCase().includes("BLOKK");
    const isBlockRoom = roomName?.toUpperCase().includes("BLOKK");

    const canCreateBlockCourse =
    teacherMode &&  (isBlockSubject ||  isBlockRoom);

   // Start uavhengige oppslag samtidig. Ingen ekstra Firestore-lesinger.
   const availableCoursesPromise = !teacherMode && (isBlockSubject || isBlockRoom)
       ? loadBlockCoursesForSession(grade, weekday, startTime)
       : Promise.resolve([]);
   const teacherIdentityPromise = teacherMode
       ? giveTeacherId().then(async id => ({ id, name: await giveTeacherName(id) }))
       : Promise.resolve({ id: undefined, name: false });
   const dayHolidayPromise = hasDayHoliday(week, weekday);
   const weekHolidayPromise = hasWeekHoliday(week);
   const homeworkPromise = loadHomework(lessonId, week);
   const examPromise = loadExamFlag(classId, lessonId, week);
   const studentBlockPromise = !teacherMode
       ? loadStudentsBlockCourseByLesson(lessonId, weekday, startTime)
       : Promise.resolve(null);

   const [availableBlockCourses, identity, dayHolidayEnabled, weekHolidayEnabled,
          homeworkData, examInfo, savedBlockCourse] = await Promise.all([
       availableCoursesPromise, teacherIdentityPromise, dayHolidayPromise,
       weekHolidayPromise, homeworkPromise, examPromise, studentBlockPromise
   ]);
   if (cancelled) return;
   const teacherId = identity.id;
   const teacher = identity.name;
   const currentText = homeworkData.text;
   let existingBlockCourse = null;
   const teachersBlockCourses = teacherId
       ? await loadBlockCoursesForSession(grade, weekday, startTime, teacherId)
       : [];
   if (cancelled) return;
    // Lærerens blokkort har allerede en entydig blokkfag-ID.
    // Bruk den, ikke et indirekte oppslag som kan treffe feil klasse/trinn.
    let blockCourse = null;
    if (teacherMode && sourceBlockCourseId) {
        blockCourse = teachersBlockCourses.find(course => course.id === sourceBlockCourseId) ?? null;
        if (!blockCourse) {
            const blockSnap = await getDoc(doc(db, "blockCourses", sourceBlockCourseId));
            if (cancelled) return;
            if (blockSnap.exists() && blockSnap.data().teacherId === teacherId) {
                blockCourse = { id: blockSnap.id, ...blockSnap.data() };
            }
        }
        if (!blockCourse) {
            alert("Fant ikke blokkfaget for denne lærerøkten. Leksene er ikke endret.");
            document.getElementById("homeworkModal")?.remove();
            return;
        }
    } else {
        blockCourse = teachersBlockCourses[0] ?? null;
    }
    // Overskrift for lærerens lekse: vanlig fag eller blokkfag.
    const blockGrade = String(blockCourse?.grade || grade || "").toUpperCase();
    const teacherHomeworkHeading = (isBlockSubject || isBlockRoom || blockCourse)
        ? `${blockCourse?.subject?.trim() || "Blokkfag"} (${blockGrade})`
        : `${subject || "Fag"} (${classId})`;
    const safeTeacherHomeworkHeading = teacherHomeworkHeading
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");


   if (canCreateBlockCourse) {
        existingBlockCourse =  blockCourse;
    }
    
    const teacherHomeworkData = await loadTeacherHomework(
        classId,
        lessonId,
        week,
        teacherId,
        (teacherMode ? blockCourse?.id : savedBlockCourse?.id) ?? null,
        weekday,
        startTime
    );

    if (cancelled) return;
    const teacherHomeworkText = teacherHomeworkData.text || "";
    
    console.log("teacherHomeworkText råverdi",JSON.stringify(teacherHomeworkText));
    
    const blockSession = !!(isBlockSubject || isBlockRoom || sourceBlockCourseId);
    const examCourse = teacherMode ? blockCourse : savedBlockCourse;
    const scopedExams = blockSession ? (await loadBlockExams(week, weekday, startTime, classId)).filter(e => (e.blockCourseId || null) === (examCourse?.id || null)) : [];
    let examEnabled = blockSession ? scopedExams.length > 0 : examInfo.exam;

//feilsøking 12.11.2026
    console.table(
    availableBlockCourses.map(course => ({
        id: course.id,
        subject: course.subject,
        teacherName: course.teacherName,
        selected: savedBlockCourse?.id === course.id
    }))
);

    
const blockCourseHtml = (!teacherMode && availableBlockCourses.length > 0)
    ?
    `
    <label>Fag</label>

    <select id="blockCourseSelect"
            style="width:100%; margin-bottom:10px;">

        <option value="" ${!savedBlockCourse ? "selected" : ""}>
            Velg fag
        </option>

        ${availableBlockCourses.map(course =>
            `<option value="${course.id}"
                ${savedBlockCourse?.id === course.id ? "selected" : ""}>
                ${course.subject}
                (${course.teacherName})
            </option>`
        ).join("")}

    </select>
    `
    :
    "";
  
    if (cancelled) return;
    loadingModal.remove();
    document.body.insertAdjacentHTML(

        "beforeend",

        `
        <div
            class="modal"
            id="homeworkModal">

            <div
                class="modal-card">

                <h2>
                    ${isAdmin()
                        ? `Fridager, prøver og EFP`
                        : "Lekser og prøve for dette fag"}
                </h2>

                ${
    true
    ?
    `
    ${
        teacherHomeworkText
        ?
        `
        <div
            class="teacher-homework-card">

            <div
                class="teacher-homework-title">

                📚 Lekse til i dag (${classId})

            </div>

            <div
                class="teacher-homework-text">
                    ${formatTeacherHomework(teacherHomeworkText)}
            </div>

        </div>

        
        `
        :
        ""
    }

${!teacherMode ? `${blockCourseHtml}

    <div
        class="student-homework-title">

        📝 Mine notater

    </div>

    <textarea
        id="homeworkText"
        rows="8"
        style="width:100%;">${currentText || ""} </textarea>` : ""}
    `
    :
    ""
}
${
    teacherMode
    ?
    `
    <h3>
        📚 ${safeTeacherHomeworkHeading}
    </h3>

    <textarea
        id="teacherHomeworkText"
        rows="5"
        style="width:100%;">
${teacherHomeworkText}
    </textarea>
    
    <button
        id="saveTeacherHomework">

        Lagre lærerlekse

    </button>
    <button id="editOneNoteLink" type="button" ${((isBlockSubject || isBlockRoom) && !blockCourse?.id) ? "disabled" : ""}>OneNote-lenke</button>
    ${["standard","advanced"].includes(progressMode) ? `<button id="importProgressPlan" type="button" ${((isBlockSubject || isBlockRoom) && !blockCourse?.id) ? "disabled title=\"Opprett blokkfaget først\"" : ""}>${progressMode === "advanced" ? "Importer fremdriftsplan (avansert)" : "Importer fremdriftsplan"}</button>` : ""}
${
    canCreateBlockCourse
    ?
    `
    

    <button
        id="createBlockCourse">

        ${
    existingBlockCourse
    ?
    "Rediger blokkfag"
    :
    "Etabler fag i denne blokka"
}

    </button>

    <hr>
    `
    :
    ""
}
    <hr>
    `
    :
    ""
}
                

                <button
                    id="saveHomework"
                    ${isTeacher() ? "disabled" : ""}>

                    Lagre mine lekser

                </button>

                <button
                    id="toggleExam"
                    style="
                        background:${examEnabled ? "#ff0000" : ""};
                        color:${examEnabled ? "#ffffff" : ""};
                    ">

                    Prøve denne timen

                </button>

                ${
                    isAdmin()
                    ?
                    `
                    <button
                        id="leggInnFridag"
                        style="
                            background:${dayHolidayEnabled ? "#ff0000" : ""};
                            color:${dayHolidayEnabled ? "#ffffff" : ""};
                        ">

                        For skolen:
                        Gjør denne dagen undervisningsfri

                    </button>

                    <button
                        id="leggInnFriuke"
                            style="
                            background:${weekHolidayEnabled ? "#ff0000" : ""};
                            color:${weekHolidayEnabled ? "#ffffff" : ""};
                        ">

                        For skolen:
                        Gjør hele uken til friuke

                    </button>
                    <button
                        id="manageTentamens">

                        For skolen: EFP
                    </button>
                    `
                    :
                    ""
                }

                <button
                    id="closeHomework">

                    Lukk

                </button>

            </div>

        </div>
        `
    );

    
    attachPlanToModal(document.getElementById("homeworkModal"), {classId,subject,lessonId,week:Number(week),weekday:Number(weekday),startTime,blockCourseId:(teacherMode ? blockCourse?.id : savedBlockCourse?.id) || null}, teacherHomeworkText);

    const blockCourseSelect = document.getElementById("blockCourseSelect");
    blockCourseSelect?.addEventListener("change", async () => {
        const studentId = localStorage.getItem("studentId");
        const selectedId = blockCourseSelect.value;
        if (!studentId) { alert("Fant ikke elevprofilen. Logg inn på nytt."); return; }
        blockCourseSelect.disabled = true;
        try {
            const ref = doc(db, "students", studentId);
            await runTransaction(db, async tx => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error("Elevprofilen finnes ikke.");
                const availableIds = new Set(availableBlockCourses.map(course => course.id));
                const ids = (snap.data().selectedBlockCourses || []).filter(id => !availableIds.has(id));
                if (selectedId && availableIds.has(selectedId)) ids.push(selectedId);
                tx.update(ref, {selectedBlockCourses: ids});
            });
            location.reload();
        } catch (error) {
            console.error("Kunne ikke lagre blokkfag", error);
            alert("Kunne ikke lagre fagvalget: " + error.message);
            blockCourseSelect.value = savedBlockCourse?.id || "";
            blockCourseSelect.disabled = false;
        }
    });

    document.getElementById("manageTentamens")?.addEventListener("click", async () => {
            await openTentamenModal(
                week,
                weekday
            );

        }
    );
    
let dayHolidayState =  dayHolidayEnabled;

document
    .getElementById(
        "leggInnFridag"
    )
    ?.addEventListener(
        "click",
        async () => {

            const button =

                document.getElementById(
                    "leggInnFridag"
                );

            if (
                dayHolidayState
            ) {

                await removeDayHoliday(
                    week,
                    weekday
                );

                dayHolidayState =
                    false;

            } else {

                await saveDayHoliday(
                    week,
                    weekday
                );

                dayHolidayState =
                    true;
            }

            button.style.background =

                dayHolidayState
                    ? "#ff0000"
                    : "";

            button.style.color =

                dayHolidayState
                    ? "#ffffff"
                    : "";

        }
    );
    
  let weekHolidayState =
    weekHolidayEnabled;

document
    .getElementById(
        "leggInnFriuke"
    )
    ?.addEventListener(
        "click",
        async () => {

            const button =

                document.getElementById(
                    "leggInnFriuke"
                );

            if (
                weekHolidayState
            ) {

                await removeWeekHoliday(
                    week
                );

                weekHolidayState =
                    false;

            } else {

                await saveWeekHoliday(
                    week
                );

                weekHolidayState =
                    true;
            }

            button.style.background =

                weekHolidayState
                    ? "#ff0000"
                    : "";

            button.style.color =

                weekHolidayState
                    ? "#ffffff"
                    : "";

        }
    );

    document
        .getElementById(
            "saveHomework"
        )
        ?.addEventListener(
            "click",
            async () => {

                const text =

                    document
                        .getElementById(
                            "homeworkText"
                        )
                        .value
                        .trim();

                await saveHomework(
                    lessonId,
                    week,
                    text
                );

                document
                    .getElementById(
                        "homeworkModal"
                    )
                    ?.remove();

            }
        );

    document.getElementById("editOneNoteLink")?.addEventListener("click", async () => {
        if(document.getElementById("oneNoteEditor")) return;
        const scope = {classId, subject, blockCourseId:blockCourse?.id || null};
        const dialog=document.createElement("dialog");
        dialog.id="oneNoteEditor";
        dialog.style.cssText="width:min(90vw,480px);box-sizing:border-box;border:0;border-radius:12px;padding:20px";
        dialog.innerHTML='<h2>OneNote-lenke</h2><p>Valgfritt. Elevene kan åpne lenken fra fremdriftsplanen. Kontroller at elevene har tilgang i OneNote.</p><label for="oneNoteUrl">Lenke</label><input id="oneNoteUrl" type="url" placeholder="https://…" style="width:100%;box-sizing:border-box"><p role="status"></p><div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" data-test>Test lenke</button><button type="button" data-save>Lagre</button><button type="button" data-remove>Fjern lenke</button><button type="button" data-close>Lukk</button></div>';
        document.body.append(dialog);
        dialog.addEventListener("close",()=>dialog.remove());
        const input=dialog.querySelector("input"),status=dialog.querySelector('[role="status"]');
        const save=dialog.querySelector("[data-save]"),remove=dialog.querySelector("[data-remove]"),test=dialog.querySelector("[data-test]");
        const busy=value=>{input.disabled=save.disabled=remove.disabled=test.disabled=value;};
        dialog.querySelector("[data-close]").onclick=()=>dialog.close();
        dialog.showModal();busy(true);
        try {input.value=await loadOneNoteLink(scope);busy(false);}
        catch(error){status.textContent="Kunne ikke hente lenken: "+error.message;return;}
        test.onclick=()=>{try{window.open(validateOneNoteUrl(input.value),"_blank","noopener,noreferrer");}catch(error){status.textContent=error.message;}};
        async function store(value){
            busy(true);
            try{await saveOneNoteLink(scope,teacherId,value);input.value=value;status.textContent=value?"Lenken er lagret.":"Lenken er fjernet.";}
            catch(error){status.textContent=error.message;}
            finally{busy(false);}
        }
        save.onclick=()=>store(input.value.trim());
        remove.onclick=()=>{if(confirm("Fjerne OneNote-lenken?"))store("");};
    });
    document.getElementById("importProgressPlan")?.addEventListener("click", () => {
        openProgressPlanImport({teacherId, classId, subject, blockCourse, advanced: progressMode === "advanced"});
    });

    document
    .getElementById(
        "saveTeacherHomework"
    )
    ?.addEventListener(
        "click",
        async () => {

            const text =

                document
                    .getElementById(
                        "teacherHomeworkText"
                    )
                    .value
                    .trim();
            
            // Ikke lagre en kjent blokkøkt som vanlig klasselekse.
            if (teacherMode && (sourceBlockCourseId || isBlockSubject || isBlockRoom) && !blockCourse?.id) {
                alert("Blokkfaget ble ikke funnet. Lærerleksen er ikke lagret.");
                return;
            }
            // Lagre leksen med eller uten blokkurs-tilknytning
            await saveTeacherHomework(
                classId,
                lessonId,
                week,
                text,
                teacherId,
                blockCourse?.id ?? null,
                weekday,
                startTime
            );

            // Timekortet oppdateres av lagringshendelsen; lukk modalen uten varsel.
            document.getElementById("homeworkModal")?.remove();

        }
    );

    document
.getElementById(
    "createBlockCourse"
)
?.addEventListener(
    "click",
    async () => {
        
        // Les dataene på nytt, i tilfelle bruker har vært inne og endret, og så går tilbake før homework-modalen forlates.
        const courses = await loadBlockCoursesForSession(grade, weekday, startTime, teacherId);

        existingBlockCourse = courses[0] ?? null;


        
//       if (window.matchMedia("(orientation: landscape) and (max-width: 900px)").matches) {
       if (window.matchMedia("(orientation: landscape)").matches) {
            await openBlockCourseModal(lessonId, existingBlockCourse, classId);
       } else {
          alert("Snu enheten til landskapsmodus...");
       }
    }
);
    
    document
        .getElementById(
            "toggleExam"
        )
        ?.addEventListener(
            "click",
            async () => {
                if (blockSession && teacherMode && !examCourse) {
                    const notice = document.createElement("div");
                    notice.className = "modal";
                    notice.innerHTML = '<div class="modal-card"><h3>Blokkfag mangler</h3><p>Du må etablere blokkfag først før du kan registrere en prøve i denne timen.</p><button>OK</button></div>';
                    document.body.append(notice);
                    notice.querySelector("button").onclick = () => notice.remove();
                    return;
                }
                if (!await bekreftProveTilgang()) return;
                if (blockSession && !teacherMode && !examCourse) {
                    const title = await openBlockExamModal(week, weekday, startTime, classId);
                    if (title !== null) await saveBlockExam(lessonId, week, weekday, title, startTime, classId, null);
                    document.getElementById('homeworkModal')?.remove();
                    return;
                }
                const newState = !examEnabled;
                const toggle = document.getElementById("toggleExam");
                toggle.disabled = true;
                let success = false;
                try {
                    if (blockSession) {
                        const current = (await loadBlockExams(week, weekday, startTime, classId)).filter(e => (e.blockCourseId || null) === (examCourse?.id || null));
                        if (newState) {
                            success = current.length > 0 || await saveBlockExam(lessonId, week, weekday, examCourse?.subject || "Blokkprøve", startTime, classId, examCourse?.id || null);
                        } else {
                            if (!teacherMode && current.some(e => e.teacher)) {
                                alert("Du kan ikke fjerne en prøve registrert av lærer.");
                                return;
                            }
                            for (const exam of current) await deleteBlockExam(exam.id);
                            success = true;
                        }
                    } else success = await saveExamFlag(lessonId, week, newState, subject, classId);
                } catch(error) {
                    alert("Kunne ikke endre prøven: " + error.message);
                } finally { toggle.disabled = false; }

                if (!success) {
                    return;
                }

                examEnabled =
                    newState;

                const button =
                    document.getElementById(
                        "toggleExam"
                    );

                if (
                    examEnabled
                ) {

                    button.style.background =
                        "#ff0000";

                    button.style.color =
                        "#ffffff";

                } else {

                    button.style.background =
                        "";

                    button.style.color =
                        "";

                }

                /* alert(
                    examEnabled
                        ? "Prøve slått PÅ"
                        : "Prøve slått AV"
                );*/

            }
        );

    document
        .getElementById(
            "closeHomework"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "homeworkModal"
                    )
                    ?.remove();

            }
        );
    } catch (error) {
        console.error("Kunne ikke åpne leksevinduet:", error);
        if (!cancelled && document.getElementById("homeworkModal") === loadingModal) {
            loadingModal.querySelector(".modal-card").innerHTML = `
                <h2>Lekser og prøver</h2>
                <p>Kunne ikke hente opplysningene. Prøv igjen.</p>
                <button type="button" id="closeHomeworkError">Lukk</button>`;
            loadingModal.querySelector("#closeHomeworkError")?.addEventListener("click", () => loadingModal.remove());
        }
    }
}

async function openBlockExamModal(
    week,
    day,
    startTime,
    classId
) {

    const exams = (
        await loadBlockExams(
            week,
            day,
            startTime,
            classId
        )).filter(exam => !exam.blockCourseId);

    return new Promise(
        resolve => {

            document.body
                .insertAdjacentHTML(
                    "beforeend",
                    `
                    <div
                        class="modal"
                        id="blockExamModal">

                        <div
                            class="modal-card">

                            <h3>

                                BLOKK-prøver for ditt fag

                            </h3>

                            <div
                                id="blockExamList">

                                ${
                                    exams.length
                                    ?
                                    exams
                                        .map(
                                            exam =>
                                                `
                                                <div
                                                    class="block-exam-row"
                                                    style="
                                                        display:flex;
                                                        justify-content:space-between;
                                                        align-items:center;
                                                        margin:4px 0;
                                                    ">

                                                    <span>

                                                        🧪 ${exam.title}

                                                    </span>

                                                    <button
                                                        class="delete-block-exam"
                                                        data-id="${exam.id}"
                                                        data-teacher="${exam.teacher}">

                                                        ✕

                                                    </button>

                                                </div>
                                                `
                                        )
                                        .join("")
                                    :
                                    `
                                    <div>

                                        Ingen registrerte prøver.

                                    </div>
                                    `
                                }

                            </div>

                            <hr>

                            <input
                                id="blockExamText"
                                type="text"
                                maxlength="20"
                                placeholder="Fagnavn..."
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            

                            <button
                                id="saveBlockExam">

                                Ny prøve

                            </button>

                            <button
                                id="cancelBlockExam">

                                Lukk

                            </button>

                        </div>

                    </div>
                    `
                );

            document
                .querySelectorAll(
                    ".delete-block-exam"
                )
                .forEach(
                    button => {

                        button.onclick =
                            async () => {

                                const isTeacherExam = button.dataset.teacher === "true";
                                if (isTeacherExam && !isTeacher()) {
                                    alert("Denne prøven kan bare slettes av lærer.");
                                    return;
                                }
                                
                                if (
                                    !confirm(
                                        "Slette denne prøven?"
                                    )
                                ) {
                                    return;
                                }

                                await deleteBlockExam(
                                    button.dataset.id
                                );

                                document
                                    .getElementById(
                                        "blockExamModal"
                                    )
                                    ?.remove();

                                resolve(
                                    null
                                );

                            };

                    }
                );

            document
                .getElementById(
                    "saveBlockExam"
                )
                .onclick =
                () => {

                    const text =
                        document
                            .getElementById(
                                "blockExamText"
                            )
                            .value
                            .trim();

                    if (!text) {

                        alert(
                            "Skriv inn hva prøven gjelder."
                        );

                        return;
                    }

                    document
                        .getElementById(
                            "blockExamModal"
                        )
                        ?.remove();

                    resolve(
                        text
                    );

                };

            document
                .getElementById(
                    "cancelBlockExam"
                )
                .onclick =
                () => {

                    document
                        .getElementById(
                            "blockExamModal"
                        )
                        ?.remove();

                    resolve(
                        null
                    );

                };

        }
    );

}

async function openTentamenModal(
    week,
    day
) {

    if (!isTeacher()) {
        return;
    }

    const tentamens =
        await loadTentamens();

    return new Promise(
        resolve => {

            document.body
                .insertAdjacentHTML(

                    "beforeend",

                    `
                    <div
                        class="modal"
                        id="tentamenModal">

                        <div
                            class="modal-card">

                            <h3>
                                Tentamener
                            </h3>

                            <div
                                id="tentamenList">

                                ${
                                    tentamens.length

                                    ?

                                    tentamens
                                        .map(
                                            tentamen =>

                                                `
                                                <div
                                                    style="
                                                        display:flex;
                                                        justify-content:space-between;
                                                        align-items:center;
                                                        margin:6px 0;
                                                    ">

                                                    <span>

                                                        ${tentamen.grade}
                                                        -
                                                        uke ${tentamen.week}
                                                        -
                                                        dag ${tentamen.day}
                                                        -
                                                        ${tentamen.subject}
                                                        -
                                                        ${tentamen.startTime}

                                                    </span>

                                                    <button
                                                        class="delete-tentamen"
                                                        data-id="${tentamen.id}">

                                                        ✕

                                                    </button>

                                                </div>
                                                `
                                        )
                                        .join("")

                                    :

                                    `
                                    <div>
                                        Ingen registrerte tentamener
                                    </div>
                                    `
                                }

                            </div>

                            <hr>

                            <label>
                                Trinn
                            </label>

                            <select
                                id="tentamenGrade"
                                style="
                                    width:100%;
                                    padding:8px;
                                    margin-top:4px;
                                ">

                                <option value="VG1">
                                    VG1
                                </option>

                                <option value="VG2">
                                    VG2
                                </option>

                                <option value="VG3">
                                    VG3
                                </option>

                            </select>

                            

                            <label>
                                Fag
                            </label>

                            <input
                                id="tentamenSubject"
                                type="text"
                                maxlength="50"
                                placeholder="F.eks. Norsk"

                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            

                            <label>
                                Oppstart
                            </label>

                            <input
                                id="tentamenStart"
                                type="time"
                                value="09:00"

                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                ">

                            

                            <button
                                id="saveTentamen">

                                Lagre tentamen

                            </button>

                            <button
                                id="cancelTentamen">

                                Lukk

                            </button>

                        </div>

                    </div>
                    `
                );

            document
                .querySelectorAll(
                    ".delete-tentamen"
                )
                .forEach(
                    button => {

                        button.onclick =
                            async () => {

                                if (
                                    !confirm(
                                        "Slette tentamen?"
                                    )
                                ) {
                                    return;
                                }

                                await deleteTentamen(
                                    button.dataset.id
                                );

                                alert(
                                    "Tentamen slettet"
                                );

                                document
                                    .getElementById(
                                        "tentamenModal"
                                    )
                                    ?.remove();

                                resolve();
                            };

                    }
                );

            document
                .getElementById(
                    "saveTentamen"
                )
                .onclick =
                async () => {

                    const grade =

                        document
                            .getElementById(
                                "tentamenGrade"
                            )
                            .value;

                    const subject =

                        document
                            .getElementById(
                                "tentamenSubject"
                            )
                            .value
                            .trim();

                    const startTime =

                        document
                            .getElementById(
                                "tentamenStart"
                            )
                            .value;

                    if (
                        !subject
                    ) {

                        alert(
                            "Skriv inn fag."
                        );

                        return;
                    }

                    await saveTentamen(

                        week,
                        day,
                        grade,
                        subject,
                        startTime

                    );

                    alert(
                        "Tentamen lagret"
                    );

                    document
                        .getElementById(
                            "tentamenModal"
                        )
                        ?.remove();

                    resolve();
                };

            document
                .getElementById(
                    "cancelTentamen"
                )
                .onclick =
                () => {

                    document
                        .getElementById(
                            "tentamenModal"
                        )
                        ?.remove();

                    resolve();
                };

        }
    );


}

export function formatTeacherHomework(text) {

    if (!text) {
        return "";
    }

    // Finn første vanlig URL
    const urlMatch =
        text.match(
            /https:\/\/[^\s]+/
        );

    if (urlMatch) {

        const url =
            urlMatch[0];

        return `
            <a
                href="${url}"
                target="_blank"
                rel="noopener noreferrer"
                class="teacher-homework-link">

                📓OneNote/lenke

            </a>
        `;
    }

    // Vanlig tekst
    return text;
}

async function openBlockCourseModal(lessonId, blockCourse = null, sourceClassId = null) {

    const classId = sourceClassId || localStorage.getItem("classId");

   const grade =
    classId.includes("1") ? "VG1" :
    classId.includes("2") ? "VG2" :
    classId.includes("3") ? "VG3" :
    classId.includes("4") ? "VG4" :
    null;
   
   if (!grade) {
      alert ("Fant ikke trinn, avslutter...")
      return;
   }

    var teacherId = await giveTeacherId();
    var teacherName = await giveTeacherName(teacherId);
      
    const schedule =
        await loadSchedule(
            classId
        );

    const lessons =
        schedule.lessons || [];

    const weekdayNames = {
        1: "Mandag",
        2: "Tirsdag",
        3: "Onsdag",
        4: "Torsdag",
        5: "Fredag"
    };

    const dayColumns = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
};

lessons
    .sort(
        (a, b) => {

            if (
                a.weekday !==
                b.weekday
            ) {

                return (
                    a.weekday -
                    b.weekday
                );

            }

            return a.start.localeCompare(
                b.start
            );

        }
    )
    .forEach(
        lesson => {

    // Er dette en blokkøkt?
    const isBlock =
        lesson.subject?.toUpperCase().includes("BLOKK") ||
        lesson.roomName?.toUpperCase().includes("BLOKK");

    // Forhåndsvelg bare blokkøkter
    const checked =
        isBlock &&
        (
            blockCourse?.sessions?.some(session =>
                Number(session.weekday) === Number(lesson.weekday) &&
                session.start === lesson.start
            ) ?? false
        );

             const text =
                isBlock
                ? "🟢 Blokk"
                : (
                    lesson.subject
                        ?.substring(
                            0,
                            5
                        ) || ""
                ) + "...";

            dayColumns[
                lesson.weekday
            ].push(
                `
                <div
                    style="
                        font-size:11px;
                        white-space:nowrap;
                        margin:2px 0;
                    ">

                    <input
                        type="checkbox"
                        ${checked ? "checked" : ""}
                        ${
                            isBlock
                            ? ""
                            : "disabled"
                        }
                        class="blockLesson"
                        data-id="${lesson.lessonId}"
                        data-weekday="${lesson.weekday}"
                        data-start="${lesson.start}"
                        data-subject="${lesson.subject}"
                        data-room="${lesson.roomName}">

                    ${lesson.start}
                    ${text}

                </div>
                `
            );

        }
    );

    document
        .getElementById(
            "blockCourseModal"
        )
        ?.remove();

    document.body
        .insertAdjacentHTML(
            "beforeend",
            `
            <div
                class="modal"
                id="blockCourseModal">

                <div
                    class="modal-card">

                    <h3> Etabler blokkfag </h3>
                    
                    <div class="block-course-row">
                        <div class="field-group">
                            <label for="blockCourseSubject">Fagnavn </label>
                            <input  id="blockCourseSubject" placeholder="Fagnavn..." type="text" value="${blockCourse?.subject || ""}">
                        </div>
                        <div class="field-group">
                            <label for="blockCourseRoom"> Rom</label>
                            <input id="blockCourseRoom" type="text" placeholder="Rom..." value="${blockCourse?.room || ""}">
                        </div>
                    </div>
                    <h4>

                        Velg øktene som tilhører blokkfaget

                    </h4>

<div
    id="blockCourseLessonList"
    style="
        display:grid;
        grid-template-columns:
            repeat(5, 1fr);
        gap:10px;
        margin-top:10px;
    ">

    <div>
        <b>Man</b>
        ${dayColumns[1].join("")}
    </div>

    <div>
        <b>Tir</b>
        ${dayColumns[2].join("")}
    </div>

    <div>
        <b>Ons</b>
        ${dayColumns[3].join("")}
    </div>

    <div>
        <b>Tor</b>
        ${dayColumns[4].join("")}
    </div>

    <div>
        <b>Fre</b>
        ${dayColumns[5].join("")}
    </div>

</div>

                    

                    <button
                        id="saveBlockCourse">

                        ${blockCourse
                          ? "Lagre endringer"      
                          : "Opprett fag"
                      }

                    </button>

${
    blockCourse
    ?
    `
    <button
        id="deleteBlockCourse">

        Slett blokkfag

    </button>
    `
    :
    ""
}
                    <button
                        id="cancelBlockCourse">

                        Avbryt

                    </button>

                </div>

            </div>
            `
        );

    document
        .getElementById(
            "saveBlockCourse"
        )
        .onclick =
        async () => {

            const subject =
                document
                    .getElementById(
                        "blockCourseSubject"
                    )
                    .value
                    .trim();

            const room =
                document
                    .getElementById(
                        "blockCourseRoom"
                    )
                    .value
                    .trim();

            const sessions =
                Array.from(
                    document.querySelectorAll(
                        ".blockLesson:checked"
                    )
                )
                .map(
                    checkbox => ({

                        lessonId:
                            checkbox.dataset.id,

                        weekday:
                            Number(
                                checkbox.dataset.weekday
                            ),

                        start:
                            checkbox.dataset.start,

                        subject:
                            checkbox.dataset.subject,

                        room:
                            checkbox.dataset.room

                    })
                );

            if (!subject) {

                alert(
                    "Skriv inn fagnavn"
                );

                return;

            }

            if (!room) {

                alert(
                    "Skriv inn rom"
                );

                return;

            }

            if (
                sessions.length === 0
            ) {

                alert(
                    "Velg minst én blokkøkt"
                );

                return;

            }

            const lessons = schedule.lessons || [];
            const originLesson = lessons.find(lesson => lesson.lessonId === lessonId);
            
            if (!originLesson || !sessions.some(session =>   Number(session.weekday) === Number(originLesson.weekday) &&  session.start === originLesson.start )) {
                alert("Du må minst velge timen du kom fra...");
                return;
            }

         // Hent alle blokkursene til læreren
        const thisTeachersBlockCourses =  await  loadBlockCoursesByGradeAndTeacher(grade, teacherId);

        // Utelat blokkurs vi eventuelt redigerer
        const otherBlockCourses = thisTeachersBlockCourses.filter(course => course.id !== blockCourse?.id);

        // Kontroller om noen av de valgte timene finnes i andre blokkurs
        const hasConflict = otherBlockCourses.some(course =>
            (course.sessions ?? []).some(otherSession =>
                sessions.some(session =>
                    Number(session.weekday) === Number(otherSession.weekday) &&
                    session.start === otherSession.start
                )
            )
        );

        if (hasConflict) {
            alert("Du har valgt minst en økt fra et av dine anndre fag, denne må fjernes...");
            return;
        }   

if (
    blockCourse
) {
    if (blockCourseSessionsChanged(blockCourse.sessions, sessions)) {
        if (!confirm("Strukturendring av blokkfag medfører at fremdriftsplanen og ALLE lærerlekser i dette blokkfaget blir slettet. Vil du fortsette?")) return;
        try {
            await clearBlockCourseHomework(blockCourse.id);
        } catch (error) {
            alert("Kunne ikke slette lærerleksene. Blokkfaget er ikke endret: " + error.message);
            return;
        }
    }

    await updateBlockCourse(

        blockCourse.id,

        {
            subject,
            room,
            teacherId,
            teacherName,
            grade,
            sessions
        }

    );

    alert(
        "Blokkfag oppdatert"
    );

}
else {

    await saveBlockCourse({

        subject,
        room,
        teacherId,
        teacherName,
        grade,
        sessions

    });

    alert(
        "Blokkfag opprettet"
    );

}

            document
                .getElementById(
                    "blockCourseModal"
                )
                ?.remove();

        };

    document
        .getElementById(
            "cancelBlockCourse"
        )
        .onclick =
        () => {

            document
                .getElementById(
                    "blockCourseModal"
                )
                ?.remove();

        };

   document
.getElementById(
    "deleteBlockCourse"
)
?.addEventListener(
    "click",
    async () => {

        if (
            !confirm(
                "Slette blokkfaget og ALLE tilhørende prøver, lærerlekser og importhistorikk?"
            )
        ) {

            return;

        }

        try {
            await clearBlockCourseHomework(blockCourse.id);
            await deleteBlockCourse(blockCourse.id);
        } catch(error) {
            alert("Kunne ikke slette blokkfaget og tilhørende lekser: " + error.message);
            return;
        }

        alert(
            "Blokkfag slettet"
        );

        document
        .getElementById(
            "blockCourseModal"
        )
        ?.remove();

    }
);

}

