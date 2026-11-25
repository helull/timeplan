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
            const inspect = document.createElement("button");
            inspect.textContent = "Kontroller lærerprofil";
            inspect.onclick = async () => {
                try {
                    const identity = await verifiedIdentity();
                    if (identity?.role !== "admin") throw new Error("Administrator kreves.");
                    const teacherId = String(data.email || "").trim().toLowerCase();
                    if (!/^[^\s@/]+@afk\.no$/.test(teacherId)) throw new Error("Ugyldig adresse.");
                    const profile = await getDocFromServer(doc(db, "teachers", teacherId));
                    info.textContent = (profile.exists() ? "Eksisterende profil: " + (profile.data().name || teacherId) + ". Behold profilen uendret." : "Ny lærer. Opprett profil etter identitetskontroll.") + " UID: " + request.id + ". Rolle må foreløpig tildeles i Firebase Console.";
                } catch (error) { info.textContent = error.message; }
            };
            const dismiss = document.createElement("button");
            dismiss.textContent = "Fjern forespørsel";
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
                if (!confirm("Har du kontrollert lærerens identitet uavhengig av denne forespørselen?")) return;
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
            card.append(heading, email, info, inspect, approve, dismiss);
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
