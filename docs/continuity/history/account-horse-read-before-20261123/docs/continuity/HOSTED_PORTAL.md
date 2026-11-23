# Tavakuulutuste konto-oleku kontroll on vastu võetud

23.11.2026 Europe/Tallinn. Main **87bff3f** on Maci raporti järgi puhas ja pushitud.
Üks SQL rakendamine ning eraldi verify kinnitasid nelja tavakuulutuse lugeja piiri.
Sama commit’i Ready / Production on kasutaja pildil; kasutaja kinnitas, et lehed avanevad.

## Lõpetatud käik

Selle paketi uuendajat ja SQL-i ei käivitata uuesti. Algsed paketid, raportid ja
päevikud säilivad. Vastuvõtudokumendid on ette valmistatud järgmise koodipaketi
jaoks; nende pärast pole uut Maci kirjutust, build’i, commit’i ega push’i tehtud.
Käsitsi kopeerimist ega uut diagnostikapakki pole vaja.

## Üks järgmine töö

Hobusekuulutuste põhiotsing ja avalik üksikvaade tuleb siduda sama kontoolekuga.
Ulatus on praeguse ühendatud otsingu `horses` haru ning `get_public_horse_offer_v1`.
Avaldamise lõplikkuse abifunktsioon, poliitikad ja teised domeenid jäävad oma
lepingutesse. Täpsed allikad, piirid ja plaanikontroll on
`docs/architecture/account-horse-read-next-20261123.md`-s.

Enne järgmist Maci kirjutust kontrollitakse tegelikku lähtepuud, indeksit,
haru/HEAD-i, remote’i ja SQL eelseisu. Selle järgmise mooduli paigalduskäsku pole
veel väljastatud. Konto sulgemise tegevus järgneb vajalike avalike lugemiste,
kirjutamise, sõnumite ja pilditeede terviku valmimisele.

Ühendatud laiotsingu kaartide koostamine enne lehekülge jääb eraldi jõudlustööks
enne suuremat sisuhulka ja liiklust. SMTP paus ning konto tervik → esiletõstmine
→ reklaamid järjekord säilivad.
