// Last inn stilarket automatisk, uten endringer i index.html.
if (!document.querySelector('link[data-proveplan-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./proveplan.css', import.meta.url).href;
    link.dataset.proveplanStyle = 'true';
    document.head.appendChild(link);
}

import { loadSchedule } from './scheduleService.js';
import { loadAllExamFlags, loadAllBlockExams } from './homeworkService.js';
import { loadTentamens } from './tentamenService.js';
import { loadStudentsBlockCourseMap } from './studentBlockCourseService.js';
import { isTeacher } from './teacher.js';

const WEEK_ENDS = [40, 52, 8, 18];
const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre'];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = v => String(v ?? '').trim().toLocaleLowerCase('nb-NO');

function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const year = d.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - start) / 86400000) + 1) / 7);
    return { year, week };
}
function mondayOfWeek(year, week) {
    const d = new Date(Date.UTC(year, 0, 4));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + (week - 1) * 7);
    return d;
}
function lastIsoWeek(year) { return isoWeek(new Date(year, 11, 28)).week; }
function futureEndpoint(current, endWeek) {
    let year = current.year;
    if (endWeek < current.week || endWeek > lastIsoWeek(year)) year++;
    while (endWeek > lastIsoWeek(year)) year++;
    return {year, week:endWeek};
}
function weeksBetween(start, end) {
    const out = [];
    let monday = mondayOfWeek(start.year, start.week);
    const finish = mondayOfWeek(end.year, end.week);
    while (monday <= finish && out.length < 60) {
        const p = isoWeek(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
        out.push(p);
        monday.setUTCDate(monday.getUTCDate() + 7);
    }
    return out;
}
function courseMatchesExam(exam, course) {
    if (!course) return false;
    if (exam.blockCourseId) return exam.blockCourseId === course.id;
    // Eksisterende blokkprøver lagrer bare fritekst i title, ikke blokkurs-ID.
    return norm(exam.title) === norm(course.subject);
}
function makeCells(weeks, schedule, examMap, blockExams, tentamens, selectedMap, grade, teacherMode) {
    const lessons = schedule.lessons ?? [];
    const classId = localStorage.getItem('classId') || '';
    const output = [];
    for (const {year,week} of weeks) {
        const cells = [];
        for (let day = 1; day <= 5; day++) {
            const names = new Set();
            const dayLessons = lessons.filter(l => Number(l.weekday) === day);
            const hasBlock = dayLessons.some(l => /BLOKK/i.test(`${l.subject || ''} ${l.roomName || ''}`));
            for (const lesson of dayLessons) {
                const flag = examMap[`${classId}_${lesson.lessonId}_${week}`];
                if (flag?.exam) names.add(flag.subject || lesson.subject);
            }
            // Blokkprøver gjelder trinn, dag og klokkeslett; de er ikke klassespesifikke.
            for (const exam of blockExams) {
                if (Number(exam.week) !== week || Number(exam.day) !== day || exam.grade !== grade) continue;
                const matchingLessons = dayLessons.filter(l =>
                    /BLOKK/i.test(`${l.subject || ''} ${l.roomName || ''}`) &&
                    (!exam.examTime || l.start === exam.examTime));
                if (!matchingLessons.length && !hasBlock) continue;
                if (!matchingLessons.length) continue;
                if (teacherMode) {
                    names.add(exam.title || 'Blokkprøve');
                    continue;
                }
                const choices = matchingLessons.map(l => selectedMap.get(`${grade}_${l.weekday}_${l.start}`)).filter(Boolean);
                if (!choices.length || choices.some(c => courseMatchesExam(exam, c))) {
                    names.add(exam.title || 'Blokkprøve');
                }
            }
            const t = tentamens.find(t => Number(t.week) === week && Number(t.day) === day && t.grade === grade);
            if (t) names.add(t.subject || 'Tentamen');
            cells.push([...names]);
        }
        output.push({year,week,cells});
    }
    return output;
}

export async function openProveplan() {
    if (document.getElementById('proveplanModal')) return;
    const classId = localStorage.getItem('classId');
    if (!classId) { alert('Velg klasse først.'); return; }
    const grade = `VG${classId.charAt(0)}`;
    const current = isoWeek(new Date());
    const modal = document.createElement('div');
    modal.id = 'proveplanModal';
    modal.className = 'modal proveplan-overlay';
    modal.innerHTML = `<section class="modal-card proveplan-card" role="dialog" aria-modal="true" aria-label="Prøveplan">
        <header class="proveplan-header"><h2>Prøveplan · ${esc(classId)}</h2><button type="button" id="proveplanClose" aria-label="Lukk">✕</button></header>
        <label class="proveplan-choice">Til og med <select id="proveplanEnd"></select></label>
        <div class="proveplan-scroll" id="proveplanBody">Henter prøver …</div>
    </section>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('#proveplanClose').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    const select = modal.querySelector('#proveplanEnd');
    const endpoints = WEEK_ENDS.map(week => futureEndpoint(current, week)).sort((a,b) =>
        mondayOfWeek(a.year,a.week) - mondayOfWeek(b.year,b.week));
    for (const e of endpoints) {
        const opt = document.createElement('option');
        opt.value = `${e.year}-${e.week}`;
        opt.textContent = `uke ${e.week}${e.year !== current.year ? ` (${e.year})` : ''}`;
        select.appendChild(opt);
    }
    try {
        const [schedule, exams, blockExams, tentamens, selectedMap] = await Promise.all([
            loadSchedule(classId), loadAllExamFlags(), loadAllBlockExams(), loadTentamens(),
            isTeacher() ? Promise.resolve(new Map()) : loadStudentsBlockCourseMap()
        ]);
        if (!modal.isConnected) return;
        const body = modal.querySelector('#proveplanBody');
        const draw = () => {
            const [year, week] = select.value.split('-').map(Number);
            const rows = makeCells(weeksBetween(current, {year,week}), schedule, exams, blockExams, tentamens, selectedMap, grade, isTeacher());
            body.innerHTML = `<table class="proveplan-table"><thead><tr><th>Uke</th>${DAYS.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${rows.map(r =>
                `<tr><th scope="row">${r.week}${r.year !== current.year ? `<small> ${r.year}</small>` : ''}</th>${r.cells.map(c=>`<td>${c.map(s=>`<span class="proveplan-subject">${esc(s)}</span>`).join('')}</td>`).join('')}</tr>`
            ).join('')}</tbody></table>`;
        };
        select.addEventListener('change', draw);
        draw();
    } catch (err) {
        console.error('Prøveplan:', err);
        if (modal.isConnected) modal.querySelector('#proveplanBody').textContent = 'Kunne ikke hente prøveplanen.';
    }
}
