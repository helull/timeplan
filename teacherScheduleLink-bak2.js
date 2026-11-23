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
    // Eget registrert navn er også gyldig, selv uten importerte timer.
    name=match || String(name||'').trim();
    if(!name)throw new Error('Lærernavn mangler');
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
// Ved første innlogging: lag automatisk kobling dersom ingen tydelig kandidat finnes.
// Bruk eksisterende profil og timeplandata; ingen ny Firestore-spørring etter lagring.
export async function ensureInitialTeacherLink(id,record=null) {
  record=record||await getTeacherLink(id);
  if(!record||record.link?.status)return {status:record?.link?.status||null};
  const registered=String(record.profile?.name||'').trim();
  const names=await getImportedTeacherNames();
  const candidate=proposedName(record.profile,names);
  if(candidate||!registered)return {status:null,needsChoice:true};
  await saveTeacherLink(id,'bekreftet',registered);
  return {status:'bekreftet',automatic:true};
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
  const registered=String(record.link?.navn||record.profile?.name||'').trim();
  const backdrop=document.createElement('div');
  backdrop.id='teacherLinkModal';backdrop.className='modal';
  backdrop.style.cssText='position:fixed;inset:0;z-index:2500;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px;box-sizing:border-box';
  const panel=document.createElement('div');
  panel.style.cssText='background:#fff;color:#172033;border-radius:16px;padding:22px;max-width:440px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 15px 45px #0003';
  const heading=document.createElement('h2');heading.textContent='Knytt deg til timeplanen';heading.style.margin='0 0 12px';panel.append(heading);
  const info=document.createElement('p');info.textContent='Bekreft navnet ditt i skolens timeplan. Dette endrer ikke innloggingen.';panel.append(info);
  const main=document.createElement('div');panel.append(main);
  const status=document.createElement('p');status.setAttribute('role','alert');status.style.cssText='color:#b91c1c;font-size:14px';panel.append(status);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:16px';panel.append(actions);
  const makeButton=(title,primary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=title;b.style.cssText='padding:10px 14px;border-radius:9px;cursor:pointer;border:1px solid #cbd5e1;background:'+(primary?'#2563eb':'#fff')+';color:'+(primary?'#fff':'#172033')+';font-weight:600';actions.append(b);return b;};
  const label=(text)=>{const l=document.createElement('label');l.textContent=text;l.style.cssText='display:block;margin:10px 0 6px;font-weight:600';main.append(l);return l;};
  const input=(placeholder,value='')=>{const el=document.createElement('input');el.type='text';el.placeholder=placeholder;el.value=value;el.style.cssText='box-sizing:border-box;width:100%;padding:10px;border:1px solid #94a3b8;border-radius:8px';main.append(el);return el;};
  let mode=suggested?'suggestion':(registered?'custom':'search');
  let chosen=suggested||'';
  let customValue=registered;
  let filter='';
  let busy=false;
  function show() {
    main.replaceChildren();actions.replaceChildren();status.textContent='';
    if(mode==='suggestion') {
      const small=document.createElement('p');small.textContent='Vi fant et mulig lærernavn:';main.append(small);
      const name=document.createElement('div');name.textContent=suggested;name.style.cssText='background:#f1f5f9;border-radius:10px;padding:16px;font-size:20px;font-weight:700';main.append(name);
      const hint=document.createElement('p');hint.textContent='Kontroller at dette er ditt navn før du bekrefter.';hint.style.cssText='font-size:13px;color:#475569';main.append(hint);
      makeButton('Ja, dette er meg',true).onclick=()=>save('bekreftet',suggested);
      makeButton('Velg et annet navn').onclick=()=>{mode='search';show();};
    } else if(mode==='search') {
      label('Finn navnet ditt i timeplanen');
      const search=input('Søk etter navn',filter);
      const select=document.createElement('select');select.size=5;select.style.cssText='box-sizing:border-box;width:100%;padding:8px;margin-top:8px;min-height:115px';main.append(select);
      const update=()=>{
        const keep=chosen;
        select.replaceChildren();
        for(const item of ranked.filter(x=>normalize(x.name).includes(normalize(search.value)))){
          const opt=document.createElement('option');opt.value=item.name;opt.textContent=item.name;select.append(opt);
        }
        if([...select.options].some(o=>o.value===keep))select.value=keep;
        else select.selectedIndex=-1;
        chosen=select.value||'';
        confirm.disabled=!chosen;
      };
      const confirm=makeButton('Bekreft navn',true);
      confirm.onclick=()=>{if(chosen)save('bekreftet',chosen);};
      select.onchange=()=>{chosen=select.value;confirm.disabled=!chosen;};
      search.oninput=()=>{filter=search.value;chosen='';update();};
      update();
      makeButton('Jeg finnes ikke i timeplanen').onclick=()=>{mode='custom';show();};
      if(suggested)makeButton('Tilbake').onclick=()=>{mode='suggestion';show();};
    } else {
      const description=document.createElement('p');description.textContent='Har du ingen ordinære timer i den importerte timeplanen? Bruk navnet ditt fra lærerprofilen, eller skriv et annet navn.';main.append(description);
      label('Ditt lærernavn');
      const custom=input('Skriv lærernavn',customValue);
      const confirm=makeButton('Bekreft navn',true);
      confirm.disabled=!custom.value.trim();
      custom.oninput=()=>{customValue=custom.value;confirm.disabled=!customValue.trim();};
      confirm.onclick=()=>{if(customValue.trim())save('bekreftet',customValue.trim());};
      if(names.length)makeButton('Velg fra timeplanen').onclick=()=>{mode='search';show();};
    }
    const secondary=document.createElement('div');secondary.style.cssText='display:flex;gap:14px;flex-wrap:wrap;margin-top:16px';panel.querySelector('#teacherLinkSecondary')?.remove();secondary.id='teacherLinkSecondary';
    const later=document.createElement('button');later.type='button';later.textContent='Gjør det senere';later.style.cssText='border:0;background:transparent;color:#475569;text-decoration:underline;cursor:pointer;padding:4px';later.onclick=()=>save('senere');secondary.append(later);
    // Behold den opprinnelige statusen for lærere uten egen timeplan.
    const none=document.createElement('button');none.type='button';none.textContent='Ingen egen timeplan';none.style.cssText='border:0;background:transparent;color:#475569;text-decoration:underline;cursor:pointer;padding:4px';none.onclick=()=>save('ingen');secondary.append(none);
    if(force){const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Avbryt';cancel.style.cssText='border:0;background:transparent;color:#475569;text-decoration:underline;cursor:pointer;padding:4px';cancel.onclick=()=>backdrop.remove();secondary.append(cancel);}
    panel.append(secondary);
  }
  async function save(statusValue,name='') {
    if(busy)return;
    busy=true;
    for(const b of panel.querySelectorAll('button'))b.disabled=true;
    status.textContent='';
    try {
      await saveTeacherLink(id,statusValue,name);
      backdrop.remove();
      if(onSaved)await onSaved(statusValue);
    } catch(err) {
      console.error('Kunne ikke lagre timeplankobling:',err);
      status.textContent='Kunne ikke lagre valget. Kontroller tilgang til lærerprofilen i Firestore.';
      busy=false;
      for(const b of panel.querySelectorAll('button'))b.disabled=false;
    }
  }
  show();backdrop.append(panel);document.body.append(backdrop);
}
