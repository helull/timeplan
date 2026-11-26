import {auth, db} from "./firebase.js";
import {doc,getDocFromServer,runTransaction,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

export async function resolveStudentId() {
    await auth.authStateReady();
    const user=auth.currentUser;
    if (!user?.isAnonymous) return null;
    const link=await getDocFromServer(doc(db,"studentDevices",user.uid));
    if(auth.currentUser?.uid!==user.uid) throw Error("Økten er endret.");
    return link.exists()?link.data().studentId:user.uid;
}

export async function redeemStudentPairing() {
    const match=location.hash.match(/^#pair=([a-f0-9]{64})$/);
    if(!match) return;
    history.replaceState(null,"",location.pathname+location.search);
    const user=auth.currentUser;
    if(!user?.isAnonymous){alert("Sammenkobling er kun for elever.");return;}
    try {
        await runTransaction(db,async tx=>{
            const invite=doc(db,"studentPairings",match[1]);
            const link=doc(db,"studentDevices",user.uid);
            const [p,l,own]=await Promise.all([tx.get(invite),tx.get(link),tx.get(doc(db,"students",user.uid))]);
            if(!p.exists()) throw Error("QR-koden er ugyldig.");
            const data=p.data();
            if(Date.now()>=data.createdAt.toMillis()+30000) throw Error("QR-koden har utløpt. Den er kun gyldig i 30 sekunder.");
            if(data.claimedBy) throw Error("QR-koden er allerede brukt.");
            if(l.exists()||own.exists()) throw Error("Denne enheten har allerede en elevprofil. Ingen data er endret.");
            tx.update(invite,{claimedBy:user.uid});
            tx.set(link,{studentId:data.studentId,token:match[1]});
        });
        alert("Enheten er tilkoblet!");
    } catch(error) {
        alert(error.code==="permission-denied"?"Sammenkobling avvist. QR-koden kan ha utløpt (30 sekunder). Lag en ny kode.":error.message);
    }
}

export async function openStudentPairing() {
    if(document.getElementById("studentPairDialog")) return;
    const uid=await resolveStudentId();
    if(!uid||uid!==auth.currentUser?.uid){alert("Bruk den opprinnelige enheten til sammenkobling.");return;}
    const dialog=document.createElement("dialog");
    dialog.id="studentPairDialog";
    dialog.style.cssText="width:min(90vw,360px);box-sizing:border-box;border:0;border-radius:16px;padding:20px;text-align:center";
    dialog.innerHTML='<h2>Koble til en annen enhet</h2><p><strong>QR-koden er personlig!</strong> Bruk den kun på dine egne enheter. Andre kan få tilgang til dine personlige lekser.</p><p id="pairStatus" role="status">Klargjør …</p><div id="pairQR"></div><button type="button">Lukk</button>';
    document.body.append(dialog);
    dialog.querySelector("button").onclick=()=>dialog.close();
    let timer;
    dialog.addEventListener("close",()=>{clearInterval(timer);dialog.remove();});
    dialog.showModal();
    const status=dialog.querySelector("#pairStatus");
    try {
        // QR rendering must be local; never send the secret to an external QR service.
        const {default:QRCode}=await import("./vendor/qrcode.mjs");
        const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("");
        const url=new URL(location.href);url.hash="pair="+token;
        const canvas=await QRCode.toCanvas(url.href,{width:240,margin:4});
        const started=performance.now();
        await setDoc(doc(db,"studentPairings",token),{studentId:uid,issuer:uid,createdAt:serverTimestamp(),claimedBy:null});
        if(!dialog.open)return;
        dialog.querySelector("#pairQR").append(canvas);
        const tick=()=>{const left=Math.max(0,Math.ceil((30000-(performance.now()-started))/1000));status.textContent=left?left+" sekunder igjen":"QR-koden har utløpt (30 sekunder).";if(!left){canvas.remove();clearInterval(timer);}};
        tick();timer=setInterval(tick,200);
    } catch(error){status.textContent="Kunne ikke lage QR-kode. Prøv igjen.";console.error(error.code||error.name);}
}
