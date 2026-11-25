# Sikkerhet – test og overgang

Ingen migrering av gamle elevidentiteter. Ingen sletting av Firestore-data.
Behold schedules, settings, classes og alle andre eksisterende samlinger.

## Før publisering
- Kontroller alle samlinger og dokumentfelter, særlig students, teachers og settings, for private data og passord.
- Test reglene i en separat Firebase-emulator, aldri mot eksisterende data.
- Opprett administratorens userRoles/{UID} via Firebase Console med role: admin og teacherId lik eksisterende lærerprofil. Ikke opprett roller mens åpne regler gjelder.
- Lærerkontoer opprettes i Authentication og tildeles role: teacher og teacherId manuelt.
- Bytt eksponerte passord; ikke gjenbruk dem.
- Anonym autentisering er ikke skoleverifisering. Alle kan opprette anonym konto. Avklar dette før faktisk elevbruk.

## Akseptansetester
| Handling | Anonym elev | Lærer | Admin |
|---|---|---|---|
| Lese schedules/classes/holidays | Ja | Ja | Ja |
| Endre schedules/classes/holidays | Nei | Nei | Ja |
| Lese ordinære settings | Ja | Ja | Ja |
| Endre settings | Nei | Nei | Nei |
| Lese adminAccess/superAccess | Nei | Nei | Nei |
| Lese egne personlige lekser | Ja | Nei | Ja |
| Lese andres personlige lekser | Nei | Nei | Ja |
| Skrive egne personlige lekser | Ja | Nei | Ja |
| Skrive andres personlige lekser | Nei | Nei | Ja |
| Endre elevregistrert prøve | Ja | Ja | Ja |
| Endre lærerregistrert prøve | Nei | Ja | Ja |
| Skrive teacherHomework/tentamens/fremdriftsplan | Nei | Ja | Ja |
| Tildele seg selv rolle | Nei | Nei | Nei |

Uautentisert bruker og ikke-godkjent e-postkonto skal nektes tilgang.
Test også førstegangsregistrering, omlasting, blokkfag, utlogging, feil passord, slettet lærerprofil og nettverksfeil.
Anonym elev som logger ut kan miste tilgang til sin gamle UID; informer om dette.
Ingen av testene er kjørt ennå.
