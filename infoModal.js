// Informasjon for både elev og lærer.
// REDIGER BARE TEKSTEN MELLOM AKSENTTEGNENE (`) NEDENFOR.
// Linjeskift og avsnitt vises slik de er skrevet.
const INFORMASJONSTEKST = 
`Dette er et forsøk på å gi elevene en oversikt over egen skoletid.  Man kan legge inn lekser og markere når det er vurdering i egne fag. Prøveplanen gir en oversikt over hva som finnes av informasjon om planlagte vurderinger.

Velg dag og uke ved sveipe opp og ned eller piltaster opp/ned på datamaskin. Roter telefon til landskap for en enkel ukeoversikt.
Legg inn lekse/prøve ved å trykke på blyanten på fagkortet. SKriver du ordet "prøve", "vurdering" eller "høring" i teksten, kommer det også i prøveplanen din.
Elevene kan bruke systemet uavhengig av om lærer bruker det. Men hvis lærer(e) bruker systemet vil det være en effektiv måte for elevene å se lekser og vurderinger.

Innlogging elev:
- Bruk ditt eget navn eller noe som ligner. Leksene lagres i en database, men det er ingen kobling mot noe annet. Neste gang du logger inn fra samme enhet kommer du inn som samme bruker.  Da får du tilgang til de leksene du selv har lagt inn.
- Hvis du logger ut mister du tilgang til leksene du har lagt inn fra denne enheten og brukerens kobling til blokkfag.
- Du må gjerne ha en bruker på telefon, og en annen på datamaskin, men det er INGEN kobling mellom dem! Jeg vil derfor fraråde dette, bruk timeplanen ENTEN på telefon ELLER på datamaskin!

Innlogging lærer:
- Bruk din afk email-adresse (f.eks karinormann@afk.no).  Du må godkjennes av admin for å komme inn som lærer. Send derfor melding til helgeul@afk.no med spørsmål om tilgang.
- Når du er godkjent, kan du logge inn som denne brukeren (f.eks karinormann@afk.no) og nettleser vil kjenne deg igjen neste gang.

Elev:
- Kan legge inn og endre egne lekser.  Kun synlig for deg.
- Kan sette opp og slette prøve i en vanlig økt.  Synlig for hele klassen (f.eks 1 STA). Passordet er hemmelig!
- Kan sette opp og slette prøve i blokk-økt.  Synlig for hele trinnet (f.eks hele VG1).  Passordet er hemmelig!
- Kan velge tilhørighet til gruppe i blokk-økt dersom lærer har lagt inn blokk-fag.
- Hvis lærer har lagt inn lekser kan alle elever i faget se disse.

Lærer:
- Kan sette opp/bestemme sine fag i blokkøktene.
- Kan sette opp og slette prøve i et fag i en vanlig økt.  Kan bare slettes av lærer, ikke elev.
- Kan sette opp og slette prøve i en blokkøkt.  Synlig for hele trinnet som har denne blokka i dette trinnet.
- Kan lage fremdriftsplan for fagene sine.  Kan også legge inn en lenke til en Onenote-side dersom man har en levende eller statisk fremdriftsplan i Onenote.

Admin:
- Trenger bare jeg å vite om, som er admin, det er ikke meningen lærere skal ha tilgang!

Innspill/Ris/Ros? Kontakt Helge Ullern, -> helgeul@afk.no
`;

let previousFocus = null;
let keyHandler = null;

export function openInfoModal() {
    const existing = document.getElementById('timeplanInfoModal');
    if (existing) { existing.querySelector('#timeplanInfoClose')?.focus(); return; }
    previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.id = 'timeplanInfoModal';
    overlay.className = 'modal timeplan-info-overlay';
    overlay.innerHTML = `
      <section class="modal-card timeplan-info-card" role="dialog" aria-modal="true" aria-labelledby="timeplanInfoTitle" tabindex="-1">
        <header class="timeplan-info-header">
          <h2 id="timeplanInfoTitle">Informasjon</h2>
          <button id="timeplanInfoClose" class="timeplan-info-close" type="button" aria-label="Avslutt" title="Avslutt">✕</button>
        </header>
        <div class="timeplan-info-body" id="timeplanInfoBody"></div>
      </section>`;
    overlay.querySelector('#timeplanInfoBody').textContent = INFORMASJONSTEKST;
    document.body.appendChild(overlay);
    const close = () => {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        overlay.remove();
        if (previousFocus?.isConnected) previousFocus.focus();
    };
    overlay.querySelector('#timeplanInfoClose').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    keyHandler = event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') {
            // Én aktiv knapp: hold tastaturfokus inne i dialogen.
            event.preventDefault();
            overlay.querySelector('#timeplanInfoClose').focus();
        }
    };
    document.addEventListener('keydown', keyHandler);
    overlay.querySelector('#timeplanInfoClose').focus();
}
