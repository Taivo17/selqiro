# Töökuulutuste kontooleku kontroll — vastu võetud

24.11.2026 Europe/Tallinn. **e336a5b on vastu võetud.** Maci raport, sama
commit’i Ready / Production ning olemasoleva ettevõtte tööpakkumise otsingu,
üksikvaate ja profiililoendi pildid on üle kontrollitud.

Eraisiku aktiivset töökuulutust praegu pole. See veebijuht on märgitud
kontrollimata; uut kuulutust selle vastuvõtu jaoks ei looda.

**Praegu pole vaja midagi käivitada ega sama paketti uuesti paigaldada.**
Originaalraport, väljastatud pakett ja päevikud säilivad.

## Järgmine töö

Järgmine kontoelutsükli alametapp on uue kontakti ja sõnumi kontoõiguse ühine piir: tegutseja ning saaja konto kättesaadavus serveris/andmebaasis, aktiivse teise osapoole senise ajaloo ja korduskviitungite säilitamine. Enne SQL-paketi koostamist täpsustada ainult selle piiri puuduva live-eelseisu funktsiooni- ja õigusepinnid; konto sulgemist veel ei aktiveerita.

Täpne kontoetapi piir on `docs/architecture/account-next-after-job-read-20261124.md`.
Audit ei aktiveeri konto sulgemist ega kustutamist.

## Uudised on enne esiletõstmist ja reklaame

Kasutaja 24.11 täpsustus: Uudised näitab tema jälgimisnimekirja lisatud poodide
uusi kuulutusi ja teateid ning on üks portaali olulisemaid naasmise põhjuseid.
See on põhifunktsioon. V2 link/nupp/näidisteated pole veel töötava uudisvooga
ühendatud. Varasem jälgimise ja voo alus on lähtekoodis olemas.

Konto sulgemise/taastamise/kustutamise tervik → jälgitavate poodide ja profiilide Uudised → kuulutuste esiletõstmine → reklaamid.

Uudiste kavand ning lähtepinnid on `docs/architecture/followed-news-plan-20261124`
failides. E-posti aktiveerimise varasem piir säilib. Vastuvõtudokumendid
kaasatakse järgmise sisulise koodimuudatusega; neid pole pärast e336a5b Maci
kirjutatud ega commit/push tehtud.
