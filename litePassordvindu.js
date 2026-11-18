import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Enkel sperre for elevers oppretting og sletting av prøver.
// Dette er en UI-sperre, ikke sikker autentisering (Firestore-reglene er åpne).
// Kompakt passordvindu for elever. Ingen endring i prøve- eller Firebase-logikk.
export function visLitePassordvindu({ dokument = "superAccess", tittel = "Endre prøve" } = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.setAttribute("role", "presentation");
        overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.30);backdrop-filter:blur(3px)";

        const panel = document.createElement("div");
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Passord for prøve");
        panel.style.cssText = "position:relative;box-sizing:border-box;width:min(100%,310px);padding:20px 20px 17px;border:1px solid #dce5f2;border-radius:17px;background:#f2f6fc;color:#243449;box-shadow:0 18px 48px rgba(15,23,42,.19);font:inherit;text-align:left";
        panel.innerHTML = `
            <button type="button" data-close aria-label="Lukk" title="Lukk" style="position:absolute;top:9px;right:9px;width:29px;height:29px;border:1px solid #dce5f2;border-radius:9px;background:#e8eff8;color:#475569;font-size:19px;cursor:pointer;line-height:1">×</button>
            <div style="display:flex;align-items:center;gap:9px;margin:0 26px 13px 0;font-size:15px;font-weight:650"><span aria-hidden="true">🔒</span><span data-title></span></div>
            <form data-form style="margin:0">
                <input data-password type="password" autocomplete="off" placeholder="Passord" aria-label="Passord" required style="box-sizing:border-box;width:100%;height:39px;padding:8px 11px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#1e293b;font:inherit;font-size:14px;outline-offset:2px" />
                <div data-error role="alert" style="display:none;margin-top:8px;color:#b91c1c;font-size:12px"></div>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
                    <button data-cancel type="button" style="border:1px solid #cbd5e1;border-radius:9px;padding:8px 13px;background:#fff;color:#475569;font:inherit;font-size:13px;cursor:pointer">Avbryt</button>
                    <button data-submit type="submit" style="border:0;border-radius:9px;padding:8px 16px;background:#2563eb;color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer">OK</button>
                </div>
            </form>`;
        panel.querySelector("[data-title]").textContent = tittel;
        overlay.append(panel);
        document.body.append(overlay);
        const input = panel.querySelector("[data-password]");
        const errorEl = panel.querySelector("[data-error]");
        const submit = panel.querySelector("[data-submit]");
        let busy = false;
        let finished = false;
        const previousFocus = document.activeElement;
        const finish = result => {
            if (finished) return;
            finished = true;
            document.removeEventListener("keydown", onKey, true);
            overlay.remove();
            if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
            resolve(result);
        };
        const onKey = event => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (!busy) finish(false);
            }
            if (event.key === "Tab") {
                const controls = [...panel.querySelectorAll("button,input")].filter(el => !el.disabled);
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener("keydown", onKey, true);
        overlay.addEventListener("click", event => { if (event.target === overlay && !busy) finish(false); });
        panel.querySelector("[data-close]").addEventListener("click", () => { if (!busy) finish(false); });
        panel.querySelector("[data-cancel]").addEventListener("click", () => { if (!busy) finish(false); });
        panel.querySelector("[data-form]").addEventListener("submit", async event => {
            event.preventDefault();
            if (busy || !input.value) return;
            busy = true;
            submit.disabled = true;
            submit.textContent = "Sjekker …";
            errorEl.style.display = "none";
            try {
                const snapshot = await getDoc(doc(db, "settings", dokument));
                if (!snapshot.exists() || typeof snapshot.data().password !== "string") {
                    throw new Error("Passordet er ikke konfigurert i Firebase.");
                }
                if (input.value === snapshot.data().password) return finish(true);
                errorEl.textContent = "Feil passord. Prøv igjen.";
                input.value = "";
            } catch (error) {
                console.error("Kunne ikke kontrollere prøvepassord:", error);
                errorEl.textContent = error.message === "Passordet er ikke konfigurert i Firebase."
                    ? error.message : "Kunne ikke kontrollere passordet. Prøv igjen.";
            } finally {
                if (!finished) {
                    busy = false;
                    submit.disabled = false;
                    submit.textContent = "OK";
                    errorEl.style.display = "block";
                    input.focus();
                }
            }
        });
        input.focus();
    });
}

