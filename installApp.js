(() => {
  let pending;
  const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); pending = e; });
  window.addEventListener("appinstalled", () => { pending = null; document.getElementById("installTimeplan")?.remove(); });
  window.installTimeplan = async () => {
    if (installed()) return;
    if (pending) { const prompt = pending; pending = null; await prompt.prompt(); return; }
    const dialog = document.createElement("dialog");
    dialog.style.cssText = "width:min(90vw,400px);box-sizing:border-box;border:0;border-radius:16px;padding:20px";
    dialog.innerHTML = '<h2>Installer Min Timeplan</h2><p><b>iPhone:</b> Åpne i Safari, trykk Del og velg Legg til på Hjem-skjerm.</p><p><b>Android:</b> Åpne Chrome-menyen og velg Installer app eller Legg til på startskjermen.</p><p><b>PC:</b> Se etter installasjonsvalget i nettleserens adresselinje eller meny.</p><p>Hvis appen ber deg registrere deg på nytt, bruk heller QR-koden fra den eksisterende elevprofilen. Ikke logg ut av den gamle enheten først.</p><button type="button">Lukk</button>';
    document.body.append(dialog);
    dialog.querySelector("button").onclick = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove(), {once:true});
    dialog.showModal();
  };
  window.isTimeplanInstalled = installed;
})();