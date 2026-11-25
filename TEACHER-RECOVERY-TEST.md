# Test av lærerinnlogging etter glemt passord (Spark)

Ikke bruk en virkelig lærer eller slett eksisterende faglige data. Bruk en separat testprofil og testkonto, helst i emulator. Ikke bruk administratorens teacherId.

## Før nullstilling
- Opprett testprofil i teachers med permanent teacherId og registrert navn.
- Koble testkontoens UID til teacherId i userRoles med role teacher.
- Registrer testlekse, blokkfag, fremdriftsplan og importhistorikk.
- Kontroller visningsnavn uten bekreftet timeplanTilknytning, deretter med bekreftet navn.
- Ta vare på dokument-ID-er og dokumentinnhold for sammenligning.

## Nullstilling
- Kontroller identitet uten å stole på oppgitt e-post alene.
- Fjern gammel userRoles-tilknytning først, deretter kun den gamle Authentication-kontoen via Firebase Console.
- Opprett ny Authentication-konto med samme e-post og nytt passord.
- Koble ny UID til nøyaktig samme teacherId. Ikke overskriv teachers-dokumentet.
- Kontroller at gammel UID ikke har lærerrettigheter, og at ny UID har teacher, ikke admin.

## Etter nullstilling
- Sammenlign alle faglige dokumenter med førbildet.
- Kontroller egen timeplan, blokkfag, lærerlekser, fremdriftsplaner, importhistorikk og begge navnevalg.
- Kontroller at gamle og nye sesjoner ikke kan aktivere admin.
- Ingen sletting av teachers, schedules, classes, settings, holidays eller andre faglige samlinger.

## Begrensninger
Spark-klienten kan ikke slette andre Authentication-kontoer. Bruk Firebase Console for dette. En mailto-lenke krever at læreren selv sender meldingen; automatisk e-post og direkte kontosletting krever en separat betrodd tjeneste. Ingen passord i e-post. Ikke utfør endringer ved GET-lenker. Denne planen er ikke en gjennomført test.
