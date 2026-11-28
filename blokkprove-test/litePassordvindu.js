import { verifiedIdentity } from "./secureAuth.js";

// Confirmation only; authorization is enforced by Firestore rules.
export async function visLitePassordvindu({ dokument = "superAccess", tittel = "Endre prøve" } = {}) {
    const identity = await verifiedIdentity();
    if (dokument === "adminAccess") return identity?.role === "admin";
    if (dokument !== "superAccess" || !identity || !["student","teacher","admin"].includes(identity.role)) return false;
    return confirm(tittel + "? Endringen gjelder den felles prøveplanen.");
}
