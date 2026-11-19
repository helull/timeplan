// Kobling mellom godkjent lærer (AFK-epost) og navnet i importerte timeplaner.
import {db} from './firebase.js';
import {doc,getDoc,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import {loadAllSchedules} from './scheduleService.js';

const normalize = s => String(s||'').trim().toLocaleLowerCase('nb-NO').replace(/\s+/g,' ');
const field = 'timeplanTilknytning';
export async function getTeacherLink(id) {
  if(!id)return null;
  const snap=await getDoc(doc(db,'teachers',id));
  if(!snap.exists())return null; // Bare allerede godkjente lærere med profil.
  return {profile:snap.data(),link:snap.data()[field]||null};
}
export async function getImportedTeacherNames() {
  const schedules=await loadAllSchedules();
  const names=new Map();
  for(const schedule of schedules) for(const lesson of (schedule.lessons||[])) {
    const name=String(lesson.teacherName||'').trim();
    if(name && !/^(blokk|ukjent|lærer|teacher|[-–])$/i.test(name)) {
      const key=normalize(name);
      if(!names.has(key))names.set(key,name);
    }
  }
  return [...names.values()].sort((a,b)=>a.localeCompare(b,'nb'));
}
export async function saveTeacherLink(id,status,name='') {
  if(!['bekreftet','senere','ingen'].includes(status))throw new Error('Ugyldig status');
  if(status==='bekreftet') {
    const names=await getImportedTeacherNames();
    const match=names.find(n=>normalize(n)===normalize(name));
    if(!match)throw new Error('Navnet finnes ikke i importerte timeplaner');
    name=match;
  } else name='';
  await updateDoc(doc(db,'teachers',id),{[field]:{status,navn:name,oppdatert:serverTimestamp()}});
}
// Rangering er kun et forslag. Læreren må alltid bekrefte selv.
function tokens(value) {
  return normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9æøå]+/g,' ').trim().split(/\s+/).filter(Boolean);
}
function editDistance(a,b) {
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {
    let previous=row[0];row[0]=i;
    for(let j=1;j<=b.length;j++) {
      const old=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
      previous=old;
    }
  }
  return row[b.length];
}
function nameSimilarity(a,b) {
  const x=tokens(a),y=tokens(b);
  if(!x.length||!y.length)return 0;
  const joinedX=x.join(' '),joinedY=y.join(' ');
  if(joinedX===joinedY)return 1;
  const distance=editDistance(joinedX,joinedY);
  let score=Math.max(0,1-distance/Math.max(joinedX.length,joinedY.length));
  // Rekkefølgen på for- og etternavn kan være ulik.
  if(x.length===y.length && x.slice().sort().join(' ')===y.slice().sort().join(' '))score=1;
  // Likhet i etternavn veier tungt, men er ikke tilstrekkelig alene.
  const lastX=x[x.length-1],lastY=y[y.length-1];
  if(lastX.length>=3&&lastY.length>=3) {
    const surname=1-editDistance(lastX,lastY)/Math.max(lastX.length,lastY.length);
    const first=x[0]&&y[0] ? 1-editDistance(x[0],y[0])/Math.max(x[0].length,y[0].length) : 0;
    score=Math.max(score,.55*Math.max(0,surname)+.45*Math.max(0,first));
  }
  return score;
}
function rankedNames(profile,names) {
  const email=String(profile?.email||'').split('@')[0].replace(/[._-]+/g,' ');
  const registered=profile?.name||'';
  return names.map(name=>({name,score:Math.max(nameSimilarity(registered,name),nameSimilarity(email,name))}))
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'nb'));
}
function proposedName(profile,names) {
  const ranked=rankedNames(profile,names);
  // Forslag bare ved rimelig likhet, og ikke ved nesten like gode kandidater.
  if(!ranked.length||ranked[0].score<.72)return '';
  if(ranked[1]&&ranked[0].score-ranked[1].score<.08)return '';
  return ranked[0].name;
}
export async function openTeacherLinkDialog({force=false,onSaved}={}) {
  const id=localStorage.getItem('teacherId');
  if(!id||document.getElementById('teacherLinkModal'))return;
  const record=await getTeacherLink(id);
  if(!record)return;
  if(!force && record.link?.status)return;
  const names=await getImportedTeacherNames();
  const ranked=rankedNames(record.profile,names);
  const suggested=record.link?.navn&&names.includes(record.link.navn)?record.link.navn:proposedName(record.profile,names);
  const orderedNames=ranked.map(item=>item.name);
  const backdrop=document.createElement('div');
  backdrop.id='teacherLinkModal';backdrop.className='modal';
  backdrop.style.cssText='position:fixed;inset:0;z-index:2500;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px;box-sizing:border-box';
  const panel=document.createElement('div');
  panel.style.cssText='background:#fff;color:#172033;border-radius:16px;padding:22px;max-width:440px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 15px 45px #0003';
  const heading=document.createElement('h2');heading.textContent='Knytt deg til timeplanen';panel.append(heading);
  const info=document.createElement('p');info.textContent='Du er godkjent som lærer. Bekreft hvilket navn som er ditt i de importerte timeplanene. Dette endrer ikke innloggingen.';panel.append(info);
  const label=document.createElement('label');label.textContent='Navn i skolens timeplan';label.style.display='block';panel.append(label);
  const search=document.createElement('input');search.type='search';search.placeholder='Søk etter navn';search.style.cssText='box-sizing:border-box;width:100%;padding:9px;margin:6px 0';panel.append(search);
  const select=document.createElement('select');select.size=Math.min(6,Math.max(2,names.length));select.style.cssText='box-sizing:border-box;width:100%;padding:8px;min-height:70px';panel.append(select);
  const hint=document.createElement('p');hint.style.cssText='font-size:13px;color:#475569';panel.append(hint);
  const status=document.createElement('p');status.setAttribute('role','alert');status.style.color='#b91c1c';panel.append(status);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:15px';panel.append(actions);
  const makeButton=(title)=>{const b=document.createElement('button');b.type='button';b.textContent=title;b.style.cssText='padding:9px 12px;border-radius:8px;cursor:pointer';actions.append(b);return b;};
  const confirm=makeButton('Bekreft valgt navn');const later=makeButton('Gjør det senere');const none=makeButton('Jeg har ingen egen timeplan');
  if(force){const cancel=makeButton('Avbryt');cancel.onclick=()=>backdrop.remove();}
  function populate(filter='') {
    const selected=select.value||suggested;
    select.replaceChildren();
    for(const name of orderedNames.filter(n=>normalize(n).includes(normalize(filter)))){
      const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt);
    }
    if([...select.options].some(o=>o.value===selected))select.value=selected;
    else select.selectedIndex=-1;
    hint.textContent=names.length?(suggested?'Mulig treff: '+suggested+' – bekreft bare hvis det stemmer.':'Mest sannsynlige navn vises øverst. Velg ditt navn, eller velg «Gjør det senere» / «Ingen egen timeplan».'):'Ingen lærernavn funnet i importerte timeplaner.';
    confirm.disabled=!select.value;
  }
  search.oninput=()=>populate(search.value);select.onchange=()=>{confirm.disabled=!select.value;};populate();
  async function save(statusValue,name='') {
    for(const b of actions.querySelectorAll('button'))b.disabled=true;
    status.textContent='';
    try {
      await saveTeacherLink(id,statusValue,name);
      backdrop.remove();
      if(onSaved)await onSaved(statusValue);
    } catch(err) {
      console.error('Kunne ikke lagre timeplankobling:',err);
      status.textContent='Kunne ikke lagre valget. Kontroller tilgang til lærerprofilen i Firestore.';
      for(const b of actions.querySelectorAll('button'))b.disabled=false;
      confirm.disabled=!select.value;
    }
  }
  confirm.onclick=()=>{if(select.value)save('bekreftet',select.value);};
  later.onclick=()=>save('senere');none.onclick=()=>save('ingen');
  backdrop.append(panel);document.body.append(backdrop);
}
