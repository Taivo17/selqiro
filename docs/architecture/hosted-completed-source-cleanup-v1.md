# Avaldatud kuulutuse algfoto koristus Supabase'is

Otsus: 04.11.2026. Jooksev paigaldus- ja vastuvõtuseis on
[`CURRENT_STATE.json`](../continuity/CURRENT_STATE.json).
See dokument määratleb ühe lõpetatud SOURCE-objekti lepingu, mitte kogu
fotode elutsükli valmimist.

## Eesmärk ja lihtsustamine

Kui avaldatud kuulutuse veebipilt on valmis, võib selle valmistamiseks kasutatud
algfoto eemaldada ning vabastada algfoto loogilise ruumireservi. Avaldatud
veebipilt, galerii, põhipilt ja omaniku sisestus säilivad.

Kohaliku Storage-protsessi lõpetamist ja privaatse ketta tühjust tõendavat
lepingut ei kanta üle hallatud pilveteenusele. Supabase'i peidetud ajutisi
backend-faile klient lugeda ei saa; nende koristuse eest vastutab teenus.
Selqiro kontrollib enda käsutuses olevat täpset API-, sessiooni- ja
andmebaasilepingut. See on teadlik vastutuspiiri täpsustus, mitte vana kohaliku
kettatõendi väitmine pilves.

Uut töölaua vaadet, andmetabelit, järjekorda, üldist töövoomootorit ega
taustateenust ei lisata. Korduskatsed ja tulemused jäävad senisesse
`listing_publication_private.cleanup` päevikusse. Ühe objekti eemaldamise
transport on endiselt `cleanupOne.ts`; uus adapter annab sellele ainult
kitsama claim/record lepingu.

## Mida võib koristada

Üks käsk võib võtta ühe SOURCE-objekti ainult siis, kui kõik järgmised
tingimused on tõendatud.

1. Serveri Auth kontroll kinnitab kasutaja tokeni. Andmebaas kontrollib sama
   konto, aktiivse identiteedi, avaldamiskatse ja request-võtme praegust õigust.
   Ärikonto puhul peab liikmelisus endiselt kehtima.
2. Kuulutus ja katse on avaldatud. Olemasolev hallatud galerii kontroll kinnitab
   sama kuulutuse avaliku sidumise, kõik pildikohad ja põhipildi.
3. SOURCE-i sama multipart-sessioon on lõpetatud ja kontrollitud; objekti ID,
   versioon, baitide arv ja SHA-256 vastavad selle pildikoha ootusele. Sellele
   sessioonile või rajale ei ole avatud upload'i ega multipart-osade kirjeid.
4. Sama koha WEB on valmis ja kontrollitud, õige objekti ID/versiooniga
   Storage'is olemas ning koristusse määramata.
5. SOURCE-i püsiv koristuspõhjus on `published_source`. Olemasolev päevik
   annab sellele ühele objektile ühe töövõtme ja 60 sekundi lease'i.

Kasutatakse olemasolevaid muutumatuid radu. Uus adapter lubab ainult sama
katse `source.upload` rada; `web-v1.webp` ei pääse sellesse eemaldamisse.
Avaldamata, pooleliolev, tundmatu tulemusega või tühistatud üleslaadimine
ei vasta sellele kitsale lepingule.

## Eemaldamine ja tõend

Eemaldamine käib Supabase Storage API kaudu, mitte Storage'i tabeliridade
kustutamisega. Ainult kinnitatud claim lubab ühe API-kutse. Selle järel
kontrollitakse API tulemust ja sama raja puudumist teenusevõtmega lugemisel.
Üksik 404, ajalimiit või tühi claim-vastus ei vabasta reservi.

Tulemuse salvestamine kontrollib sama konto/identiteedi/katse/objekti/töövõtme
sidumist ja lease'i. `deleted` jõustub ainult juhul, kui andmebaasis puuduvad
selle raja objekt, upload ja osad ning lõpetatud kontrollitud sessiooni
püsiv seos on alles. Kontrolli ebaõnnestumine veeretab kogu tulemusekirjutuse
tagasi. API vastuse kadumine jääb lahendamata tulemuseks.

Püsiv lõpetamistõend ei sõltu sellest, kas kuulutus hiljem eemaldatakse.
Algne `published_source` seos säilib ja hilisem eemaldamine ei lae juba
vabastatud SOURCE-reservi uuesti kontole. Arvestus arvutatakse olemasolevatest
objektidest ja tõenditest; eraldi krediiti ega teist mahubilanssi ei lisata.
Claim ja esimene `deleted` kinnitus nõuavad probleemita sessiooni. Hilisem
diagnostika juba kinnitatud kustumise järel reservi tagasi ei lae; muutumatu
kontrollitud sessiooniseos ning objekti/upload'i/osade puudumine on endiselt nõutud.

See tõendab objekti eemaldamist Selqiro kasutatavast teenuselepingust.
See ei tõenda, et Supabase'i igal varjatud kettal on samal hetkel null baiti,
ega luba kohest teenusepakkuja arve vähenemist. Need on teenuse sisemine
elutsükkel ja arvestus. Varem kinnitatud üldised andmekaitsepiirid säilivad.

## Kaks kitsast serveri RPC-d

| RPC | Ülesanne |
| --- | --- |
| `claim_listing_published_source_cleanup_v1` | Kontrollib tegutsejat, avaldatud WEB-i ja lõpetatud SOURCE-i; annab ühe olemasoleva koristuslease'i. |
| `record_listing_published_source_cleanup_v1` | Seob sama töö tulemuse ning kontrollib `deleted` puhul tegelikku andmebaasipuudumist. |

Mõlemad on ainult `service_role`-ile. Brauser ei saa neid otse kutsuda.
Üldised koristuse RPC-d jäävad API-rollidele suletuks. Privaatne abifunktsioon
`hosted_completed_source_deleted_v1` lisab olemasolevale
`multipart_object_fully_deleted` otsusele ainult selle kitsa SOURCE-haru.
Varasemat alternatiivi ega kohaliku arenduse lõpetamistõendit ei asendata.

Valmisoleku olemasolev `cleanup_mode: held` säilib. Seetõttu saab SQL-toe
rakendada enne uut serverikoodi, rikkumata vana deployed rakenduse kontrolli.
Uus teekonna koostaja valib ainult hosted-režiimis kitsama adapteri;
ülejäänud multipart-moodulit ei avata üldiseks koristajaks.

## Mahu ja kasutajaliidese tähendus

| Objekt | Senine reserv | Pärast selle SOURCE-i kinnitatud koristust |
| --- | ---: | ---: |
| SOURCE-algfoto | 25 MiB | 0 MiB |
| Avaldatud WEB-pilt | 4 MiB | 4 MiB |
| Üks pildikoht kokku | 29 MiB | 4 MiB |

Need on loogilised ülempiirid. Konto senine 300 MiB piir ei muutu. Tegelik
faili suurus ja Supabase'i salvestusmahu arve on teised suurused.

Tavapärane koristuse vastus on `pending / filesRemaining: null`, ka ühe eduka
eemaldamise või tühja claim'i korral. Kui tulemuse salvestamine kinnitab
`needs_attention` oleku, edastatakse see sama `filesRemaining: null` väärtusega.
Tühi claim võib tähendada teise töötaja kehtivat lease'i; üks koristatud foto
ei tõenda kogu katse lõppu. Olemasolev omanikuvaade loeb seejärel värske
serverikviitungi. Ainult see näitab järelejäänud SOURCE-failide arvu ja peidab
lõpetatud koristustegevuse. WEB-pildid jäävad nähtavale.

Käsk on seotud omaniku olemasoleva kasutusteega ja uue avaldamise järel
tehtava piiratud koristussammuga. Ühe käsuga koristatakse kuni üks algfoto.
Püsivat ajastatud koristajat ega kõigi vanade objektide masskoristust ei lisata.

## Avaliku kasutajaliidese otsus — 04.11.2026

Kasutaja veebikatse järel kinnitatud nõue: algfailide koristus on süsteemi
taustatöö. Tavakasutaja ei pea seda käivitama ega kontrollima. Avalikus
portaalis ei kuvata koristusloendurit, koristusnuppu ega tehnilisi
lõpetamisteateid. Kuulutuse tegelik avaldamisolek jääb selgelt nähtavaks.

Kasutajale kuvatakse ainult probleem, mis vajab tema tegevust või takistab
teenuse kasutamist, koos arusaadava järgmise sammuga. Tehniline olek ja vead
säilivad olemasolevas sisemises päevikus ning asjakohases haldusdiagnostikas.
Ka kuulutuse eemaldamise kinnitustekst kirjeldab kasutajale nähtavat mõju.

Testimisel võib paneel praegu alles olla. Enne eemaldamist peab sobivate
algfailide automaatne lõpuni viimine töötama nupuvajutuseta ja avatud
omanikuvaatest sõltumata. Aluseks jääb senine ühe objekti leping ja püsiv
tööjärg. Ainult paneeli peitmine seda nõuet ei täida. Siin dokumenteeritakse
otsus, mitte valmis scheduler või praegu peidetud UI. Muud elutsükli piirid säilivad.

## Muudatuse failipiir

- `src/server/listing-publication/final/settleHostedSourceOne.ts`: Auth ja
  kitsad teenuse-RPC-d, sama katse SOURCE-raja piir.
- `src/server/listing-publication/final/cleanupOne.ts`: senine transport,
  millele saab anda eraldi claim/record operatsioonid. Vaikimisi käitumine säilib.
- `src/server/listing-publication/journey/components.ts`: hosted-adapteri valik.
- `supabase/repairs/20261104_hosted_completed_source_cleanup/`: lisav SQL,
  täpsed eeldused, järelkontroll ja sihitud andmebaasikatsed.
- `tests/v2-hosted-completed-source-cleanup.test.cjs`: uue serveripiiri katsed.

Rakenduse sõltuvusi, kasutajaliidese komponente ja varasemaid väljastatud
SQL-release'e ei muudeta. Kontrollide tegelikud tulemused ja piirid on
CURRENT_STATE-is ning uue üleandmise kontrollifailides.

## Edasine töö

Pooleliolevate, aegunud ja tühistatud upload'ide lõpetamine, avaldatud fotode
lisamine/asendamine/eemaldamine, WEB-i koristus pärast kuulutuse eemaldamist
ja ajastatud koristaja vajavad eraldi lepinguid. Seda sammu ei loeta kogu
fotode elutsükli ega avaliku avamise valmimiseks. Hobused jäävad ühisesse
kuulutuste voogu; Energy/maksete senine käivituseelne ulatus säilib.

## Kontrollitud ametlikud allikad

Loetud 04.11.2026. Teenuse dokumentatsioon toetab vastutusjaotust; see ei ole
Selqiro praeguse pilveversiooni ega käesoleva muudatuse tootmiskatse.

- [Partial files from failed or aborted uploads](https://supabase.com/kb/troubleshooting/storage-clean-up-partial-files-from-failed-or-aborted-uploads):
  teenus koristab ajutisi backend-faile; klient neid otse loetleda ei saa.
- [Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects):
  failide eemaldamiseks kasutatakse API-t, mitte otse SQL-i.
- [S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility):
  toetatud Complete/Abort/Delete operatsioonid. Versiooniga tingimuslikku
  DELETE'i ei eeldata kontrollimata deployed versiooni põhjal.
- [S3 uploads](https://supabase.com/docs/guides/storage/uploads/s3-uploads):
  multipart'i elutsükkel; automaatset aegumist ei kasutata selle sammu tõendina.

## Järgnev kitsas täiendus — 04.11.2026

[Avaldatud lisafoto eemaldamise kandidaat](published-listing-photo-removal-v1.md)
säilitab käesoleva SOURCE-töötaja. Galeriikontroll arvestab nüüd aktiivseid
pildiridu ning täpseid eemaldatud WEB-i päevikukirjeid. Foto eemaldamise eel
peab selle SOURCE olema tõendatult koristatud; nii saab allesjäänud SOURCE-ide
senine koristus edasi töötada. WEB-i eemaldamiskirje ei muuda avaldatud
SOURCE-kviitungi failide arvu ega vabasta WEB-i reservi.

