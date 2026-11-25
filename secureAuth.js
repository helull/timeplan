import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDocFromServer } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Staging helper: never infer privileges from localStorage or a claimed email.
export async function verifiedIdentity() {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return null;
    const snapshot = await getDocFromServer(doc(db, "userRoles", user.uid));
    if (auth.currentUser?.uid !== user.uid) return null;
    const role = snapshot.data();
    if (role?.role === "admin" || role?.role === "teacher") {
        if (user.isAnonymous) throw new Error("Ugyldig kontotype for denne rollen.");
        return { uid: user.uid, role: role.role, teacherId: role.teacherId ?? null };
    }
    if (user.isAnonymous) return { uid: user.uid, role: "student" };
    return { uid: user.uid, role: "unassigned" };
}

export async function signInStaff(email, password) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    try {
        const identity = await verifiedIdentity();
        if (!identity || !["admin", "teacher"].includes(identity.role)) {
            throw new Error("Kontoen er ikke godkjent som lærer eller administrator.");
        }
        return identity;
    } catch (error) {
        await signOut(auth);
        throw error;
    }
}

export async function signInStudent() {
    await auth.authStateReady();
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
        throw new Error("Logg ut av lærerkontoen først.");
    }
    if (!auth.currentUser) await signInAnonymously(auth);
    return verifiedIdentity();
}

export async function signOutSecurely() {
    await signOut(auth);
}
