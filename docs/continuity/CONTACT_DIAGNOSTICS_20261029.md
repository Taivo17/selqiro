# Selqiro kontaktivea diagnostika — 29.10.2026

## Praegune tulemus

Kuulutus **197**, „Müüa BMW”, **4376 €**, müüja **Taivo Garaaž** ja üks pilt
on päris portaalis avaldatud. Kasutaja kuvatõmmised kinnitavad avaldamise teadet,
detaili, suure pildi avanemist ning Minu ala aktiivset rida. Jaani Pood näeb
kuulutust teise e-postiga sisselogituna. Selle kinnituse küsimist ei korrata.

Kontakti avamine ebaõnnestub: `POST /api/v2/listing-contact/contact` tagastas
28.10.2026 kell 20:02:27 UTC **HTTP 503**. Chrome’i Response ei suutnud vastuse
sisu laadida. Täpne serveripoolne põhjus on endiselt teadmata. SQL-i ega
kontoõiguste oletuslikuks muutmiseks pole piisavat tõendit.

Vastuvõetud main-commit on `8f25f65` (eelmine
`e95fa9ce1d41b9b4c6e4884b6076f414173a946d`). Verceli esialgne build oli
Ready 59s; 28.10 sama lähtekoodi Production redeploy oli Ready 1m9s.
Seadistus, kolme konto lubamine ja esimene pildiga avaldamine on tehtud.

## Kitsas parandus

Vana `contactHttp` katkestas mitte-2xx vastuse keha enne lugemist. Uus transport
loeb väikese veavastuse lõpuni kuni **4096 baidi** piires. Tühi, vigane või liiga
suur keha annab jätkuvalt algse HTTP staatuse koos `json: null`-iga. Juba saadud
veastaatust säilitatakse ka veakeha lugemise aegumisel. Kasutaja/kontokonteksti
katkestus jääb katkestuseks; päiste-eelne aegumine jääb teadmata tulemuseks.
Eduka vastuse senine 2 000 000 baidi piir ja range kinnituse kontroll säilivad.

Server lisab fikseeritud loenditest etapi ja põhjuse, vajadusel HTTP staatuse
ning teadaoleva SQLSTATE/PostgREST koodi. Kõik muud upstreami väljad jäetakse
välja. Brauser kontrollib diagnostika kuju uuesti. `message`, `details`, `hint`,
tokenid, konto/identiteedi/päringu ID-d ega sõnumitekst ei pääse veateatesse.

Nupu all kuvatakse näiteks:

> Vestlust ei saanud praegu avada. Tõrkekood: LC-RPC-UNKNOWN-HTTP500-42702.

See on **sünteetiline näide**, mitte kuulutuse 197 tuvastatud põhjus.
Parandus teeb järgmise tõrke nähtavaks; see ei tõenda vestluse avamise vea
lahendamist.

| Koodi etapp | Tähendus |
| --- | --- |
| `REQUEST` | Rakenduse päringu kuju, meetodi või origini kontroll |
| `ACTOR` | Päris sisselogitud kasutaja kontroll |
| `READY` | Paigalduse/konto kasutusvalmiduse kontroll |
| `AUTH` | Kontaktiteenuse kasutaja autentimine |
| `RPC` | Andmebaasifunktsiooni päring või selle veavastus |
| `RECEIPT` | Edukana saabunud vastus ei täitnud täpset kinnituse lepingut |
| `CLIENT` / `REPLY` | Brauseri päring või vastuse käsitlus |

Täpsed lubatud koodid ja vorming asuvad
`src/entities/conversation/model/contactDiagnostic.ts`-s. HTTP kood on selle
etapi kood; näiteks upstream HTTP500 võib rakenduse vastuses jääda HTTP503-ks.
Senine HTTP400/401/403/404/409/422 RPC keeldumise käsitlus säilib.

## Kontrolli piir

- Sihitud Node kontroll: **12/12 PASS**, sünteetilised fetch/Auth/readiness/RPC
  vastused; päris andmebaasi, konto ega sõnumit ei kasutatud.
- Sõltumatu diff’i ülevaatus leidis aeglase veakeha HTTP staatuse kadumise;
  see parandati ning lisati päiste-eelse ja päiste-järgse aegumise kontroll.
- Lõplik **Next 16.2.1 production Webpack-build PASS**, TypeScript PASS ja
  27 staatilist lehte. Sünteetiline konfiguratsioon, lukufail muutmata.
- Build’i järel **kohalik brauserikontroll PASS**, Chrome for Testing
  156.0.8078.73: tegelik nupp, klient, transport ja diagnostika; sünteetiline
  konto/router ja pealt püütud HTTP vastused. Kolm klõpsu → kolm päringut
  sama võtmega; lubatud kood nähtav, kõrvaline tekst välja jäetud, edu
  suunamine õige. JavaScripti vigu ja välisvõrgu päringuid 0; kaks oodatud
  HTTP 503 konsooliteadet. Kontrollkujundus ei ole kogu portaali UI vastuvõtt.
- Uuendaja **13/13 PASS** ajutiste kohalike Git-hoidlate/remote’idega.
  Kontrolliti täpseid kirjutusi, kõrvalise töö säilimist, ebaõnnestunud build’i,
  keeldunud push’i ja kaotsi läinud vastuse ühekordset remote’i kinnitust.
  Build’i/sõltuvuste käsud olid mockitud; Python 3.9 süntaks läbis.
- Uue kandidaadi Maci paigaldus, commit/push ja Verceli Ready on **veel
  kinnitamata**. Päris kontakti algpõhjus ei ole nende kontrollidega teada.

## Järgmine samm

29.10 diagnostikapaki `uuenda.py --publish` kontrollib olemasolevat
`~/selqiro` main-haru ja lähtefailide täpseid haše, rakendab ainult selle paketi
failid, ehitab rakenduse ning teeb tavalise commit/push’i samasse GitHubi.
Uus pakett ei kutsu välja varasemaid paigaldajaid. Juba tehtud pilve-etapid
ja senised privaatpäevikud säilivad. Paki README selgitab ühe käivituskäsu.

Pärast uue commit’i **Vercel Ready** tulemust avab ostja uuesti
`https://selqiro.vercel.app/v2/listing/197` ja vajutab ühe korra **Kirjuta
müüjale**. Ebaõnnestumise korral piisab nupu all olevast `LC-` tõrkekoodist.
Authorization’i ega võtmeid ei küsita. Kui vestlus avaneb, tuleb see tulemus
eraldi vastu võtta; ühe ekraanipildi põhjal ei väideta sõnumivahetuse edu.

Hosted lõppkoristus ja ruumireservide vabastamine on endiselt lõpetamata.
Üks õnnestunud pildiga kuulutus ega diagnostikaparandus ei tõenda kogu portaali
avalikuks käivitamiseks valmisolekut.
