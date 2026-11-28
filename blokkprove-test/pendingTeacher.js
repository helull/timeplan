import { auth, db } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { verifiedIdentity, signOutSecurely } from "./secureAuth.js";

// Blocks application startup until the account has a server-confirmed staff role.
export function waitForTeacherApproval(uid) {
    const dialog = document.createElement("dialog");
    dialog.style.cssText = "position:fixed;inset:0;margin:auto;width:min(90vw,400px);box-sizing:border-box;border:0;border-radius:18px;padding:24px;background:white;color:#172033";
    dialog.innerHTML = '<h2>Venter på godkjenning</h2><p id="pendingEmail"></p><p id="pendingStatus" role="status">Registreringen må godkjennes av administrator før du får tilgang.</p><button type="button">Logg ut</button>';
    dialog.querySelector("#pendingEmail").textContent = auth.currentUser?.email || "";
    const status = dialog.querySelector("#pendingStatus");
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener("cancel", e => e.preventDefault());
    return new Promise(resolve => {
        let finished = false;
        let stopRole = () => {}, stopRequest = () => {};
        function finish(identity) {
            if (finished) return;
            finished = true;
            stopRole(); stopRequest(); dialog.close(); dialog.remove(); resolve(identity);
        }
        async function check() {
            if (finished) return;
            try {
                const identity = await verifiedIdentity();
                if (identity?.uid === uid && ["teacher","admin"].includes(identity.role) && identity.teacherId) {
                    localStorage.setItem("staffHasLoggedIn","true");
                    finish(identity);
                }
            } catch { status.textContent = "Kunne ikke kontrollere godkjenning. Kontroller nettforbindelsen."; }
        }
        stopRole = onSnapshot(doc(db,"userRoles",uid), {includeMetadataChanges:true}, snap => {
            if (!snap.metadata.fromCache && snap.exists()) void check();
        }, () => { status.textContent = "Kunne ikke følge godkjenningen. Last inn siden på nytt."; });
        stopRequest = onSnapshot(doc(db,"teacherRequests",uid), {includeMetadataChanges:true}, async snap => {
            if (snap.metadata.fromCache || finished) return;
            if (!snap.exists()) {
                await check();
                if (!finished) status.textContent = "Ingen ventende forespørsel funnet. Kontakt administrator eller logg ut og registrer deg på nytt.";
            } else status.textContent = "Registrering mottatt! Du kommer automatisk inn når administrator godkjenner deg.";
        }, () => {});
        dialog.querySelector("button").onclick = async () => {
            try { await signOutSecurely(); finish(null); }
            catch { status.textContent = "Kunne ikke logge ut. Prøv igjen."; }
        };
    });
}
