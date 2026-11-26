import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

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

test('teacher registration and atomic approval', async () => {
 const env = await initializeTestEnvironment({projectId:'demo-timeplan-security',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try {
  await env.clearFirestore();
  const email='test@afk.no';
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await setDoc(doc(db,'userRoles/admin1'),{role:'admin',teacherId:'admin@afk.no'});
   await setDoc(doc(db,'teachers',email),{name:'Bevart navn',approved:true});
  });
  const admin=env.authenticatedContext('admin1',{firebase:{sign_in_provider:'password'}}).firestore();
  const applicant=env.authenticatedContext('new1',{email,firebase:{sign_in_provider:'password'}}).firestore();
  const data={name:'Nytt navn',email,approved:false,createdAt:serverTimestamp()};
  await assertFails(setDoc(doc(applicant,'teacherRequests/other'),data));
  await assertFails(setDoc(doc(applicant,'teacherRequests/new1'),{...data,email:'other@afk.no'}));
  await assertSucceeds(setDoc(doc(applicant,'teacherRequests/new1'),data));
  await assertFails(setDoc(doc(applicant,'userRoles/new1'),{role:'teacher',teacherId:email}));
  await assertFails(setDoc(doc(admin,'userRoles/new1'),{role:'teacher',teacherId:email}));
  const batch=writeBatch(admin);
  batch.set(doc(admin,'teacherApprovalLocks',email),{uid:'new1'});
  batch.set(doc(admin,'userRoles/new1'),{role:'teacher',teacherId:email});
  batch.delete(doc(admin,'teacherRequests/new1'));
  await assertSucceeds(batch.commit());
  const profile=await assertSucceeds(getDoc(doc(applicant,'teachers',email)));
  if(profile.data().name!=='Bevart navn') throw Error('Profile overwritten');
  const second=env.authenticatedContext('new2',{email,firebase:{sign_in_provider:'password'}}).firestore();
  await assertSucceeds(setDoc(doc(second,'teacherRequests/new2'),data));
  const duplicate=writeBatch(admin);
  duplicate.set(doc(admin,'teacherApprovalLocks',email),{uid:'new2'});
  duplicate.set(doc(admin,'userRoles/new2'),{role:'teacher',teacherId:email});
  duplicate.delete(doc(admin,'teacherRequests/new2'));
  await assertFails(duplicate.commit());
  await assertFails(setDoc(doc(admin,'userRoles/admin1'),{role:'teacher',teacherId:email}));
 } finally {await env.cleanup();}
});

test('password recovery preserves data and revokes only teacher access', async () => {
 const env=await initializeTestEnvironment({projectId:'demo-timeplan-security',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try {
  await env.clearFirestore();
  const email='recover@afk.no';
  const preserved={['teachers/'+email]:{name:'Original'},'teacherHomework/h1':{teacherId:email,text:'Behold'},'lessonProgressPlans/p1':{teacherId:email},'blockCourses/b1':{teacherId:email},'schedules/1STA':{lessons:[]},'classes/1STA':{name:'1STA'},'settings/general':{value:true}};
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   for(const [path,data] of Object.entries({...preserved,'userRoles/admin1':{role:'admin',teacherId:'admin@afk.no'},'userRoles/old1':{role:'teacher',teacherId:email},'teacherApprovalLocks/recover@afk.no':{uid:'old1'},'userRoles/legacy':{role:'teacher',teacherId:'legacy@afk.no'}})) await setDoc(doc(db,path),data);
  });
  const staff=(uid)=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'}}).firestore();
  const admin=staff('admin1'), old=staff('old1');
  const student=env.authenticatedContext('student',{firebase:{sign_in_provider:'anonymous'}}).firestore();
  const recover=db=>{const batch=writeBatch(db);batch.delete(doc(db,'userRoles/old1'));batch.delete(doc(db,'teacherApprovalLocks',email));return batch.commit();};
  await assertFails(recover(old));
  await assertFails(recover(student));
  await assertFails(deleteDoc(doc(admin,'userRoles/admin1')));
  await assertFails(deleteDoc(doc(admin,'userRoles/old1')));
  await assertFails(deleteDoc(doc(admin,'teacherApprovalLocks',email)));
  await assertSucceeds(recover(admin));
  await assertFails(getDoc(doc(old,'classes/1STA')));
  await assertFails(setDoc(doc(old,'teacherHomework/h1'),{text:'changed'}));
  await assertSucceeds(deleteDoc(doc(admin,'userRoles/legacy')));
  for(const [path,data] of Object.entries(preserved)){
   const snap=await assertSucceeds(getDoc(doc(admin,path)));
   if(JSON.stringify(snap.data())!==JSON.stringify(data)) throw Error('Data changed: '+path);
  }
  const fresh=env.authenticatedContext('fresh',{email,firebase:{sign_in_provider:'password'}}).firestore();
  await assertSucceeds(setDoc(doc(fresh,'teacherRequests/fresh'),{name:'New',email,approved:false,createdAt:serverTimestamp()}));
  const batch=writeBatch(admin);
  batch.set(doc(admin,'teacherApprovalLocks',email),{uid:'fresh'});
  batch.set(doc(admin,'userRoles/fresh'),{role:'teacher',teacherId:email});
  batch.delete(doc(admin,'teacherRequests/fresh'));
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(fresh,'teachers',email)));
 } finally {await env.cleanup();}
});

test('student device pairing: atomic, expiring, single use, isolated', async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-timeplan-security',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try {
  await env.clearFirestore();
  const anon=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).firestore();
  const owner=anon('owner'), phone=anon('phone'), stranger=anon('stranger'), existing=anon('existing');
  const teacher=env.authenticatedContext('teacher',{firebase:{sign_in_provider:'password'}}).firestore();
  const token='a'.repeat(64), expired='b'.repeat(64), other='c'.repeat(64);
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await setDoc(doc(db,'students/owner'),{name:'Elev',classId:'1STA',selectedBlockCourses:[]});
   await setDoc(doc(db,'students/existing'),{name:'Annen',classId:'1STA'});
   await setDoc(doc(db,'homework/owner_l1_1'),{studentId:'owner',text:'Behold'});
   await setDoc(doc(db,'studentPairings',expired),{studentId:'owner',issuer:'owner',createdAt:new Date(Date.now()-60000),claimedBy:null});
   await setDoc(doc(db,'userRoles/teacher'),{role:'teacher',teacherId:'teacher@afk.no'});
  });
  const invite={studentId:'owner',issuer:'owner',createdAt:serverTimestamp(),claimedBy:null};
  const claim=(db,uid,key,studentId='owner')=>{
   const batch=writeBatch(db);
   batch.update(doc(db,'studentPairings',key),{claimedBy:uid});
   batch.set(doc(db,'studentDevices',uid),{studentId,token:key});
   return batch.commit();
  };
  await assertFails(setDoc(doc(stranger,'studentPairings',token),invite));
  await assertFails(setDoc(doc(teacher,'studentPairings',token),invite));
  await assertSucceeds(setDoc(doc(owner,'studentPairings',token),invite));
  await assertFails(getDocs(collection(stranger,'studentPairings')));
  await assertFails(getDoc(doc(teacher,'studentPairings',token)));
  await assertFails(setDoc(doc(phone,'studentDevices/phone'),{studentId:'owner',token}));
  await assertFails(claim(phone,'phone',expired));
  await assertFails(claim(existing,'existing',token));
  await assertFails(claim(phone,'phone',token,'existing'));
  await assertFails(getDoc(doc(phone,'homework/owner_l1_1')));
  await assertSucceeds(claim(phone,'phone',token));
  await assertFails(claim(stranger,'stranger',token));
  await assertSucceeds(getDoc(doc(phone,'homework/owner_l1_1')));
  await assertSucceeds(getDocs(query(collection(phone,'homework'),where('studentId','==','owner'))));
  await assertSucceeds(setDoc(doc(phone,'homework/owner_l2_1'),{studentId:'owner',text:'Mobil'}));
  await assertSucceeds(getDoc(doc(owner,'homework/owner_l2_1')));
  await assertSucceeds(setDoc(doc(phone,'students/owner'),{selectedBlockCourses:['b1']},{merge:true}));
  await assertFails(setDoc(doc(phone,'students/phone'),{name:'Ny',classId:'1STA'}));
  await assertFails(getDoc(doc(stranger,'homework/owner_l1_1')));
  await assertSucceeds(setDoc(doc(owner,'studentPairings',other),invite));
  await assertFails(claim(phone,'phone',other));
  await assertSucceeds(deleteDoc(doc(owner,'studentDevices/phone')));
  await assertFails(getDoc(doc(phone,'homework/owner_l1_1')));
  await assertFails(claim(phone,'phone',token));
 } finally {await env.cleanup();}
});

test('OneNote links: member read, owner write, no student writes', async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-timeplan-security',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),'userRoles/owner'),{role:'teacher',teacherId:'owner@afk.no'});
   await setDoc(doc(ctx.firestore(),'userRoles/other'),{role:'teacher',teacherId:'other@afk.no'});
  });
  const staff=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'}}).firestore();
  const owner=staff('owner'),other=staff('other'),student=env.authenticatedContext('student',{firebase:{sign_in_provider:'anonymous'}}).firestore(),outsider=env.unauthenticatedContext().firestore();
  const ref=db=>doc(db,'progressPlanLinks/example');
  const data={scopeKey:'example',teacherId:'owner@afk.no',url:'https://onenote.com/example',updatedAt:serverTimestamp()};
  await assertFails(setDoc(ref(student),data));
  await assertFails(setDoc(ref(other),data));
  await assertFails(setDoc(ref(owner),{...data,url:'javascript:alert(1)'}));
  await assertSucceeds(setDoc(ref(owner),data));
  await assertSucceeds(getDoc(ref(student)));
  await assertSucceeds(getDocs(collection(student,'progressPlanLinks')));
  await assertFails(getDoc(ref(outsider)));
  await assertFails(setDoc(ref(other),{...data,teacherId:'other@afk.no'}));
  await assertFails(deleteDoc(ref(student)));
  await assertFails(deleteDoc(ref(other)));
  await assertSucceeds(setDoc(ref(owner),{...data,url:'https://onenote.com/updated'}));
  await assertSucceeds(deleteDoc(ref(owner)));
 } finally {await env.cleanup();}
});
