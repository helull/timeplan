import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

test('role and ownership matrix', async () => {
 const env = await initializeTestEnvironment({
   projectId: 'demo-timeplan-security',
   firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }
 });
 try {
  await env.withSecurityRulesDisabled(async ctx => {
   const db = ctx.firestore();
   for (const [path,data] of Object.entries({
    'userRoles/admin1': {role:'admin',teacherId:'admin@example.test'},
    'userRoles/teacher1': {role:'teacher',teacherId:'teacher@example.test'},
    'classes/1STA': {name:'1STA'}, 'schedules/1STA': {lessons:[]},
    'settings/general': {value:true}, 'settings/adminAccess': {password:'test-only'},
    'settings/superAccess': {password:'test-only'}, 'holidays/h1': {},
    'homework/student1_l1_1': {studentId:'student1',text:'own'},
    'homework/student2_l1_1': {studentId:'student2',text:'other'},
    'exams/e1': {teacher:true}, 'exams/e2': {teacher:false}
   })) await setDoc(doc(db,path),data);
  });
  const student = env.authenticatedContext('student1',{firebase:{sign_in_provider:'anonymous'}}).firestore();
  const teacher = env.authenticatedContext('teacher1',{firebase:{sign_in_provider:'password'}}).firestore();
  const admin = env.authenticatedContext('admin1',{firebase:{sign_in_provider:'password'}}).firestore();
  const outsider = env.unauthenticatedContext().firestore();
  const unassigned = env.authenticatedContext('unknown',{firebase:{sign_in_provider:'password'}}).firestore();
  for (const path of ['classes/1STA','schedules/1STA','holidays/h1']) {
   for (const db of [student,teacher,admin]) await assertSucceeds(getDoc(doc(db,path)));
   for (const db of [student,teacher,outsider,unassigned]) await assertFails(setDoc(doc(db,path),{}));
   await assertSucceeds(setDoc(doc(admin,path),{}));
   await assertFails(getDoc(doc(outsider,path)));
   await assertFails(getDoc(doc(unassigned,path)));
  }
  for (const db of [student,teacher,admin]) {
   await assertSucceeds(getDoc(doc(db,'settings/general')));
   await assertFails(setDoc(doc(db,'settings/general'),{}));
   await assertFails(getDoc(doc(db,'settings/adminAccess')));
   await assertFails(getDoc(doc(db,'settings/superAccess')));
   await assertFails(setDoc(doc(db,'userRoles/student1'),{role:'admin'}));
  }
  await assertSucceeds(getDoc(doc(student,'homework/student1_l1_1')));
  await assertSucceeds(getDoc(doc(student,'homework/student1_missing_1')));
  await assertFails(getDoc(doc(student,'homework/student2_l1_1')));
  await assertFails(getDoc(doc(teacher,'homework/student1_l1_1')));
  await assertSucceeds(getDoc(doc(admin,'homework/student1_l1_1')));
  await assertSucceeds(getDocs(query(collection(student,'homework'),where('studentId','==','student1'))));
  await assertFails(getDocs(collection(student,'homework')));
  await assertFails(setDoc(doc(student,'homework/student2_l1_1'),{studentId:'student1'}));
  await assertFails(deleteDoc(doc(student,'exams/e1')));
  await assertFails(setDoc(doc(student,'exams/e1'),{teacher:false}));
  await assertSucceeds(setDoc(doc(student,'exams/e2'),{teacher:false}));
  await assertSucceeds(setDoc(doc(student,'students/student1'),{name:'Test',classId:'1STA'}));
  await assertFails(setDoc(doc(student,'students/student2'),{name:'Test',classId:'1STA'}));
 } finally { await env.cleanup(); }
});
