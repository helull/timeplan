import { collection, onSnapshot, doc, getDocFromServer, deleteDoc, getDocsFromServer, query, where, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { signInStaff, verifiedIdentity, signOutSecurely } from "./secureAuth.js";

const form = document.getElementById("adminLoginForm");
const status = document.getElementById("adminLoginStatus");
const button = document.getElementById("adminLoginButton");
let unsubscribe;
function showRequests() {
    document.getElementById("adminLogin").hidden = true;
    document.getElementById("adminContent").hidden = false;
    unsubscribe?.();
    const container = document.getElementById("requests");
    unsubscribe = onSnapshot(collection(db, "teacherRequests"), snapshot => {
        container.replaceChildren();
        if (snapshot.empty) container.textContent = "Ingen ventende forespørsler";
        snapshot.forEach(request => {
            const data = request.data();
            const card = document.createElement("div");
            card.className = "request-card";
            const heading = document.createElement("h3");
            heading.textContent = data.name || "Ukjent navn";
            const email = document.createElement("p");
            email.textContent = data.email || "";
            const info = document.createElement("p");
            info.textContent = "Kontroller identiteten før du tildeler lærerrettigheter.";
            const teacherIdForPreview = String(data.email || "").trim().toLowerCase();
            info.textContent = "Undersøker lærerprofil…";
            if (/^[^\s@/]+@afk\.no$/.test(teacherIdForPreview)) {
                getDocFromServer(doc(db, "teachers", teacherIdForPreview)).then(profile => {
                    info.textContent = profile.exists()
                        ? "Eksisterende lærer – tidligere tilknytninger beholdes. Registrert navn: " + (profile.data().name || teacherIdForPreview)
                        : "Ny lærer – lærerprofil opprettes ved godkjenning.";
                }).catch(() => { info.textContent = "Kunne ikke hente profilstatus. Godkjenning kontrollerer profilen på nytt."; });
            } else { info.textContent = "Ugyldig AFK-adresse."; }
            const dismiss = document.createElement("button");
            dismiss.textContent = "Avvis";
            dismiss.onclick = async () => {
                if (!confirm("Fjerne bare forespørselen? Dette sletter ikke konto eller lærerprofil.")) return;
                try {
                    if ((await verifiedIdentity())?.role !== "admin") throw new Error("Administrator kreves.");
                    await deleteDoc(doc(db, "teacherRequests", request.id));
                } catch (error) { info.textContent = error.message; }
            };
            const approve = document.createElement("button");
            approve.textContent = "Godkjenn lærer";
            approve.onclick = async () => {
                if (!confirm("Har du kontrollert lærerens identitet uavhengig av denne forespørselen, og at UID tilhører riktig konto i Firebase Authentication?")) return;
                approve.disabled = true;
                try {
                    if ((await verifiedIdentity())?.role !== "admin") throw new Error("Administrator kreves.");
                    const teacherId = String(data.email || "").trim().toLowerCase();
                    if (teacherId !== data.email || !/^[^\s@/]+@afk\.no$/.test(teacherId)) throw new Error("Ugyldig adresse.");
                    const roles = await getDocsFromServer(query(collection(db, "userRoles"), where("teacherId", "==", teacherId)));
                    if (!roles.empty) throw new Error("Profilen har allerede en innloggingsrolle. Kontroller eksisterende konto i Firebase Console først.");
                    const roleRef = doc(db, "userRoles", request.id);
                    const requestRef = doc(db, "teacherRequests", request.id);
                    const profileRef = doc(db, "teachers", teacherId);
                    const lockRef = doc(db, "teacherApprovalLocks", teacherId);
                    await runTransaction(db, async tx => {
                        const [pending, role, profile, lock] = await Promise.all([tx.get(requestRef), tx.get(roleRef), tx.get(profileRef), tx.get(lockRef)]);
                        if (!pending.exists() || pending.data().email !== teacherId || pending.data().approved !== false || role.exists()) throw new Error("Forespørselen er endret eller allerede behandlet.");
                        if (lock.exists()) throw new Error("Profilen har en tidligere godkjenning. Kontroller og fjern gammel godkjenningslås i Firebase Console etter at gammel rolle og konto er fjernet.");
                        if (!profile.exists()) tx.set(profileRef, {name:pending.data().name,email:teacherId,approved:true,createdAt:serverTimestamp()});
                        tx.set(lockRef, {uid:request.id});
                        tx.set(roleRef, {role:"teacher",teacherId});
                        tx.delete(requestRef);
                    });
                } catch (error) { info.textContent = error.message; }
                finally { approve.disabled = false; }
            };
            card.append(heading, email, info, approve, dismiss);
            container.append(card);
        });
    }, error => { container.textContent = "Kunne ikke hente forespørsler: " + error.code; });
}
form.addEventListener("submit", async event => {
    event.preventDefault();
    button.disabled = true;
    try {
        const identity = await signInStaff(document.getElementById("adminEmail").value, document.getElementById("adminPassword").value);
        if (identity.role !== "admin") {
            await signOutSecurely();
            throw new Error("Kun administrator har tilgang.");
        }
        document.getElementById("adminPassword").value = "";
        showRequests();
    } catch (error) { status.textContent = error.code || error.message; }
    finally { button.disabled = false; }
});
try {
    if ((await verifiedIdentity())?.role === "admin") showRequests();
} catch (error) { status.textContent = error.code || error.message; }

const recoveryForm = document.getElementById("recoveryForm");
const recoveryEmail = document.getElementById("recoveryEmail");
const recoveryStatus = document.getElementById("recoveryStatus");
const recoveryNext = document.getElementById("recoveryNext");
const recoveryDeleted = document.getElementById("recoveryDeleted");
const recoveryReply = document.getElementById("recoveryReply");
recoveryEmail.value = new URLSearchParams(location.search).get("recovery") || "";
recoveryDeleted.onchange = () => { recoveryReply.hidden = !recoveryDeleted.checked; };
recoveryForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("recoveryButton");
    const teacherId = recoveryEmail.value.trim().toLowerCase();
    recoveryNext.hidden = true;
    recoveryDeleted.checked = false;
    recoveryReply.hidden = true;
    button.disabled = true;
    try {
        if ((await verifiedIdentity())?.role !== "admin") throw new Error("Administrator kreves.");
        if (!/^[^\s@/]+@afk\.no$/.test(teacherId)) throw new Error("Ugyldig AFK-adresse.");
        if (!document.getElementById("recoveryVerified").checked) throw new Error("Kontroller identiteten først.");
        const roles = await getDocsFromServer(query(collection(db,"userRoles"),where("teacherId","==",teacherId)));
        if (roles.size !== 1 || roles.docs[0].data().role !== "teacher") throw new Error("Stopp: Fant ikke nøyaktig én lærerrolle. Ingen endringer utført.");
        const uid = roles.docs[0].id;
        const roleRef = doc(db,"userRoles",uid);
        const lockRef = doc(db,"teacherApprovalLocks",teacherId);
        const profileRef = doc(db,"teachers",teacherId);
        if (!confirm("Fjerne gamle lærerrettigheter for " + teacherId + "? Faglige data beholdes.")) return;
        await runTransaction(db, async tx => {
            const [role,lock,profile] = await Promise.all([tx.get(roleRef),tx.get(lockRef),tx.get(profileRef)]);
            if (!profile.exists() || !role.exists() || role.data().role !== "teacher" || role.data().teacherId !== teacherId || (lock.exists() && lock.data().uid !== uid)) throw new Error("Uventet kontotilknytning. Ingen endringer utført.");
            tx.delete(roleRef);
            if (lock.exists()) tx.delete(lockRef);
        });
        recoveryStatus.textContent = "Lærerrettigheter fjernet. Lærerprofil og faglige data beholdt.\n\nSlett denne kontoen i Authentication:\nE-post: " + teacherId + "\nUID: " + uid;
        recoveryReply.href = "mailto:" + encodeURIComponent(teacherId) + "?subject=" + encodeURIComponent("Timeplan – nytt passord") + "&body=" + encodeURIComponent("Hei! Den gamle innloggingskontoen er fjernet. Åpne timeplanen, velg lærerinnlogging og Registrer deg med samme e-postadresse og et nytt passord. Jeg godkjenner den nye innloggingen. Dine tidligere faglige data beholdes.");
        recoveryNext.hidden = false;
    } catch(error) { recoveryStatus.textContent = error.message; }
    finally { button.disabled = false; }
});
