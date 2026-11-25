import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
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
            info.textContent = "Godkjenning er foreløpig deaktivert mens sikker rollefordeling ferdigstilles.";
            card.append(heading, email, info);
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
