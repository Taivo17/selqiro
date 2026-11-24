# Vestluste ja pildimanuste konto-oleku piir

24.11.2026. Ette valmistatud vastu võetud commit'i `8b7db90d08682b512d76e64c699af56fc8cae6a3` peale. Paigaldamine toimub tervikpaketi `uuenda.py --publish` kaudu; praegune kasutusjuhend on `docs/continuity/HOSTED_PORTAL.md`.

## Muudatus

Moodul lisab neli piiratud kontrollfunktsiooni, kaks vestluse/osalise triggerit ja kaks Storage kitsendavat poliitikat ning muudab kolme foto RPC keha. Säilivate objektide, õiguste ja varasema konto paari kontrolli täpne määratlus on enne ja pärast seotud kontrollsummadega. Muudatus ei lisa konto sulgemise kasutajatoimingut ega muuda konto `active`-põhist olekumudelit.

| Kirjutus | Nõutav kontroll |
| --- | --- |
| Vanema vestluse või osalise lisamine ja suhtluskonteksti muutmine | Tegelik konto/profiili paar, lubatud tegutseja ja mõlema konto kättesaadavus; osapoolte sidumist ei muudeta. |
| Olemasoleva vestluse lubatud ajaloo haldamine | Enda lugemismärge, peitmine ja pealkiri ning täpselt piiratud ajaloo koristus säilivad ka kättesaamatu teise osapoole puhul; vestluse/osalise seost ei muudeta. |
| `reserve_my_message_photo_v2` | Uus reserveering kontrollib kontosid; täpne varasema reserveeringu kviitung säilib. |
| `claim_message_photo_upload_v2` | Nii uus üleslaadimine kui ka `uploading` kordus kontrollib kontosid, sest see vastus lubab uut failikirjutust. |
| `finish_message_photo_upload_v2` | Uus `uploading → ready` üleminek kontrollib kontosid uuesti pärast välist kirjutust. |
| Vanema `messages` bucketi INSERT/UPDATE | Autenditud konto ja aktiivse profiili seos tegeliku kahe osapoolega vestlusega; UPDATE kontrollib vana ja uut rida. |

Olemasolevad `SECURITY INVOKER` õiguskontrollid säilivad. Ajaloo lugemine, enda lugemismärge, peitmine ja pealkiri, lõpetatud `ready`/`attached` toimingu kviitung ning olemasolev koristustee jäävad oma senisesse lepingusse. Privaatseid kontrolle ei anta kontoandmeid päriva avaliku RPC-na kasutajatele.

Foto kirjutamise lukujärjekord on tegelik vestlus, konto kontroll ja seejärel foto; pärast ootamist loetakse foto seos/olek uuesti. Valitud samaaegsete juhtude kontroll ei ole väide kõigi võimalike andmebaasitehingute ummikuvabaduse kohta.

## Paigaldamise leping

`preflight.sql` kontrollib vajalikke metaandmeid ainult lugemisega. `apply.sql` kontrollib täpset eelseisu ja Storage õigusi, teeb DDL-i ühes tehingus ning kontrollib järelseisu. Pärast COMMIT-i tagastatav kinnitus on eraldi; `verify.sql` loeb järelseisu uuesti. Väljund on piiratud metaandmetega ja ei ekspordi kasutajakontode, vestluste ega piltide andmeridu. Tundmatu eelseis või kinnitamata rakendamistulemus peatab avaldamise.

Rakendaja peab olema `postgres`, vajalike Auth/kontooleku lugemis- ja lukustusõigustega. Storage poliitika muutmise õigus peab tulema tegelikust omandiõigusest/päritud rolliõigusest või täpselt registreeritud Supautils'i delegeeringust. Paigaldaja ei anna neid õigusi juurde. Suvaline samanimeline sessiooniseadistus ei tõenda Supautils'i õigust.

Varem vaadeldud suhtlusobjektid on seotud vastu võetud kataloogitõendiga. Fotoobjektide eeldused on tuletatud vastu võetud lähtekoodist ja kontrollitakse tootmises värskelt. `source-pins.json` kirjeldab lähteid, `target-deltas.json` piiratud kehade muudatusi, `expected-contract.json` täielikke eeldusi ja `sql-files.json` käivitatavate failide kontrollsummasid.

## Ettevalmistuse tõendid

- **32/32 käitumis- ja samaaegsuskontrolli** eraldatud PostgreSQL 17.6 keskkonnas. Tegelikud wrapperid ja funktsioonid; 28 olemasolevat sünteetilist rida säilisid. Seitsmes juhtumis jälgiti päris tehinguluku ooteaega.
- **3/3 täiendavat paigaldusõiguste kontrolli** samade SQL-failidega: `postgres NOSUPERUSER BYPASSRLS`, olemasolevad Storage omaniku ja kirjutajarolli õigused, 17 sünteetilise rea säilimine, COMMIT-järgne kinnitus ja sõltumatu järelkontroll. Katse taastab lähtekoodis olemas oleva rolliliikmesuse samade ADMIN/INHERIT/SET valikutega; sünteetiline andja on eraldi avaldatud.
- **25/25 paigaldaja juhtloogika kontrolli** lõpliku parseri ja SQL-failidega. Kasutati ajutist päris Giti ning sünteetilisi CLI/buildi vastuseid; kasutaja Maci paigaldust sellega ei väideta.
- SQL-i sõltumatu ülevaatus ning katsefixture'i ja native-tõendite eraldi root-ülevaatus on paketis. Kõik katsesisendid on seotud enne ja pärast katset; klastrid lõpetati.

Tervikpaketi `proof/sql/native-report.json`, `authority-report.json`, `sql-review.json` ja `proof/reviews/root/native-review.json` annavad täpsed tulemused. Konto kättesaamatust katsetati Auth keelu kaudu; konto sulgemise olekut ei aktiveeritud. Varasemad ettevalmistuse ebaõnnestunud katsed on eristatud lõplikust tõendist.

Katse kasutab vähendatud väliste teenuste abistajaid ja sünteetilisi Storage tabeleid. Tegelik Storage HTTP üleslaadimine/kustutamine ning hostitud Supautils'i hook ei olnud kohaliku katse osad. Vanema bucketi olemasolev avalikkus säilib; avaliku URL-i kohest kadumist ei lubata. Väline failikirjutus ja SQL-tehing ei ole ühine tehing ning hilinenud kirjutus võib vajada olemasolevat koristusteed.

Järgmised tõendid on kasutaja Maci paigaldusraport, sama commit'i Verceli Ready / Production ja olemasoleva vestluse teksti/pildi kontroll teise oma testkontoga.
