# Teenuste avaliku lugemise konto kontroll — v1

24.11.2026 Europe/Tallinn. Ettevalmistatud lähtekood; kasutaja Maci rakendus,
andmebaasi muutus, uus commit/push ja deployment on eraldi järgmised tõendid.
Alus on vastu võetud `0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a`,
puu `6d213969675d86eea8e2ff56b99f9a232715b3a8`, 2202 faili.

## Eesmärk ja muudatuse piir

Teenuse avalik lugemine peab arvestama selle pakkuja konto kättesaadavust.
Sama kontooleku allikas on `account_lifecycle_private.account_is_available(uuid)`.
See kontrollib olemasolevat aktiivset kontoolekut ja Auth-kirje kättesaadavust;
käesolev moodul ei lisa konto oleku muutmise toimingut.

| Muudetav funktsioon | Vastutus |
| --- | --- |
| `service_publication_private.visible_to_viewer(uuid)` | Teenuse kanoonilise omaniku konto kättesaadavus koos senise vaataja/blokeerimise kontrolliga. |
| `get_public_profile_services_v1(text,integer)` | Varane konto kontroll lahendatud profiili omanikule enne teenuseid ja v1 ümbrise moodustamist. |
| `get_public_profile_services_v2(text,uuid,integer,integer)` | Sama varane kontroll, säilitades rubriigipuu, täpsed koguarvud ja leheküljed. |

Eraisiku kanooniline omanik on `identities.user_id`; ettevõttel
`business_accounts.owner_user_id`. Profiili koostaja, teenuse autor või brauseris
aktiivne identiteet ei ole omaniku asendaja. Puuduv omanik või konto ei anna luba.

Ühine viewer-helper mõjutab olemasolevaid detaili- ja otsingulugejaid ning
teenuserubriike nende muutmata kehade kaudu. Anonüümne jagamise eelvaade kasutab
sama avaliku üksikteenuse RPC-d. Profiiliteenuste eraldi varane kontroll on
vajalik, et sobimatu konto korral oleks ka profiili ümbris kättesaamatu.

## Säilivad vastused ja õigused

Puuduv või mitmetähenduslik profiilislug lahendatakse enne konto kontrolli.
Sobimatu profiilikonto korral jääb `identity_value=NULL`: v1/v2 tagastavad
`profile_available=false`, null-identiteedi ja tühjad tulemused. Detail säilitab
null-vastuse. Otsing välistab sobimatud teenused enne koguarvu ja lehekülge.
Päringu- ning sisendivead jäävad vigadeks, mitte oletatud tühjaks tulemuseks.

Kliendi ranged parserid, API-d, raha kümnendväärtused, avalike väljade valik,
filtrid ja järjestus säilivad. Uut kliendipoolset kontopäringut ega kontooleku
vahemälu ei lisata. Muutunud SQL-kehadel säilivad signatuurid, täitmisrollid,
ACL, STABLE omadus ning otsingutee. Avalike tabelite otseõigusi ei laiendata.

`is_public(uuid)` säilitab teenuse aktiivsuse, kehtivuse ning avaldamise ja
piltide lõplikkuse lepingu. See on ka kontakti ja meedia sõltuvus, mistõttu
selle käitumist lugemismoodul ei muuda. Olemasolevad kliendi katkestus- ja
päringupõlvkonna reeglid säilivad. Teenuse üksikvaate laadimine on endiselt
seotud teenuse ID/retry-ga, mitte samas lehes vaataja vahetumise võtmega;
juba avatud vaate automaatset tühjenemist siin ei kinnitata.

## Üks kaitstud SQL rakendamine

Täpsed allikad ning enne/pärast leping asuvad
`supabase/releases/account-service-read-fence-v1/` all. Eelseis peab vastama
uue mooduli kolmele sihile ja muutumatule sõltuvuste lepingule. Uueks sihiks
muutuv viewer-helper eraldatakse varasemast muutumatust BASE-kogumist;
varasemate konto-, profiili-, tava-, hobuse- ja profiili kuulutuste lugejate
vastu võetud järelseis säilib kontrolli all.

Maci uuendaja kontrollib eelseisu, asendab ühes tehingus kolm keha, kontrollib
järeltingimusi, saab COMMIT-järgse kinnituse ja teeb eraldi verify. Tundmatut või
ebaselget kirjutust automaatselt ei korrata. Kontroll puudutab kataloogi;
päris kasutajate kontosid ja sisu ei loeta ega ekspordita. Lähtekoodist ja
isoleeritud PostgreSQL-ist saadud uued kataloogiootused vajavad Macis värsket
vastavust. Varasem raport ei muutu tänaseks andmebaasivaatluseks.

## Tegelikud ettevalmistuse kontrollid

15/15 uut sihitud kliendikontrolli läbisid muutmata TypeScripti parserite/API-dega; 41 allikapinni säilisid. Lisaks läbis 8 juhitud hook’i juhtumit (19 pinni) ning 20 eraldatud PostgreSQL-i aktiivse või piiratud omaniku vastuse päris parsimist (12 parseripinni). Kolm puuduva slugi/null-kutsuja identiteedi juhtu lükati sisendiveana õigesti tagasi; neid ei loeta edukaks vastuseparsimiseks. Hook’i katse pole React DOM ega brauser. Rakenduskood ja sõltuvused säilisid.

51/51 uut native PostgreSQL 17.6 kontrolli läbisid: eraisiku/ettevõtte kanooniline omanik, puuduv/keelatud konto või Auth-kirje, detail, otsing, profiili v1/v2, teenuserubriigid, kahepoolne blokeerimine, lõplikkus, aegumine, õigused ja leheküljed. Üks tegelik kaitstud apply koos COMMIT-järgse kviitungi ning eraldi verify-ga läbis; tundmatu eelseis ja katkine tehing peatusid. Sünteetiliste ridade sõrmejäljed säilisid ning katseklaster peatati. Kataloogiootused on allikast ja eraldatud PostgreSQL-ist; Maci live-eelseis vajab värsket vastavust.

Vana/uue lugemise 28 võrdlusjuhtumis ja 168 ajastatud kutses säilis sama tehingu aktiivne JSON-vastus. Katse kasvas 24 teenuselt 500 sobiva teenuseni ning lisas 5000 kõrvalist kontot/teenust. Filtreeritud otsing tegi ka pärast kõrvalist kasvu 500 uut konto kontrolli; 200 teenusega profiil 201 ja üksikvaade 1. Konto ja Auth-kirje kontroll kasutab PK-indekseid. 5500 kandidaadiga filtrita otsingu mediaan 566.67 → 1105.46 ms (5500 uut konto kontrolli): see on mõõdetav lisakulu. Mõlema versiooni senine filtreeritud otsing skaneeris 5500 teenust ja eemaldas 5000; konto kontroll ei tekitanud uut globaalset kontode skanni. 77 valitud plaani on eraldi tõend, mitte ajaproov. Ühe kliendi sünteetiline katse ei kinnita productioni RPC aegumispiiri, samaaegset koormust ega suurt mahtu. Päringu kandidaatide/omanike koondamise optimeerimine jääb eraldi tööks enne suure kasutusmahu kinnitamist.

Üks uus täielik Next.js 16.4.6 / TypeScript 5.9.3 build läbis 33.23 sekundiga. Kõik 765 sisendit säilisid, samuti package.json, lukufail ja rakenduskood. Kasutati olemasolevaid täpseid sõltuvusi ja inertseid kohalikke koostamisseadeid; valmis teenuste otsingu, üksikvaate ja avaliku profiili väljundid. Maci build ja deployment on eraldi järgmised tõendid.

20/20 uut Maci uuendaja juhtumit läbisid 21.094 sekundiga; 43 sisendit säilisid. Ajutine päris Git-hoidla, kohalik bare-remote ja piiratud oma alamprotsessid kontrollisid järjestust ning peatumist. Selle katse runtime-proov, CLI, SQL ja build olid sünteetilised. Seitse senist protsessi/Giti/sõltuvuse helperit jäid baiditäpseks. See pole Maci ega pilveteenuse käivitus; vanu laiu suite’e ei korratud.

Uue versiooni päris brauserikontroll on ootel sama uue commit’i Ready / Production järel. Siin ei käivitatud uut brauserikatset ega kasutatud päris kontosid. Varasem kohaliku brauseri socket-piir on ajalooline tõend, mitte tänane katse. Kliendi/hook’i/SQL kontrollid ei tõenda hydration’it ega päris teenuse kasutusteed.

## Kontoelutsükli ja mahu piir

Teenuste omaniku haldus, avaldamise lõplik kirjutus, staatuse/kehtivuse muutmine,
uus kontakt ja korduse kviitungid, säilivad vestlused, meedia ning Storage'i
vanad URL-id vajavad kontoelutsükli tervikus eraldi katmist. Privilegeeritud
rollide otsetabelite ligipääs jääb eraldi piiriks. Konto sulgemist, taastamist
ja kustutamist selles paketis ei aktiveerita ning olemasolevaid andmeid ei kustutata.

Konto kontrolli lisamine ei lahenda automaatselt otsingu olemasolevat
kandidaaditööd, täpsete koguarvude hinda ega profiililehtede järjestuse indekseid.
Ühise helperi kutsete arv sõltub hinnatud teenustest; see ei ole üks kontroll
terve otsingu kohta. Tegelikud mõõtmised ja nende piirid on ülal kontrollitõendis.
Miljonite samaaegsete otsingute valmidust selle kitsendusega ei väideta.

Pärast sama uue commit'i Ready / Production tulemust kontrollib kasutaja
olemasoleva teenuse otsingut, üksikvaadet ja profiili teenuste/rubriikide rada.
Täpsed käivitamis- ja raportijuhised on `docs/continuity/HOSTED_PORTAL.md`-s.
