# 26.10.2026 jätk — olemasolev production-portaal valitud

Kasutaja valis päris proovikuulutused olemasolevas Selqiro portaalis ja baasis.
Aktiivne juhis: [HOSTED_PORTAL.md](../continuity/HOSTED_PORTAL.md).
Production-haru nõuab `SELQIRO_V2_HOSTED_PORTAL=v1` ning avalikku paarislippu,
puuduvaid preview/local lippe, `VERCEL_ENV=production`, täpset portaali origin’it,
projekti ja regiooni. Preview jääb eraldi ning vana preview-lipp Production’i ei ava.
Sama release/instance/Auth/actor kontroll säilib. Muutmata SQL-release on974dd6ac…
ning valitud instance2d088814-0900-448a-a9d1-7b05470cb1d2.

Avalik meedia kontrollib paigalduslepingut, kuid pausi `enabled=false` ei muuda
iseenesest avaldatud pilti nähtamatuks. Media-handler nõuab endiselt aktiivset
public binding’ut, sama baitide arvu/räsi ja uut binding-lugemist enne vastust.
See ei ole bucket’i ega kirjutamisvalmiduse kinnitamine. Omaniku meedia ning
kõik kirjutamisteed säilitavad actor-gate’i. Portaali päise lisamise/omanikuvaate
lingid kasutavad uut V2 teed; avalehe/detaili senised lugemismudelid säilivad.

8 piiratud Node-juhtu ja production Turbopack+TypeScript build17,905s PASS.
Varasemat SQL/native/backend testi ei korratud. Maci source-transfer ja
DB/Storage/activation runnerid on valmis, kuid siin päris teenuses käivitamata.
Senise koodivälise ligipääsukoodi olemasolu on kasutaja kirjeldus, mitte tõend
Supabase’i autoriseerimisest. Kõik järgnevad vanad sihivaliku lõigud on ajalugu.

---

# Tavakuulutuse hosted-veebieelvaate ühendus

Seis: 26.10.2026. **Lähtekood ja lisav SQL-release on valmis; päris Supabase’i
ja Vercelisse pole neid selles sammus rakendatud.** Käivitamise praktiline juhis
on [HOSTED_PREVIEW.md](../continuity/HOSTED_PREVIEW.md). Jooksev seis on
[CURRENT_STATE.json](../continuity/CURRENT_STATE.json).

## Tõendatud lähtekoht

Taivo kinnitas 19:12–19:13 kohaliku tavakuulutuse: bmw, 5257 €, kolm pilti,
omaniku detail ja avanev galerii. Seda vastu võetud kohalikku voogu ei korratud.
20:27 Verceli pilt näitas senist e95fa9c / main / Ready / Production versiooni.

Tegelik Maci read-only lugemine lõppes 20:54:31 Europe/Tallinn. Selle faili
`existing-web-context-20261026T185425Z-d8603a594704.zip` SHA-256 on
`354afb4e75c0af5239b2af2748cadc6b956c7197b05506bf0e70115ecef50af6`.
Täpsed CLI pin, päring, token ja arhiivi CRC on kontrollitud. Tulemuses:

- `~/selqiro`: puhas main, HEAD `e95fa9ce1d41b9b4c6e4884b6076f414173a946d`.
- `~/selqiro-v2-integratsioon-20261018`: sama HEAD, haru
  `work/v2-integratsioon-20261018`, 47 unstaged ja 38 untracked kirjet,
  staged ja konflikte null. Need loendid ei ole täielik praeguse allikapuu kaart.
- Supabase Selqiro `vyjletlmwoiwxsnsunlm`, `eu-central-1`, ACTIVE_HEALTHY,
  PostgreSQL 17.6. Kõik 23 senist migratsiooniversiooni vastasid lähtele.
- Uus `listing_publication_private` skeem, hinnaväljad ning uued avaldamise ja
  lugemise funktsioonid puudusid. Authi, profiili, identiteedi ja tingimuste
  senised lepingud olid olemas. Konkreetseid konto- ja tingimuseridu ei loetud.

See lugemine on lõpetatud. Uue sihi valimine ei anna põhjust vanu paigaldajaid
või sama metadata kogumise ringi uuesti käivitada.

## Ühendatud rakenduse käitumine

Preview-harus nõuab serveri `hostedPreviewConfig.ts` Verceli Preview keskkonda ja eraldi
serveri ning browseri opt-in lippe. Samasse Supabase’i projekti peavad kuuluma
API URL, legacy anon/service JWT-võtmed, regioon ja S3 võtmed. Rakenduse origin
tuleb `VERCEL_URL` väärtusest. Eraldi `SELQIRO_V2_APP_ORIGIN` on valikuline ja
peab määramise korral täpselt vastama. Kohalikud integratsioonilipud peavad
hosted-keskkonnas puuduma. Konfiguratsioon on muutmatu ja protsessis tuvastatava
päritoluga; selle koopia ei ava teist serverirada.

`SELQIRO_V2_HOSTED_INSTANCE_ID` seob sama rakenduse ühe konkreetse SQL-paigaldusega.
See UUID säilib järgmistes Verceli deployment’ides. `hostedPreviewReadiness.ts`
loeb teenuserolli kaudu kümne väljaga vastuse, milles peavad sobima projekt,
release, paigalduse UUID, Storage leping ja held-koristuse režiim. Iga hosted
tegevus küsib enne Supabase Authist tegeliku kasutaja ning kontrollib seejärel
sama kasutaja lubamist SQL-is. JWT sisu dekodeerimine pole autentimine.

Uus `/v2` server-layout kasutab `connection()` piiri: build ei küsi päris baasi
valmisolekut. Päris veebipäringu järel saab `HostedPreviewGate` ainult avaliku
capability väärtuse ja paigaldab selle enne laste mountimist. Puuduv või suletud
release jätab kasutusse senised lugemisvaated. Avalik env-lipp ei ava puuduvaid
RPC-sid. Server ei talleta päringute vahel jagatud muutuvat readiness-otsust.

Ühendatud on tavakuulutuse ettevalmistus, pildid, avaldamine, taastamine,
omaniku muutmine, kontakt/sõnumid ning avaliku ja omaniku meedia route’id.
Authi tagasisuund säilib `/auth?next=/v2/sell` kaudu. Tegelik Auth-leht kasutab
e-posti ja parooli; olematut OAuthi callback-route’i ei lisata juhisesse.

## Piltide managed Storage rada

`createHostedMultipartS3Transport` eraldab kasutaja SOURCE-grandi serveri
S3-toimingutest. SOURCE allkirjastus kasutab projekti viidet, legacy anon JWT-d
ja kasutaja JWT-d. Privilegeeritud S3 access/secret paar jääb serverisse.
AWS SDK saab võtmetest oma muudetava koopia, et selle sisemine metaandmete
lisamine ei rikuks valideeritud võtmeobjektide muutmatust.

SOURCE ja WEB kasutavad sama senist serverisse talletatud multipart-sessiooni
ning Complete/readback’i lepingut. Täielik lugemine kontrollib pikkust ja räsi;
SOURCE läbib muutmata native sanitiseerija ning alles kontrollitud WEB saab
ready-kviitungi. Hosted objekti lugemine läheb sama projekti direct Storage
hosti kaudu. Auth ja RPC jäävad API-origini alla. Browseri upload-klient saab
lubatud Storage-origini kontrollitud konfiguratsioonist.

SOURCE-poliitika kontrollib täpset operatsiooni, meetodit, objekti teed,
üht `partNumber=1` argumenti ning salvestatud opaque upload-ID kanoonilist
RFC3986 kuju. Topeltargumendid ja kodeeritud parameetrinimed keelatakse.
Alles jäävad kasutaja, identiteedi, tingimuste, katse, tähtaja, pikkuse ja lukkude
kontrollid. Teistsugune tegeliku gateway URL-kuju jätab päringu suletuks;
seda ei normaliseerita oletuse põhjal sobivaks.

Private bucket luuakse toetatud Storage API kaudu: `listing-publication-private`,
`public=false`, `file_size_limit=26214400`, MIME-tüübid täpselt
`application/octet-stream` ja `image/webp`. SOURCE ülempiir on 25 MiB, WEB-il
4 MiB. SQL kontrollib päris bucket’i seadeid nii readiness’i kui actor gate’i
juures. Bucket’i ega Storage objektide ridu SQL-release ei loo ega kustuta.

## Lisav SQL-release ja õigused

Koondatud paigaldusfail on
[release.sql](../../supabase/releases/listing-publication-hosted-preview-v1/release.sql).
Selle SHA-256 on
`974dd6acb246b275acb593688aa14449cd42e80939101086d742ee5c4c5a4c3e`.
Täpsed komponendid, paigaldustehing ning eraldi activation/pause mallid on
[release’i README-s](../../supabase/releases/listing-publication-hosted-preview-v1/README.md).

Puhas Python-koostur valib 57 olemasolevat deklaratsiooniallikat ning fikseerib
sisendite ja kohanduste räsid. Ta ei käivita ajaloolisi teste, fixture’eid,
andmebaasi ega võrku. 23 juba kasutatud migratsiooni jäävad bait-baidilt samaks.
Uued nullable hinnaväljad säilitavad olemasolevate toorhindade tähenduse.
Uued katsed, pildilepingud, avaldamine, omaniku muutmine ja lugemismudelid
lisanduvad ühe läbivaadatud tehinguna. Paigaldus lõpeb suletult: `enabled=false`,
`release_ready=true`, lubamisloend tühi.

Tegelik hosted ACL määras kolm konkreetset teostusotsust:

- Postgres ei saa Auth-skeemi kasutusõigust edasi anda. Seetõttu kasutavad
  uued piiratud kirjutajad postgres-owned self-UID wrapperit. See ei võta
  sisendit ega anna õigust teist kasutajat valida; Auth-õigusi ei laiendata.
- Hallatud multipart-tabelite lugemisõigust ei anta kirjutajatele otse juurde.
  Kolm postgres-owned privaatset vaadet piiravad nähtavad veerud ja read selle
  bucket’i ning rakenduse ledger’is olevate objektiteedega.
- PostgreSQL 17 automaatne rollilooja ADMIN-grant säilib oma päritoluga.
  Vajalikud SET/INHERIT õigused antakse toetatud eraldi grant’iga. Uued
  kirjutajad on NOLOGIN, NOINHERIT ja NOBYPASSRLS. Olemasoleva kuulutuse
  otsinguavaldises kasutatava funktsiooni EXECUTE antakse ainult kahele uuele
  rollile, kes päriselt kuulutuseridu kirjutavad.

84 uue public-funktsiooni nime API-õigused suletakse ja vajalikud signatuurid
avatakse eraldi. Privaatseid tabeleid API-rollidele ei avata. SQL-i actor gate
kaitseb ka otseseid autentitud RPC-kutseid; hallatud kuulutuse vana otsene
kirjutusrada ei saa eelvaate lubamisloendist mööda minna. Senised mittehallatud
kuulutused ning teiste bucket’ite käitumine säilivad.

Storage skeemi funktsioone, triggereid ega tabelite omandit ei muudeta.
Kaks bucket’iga piiratud RLS-poliitikat vajavad tegeliku Supabase’i toetatud
policy-haldusõigust. Selle puudumist ei parandata hallatud skeemi ülevõtmisega.

## Piiratud kontrolli tulemus

14 uut või muudetud sihitud Node-juhtumit läbisid: konfiguratsioon, Auth ja
readiness, tegevusroute’i gate, browseri käivitus ning kolm managed multipart
juhtumit. Viimane kasutab päris AWS SDK offline allkirjastamist. Esmakäigus
leiti SDK võtmeobjekti mutatsiooni viga ja üks Headers-mocki viga; korrati
ainult parandatud kolme multipart-juhtumit. Vanu laiu suite’eid ei käivitatud.

Next 16.2.1 vaikimisi Turbopack ja TypeScript build läbisid 13,977 sekundiga.
Seadistus oli täielikult sünteetiline hosted-preview seadistus. Esimene build
läbis kompileerimise ja TypeScripti, kuid senise AI-route’i jaoks puudus
sünteetiline OPENAI_API_KEY; selle väärtuse lisamise järel läbis sama tootekood.
Päris teenusevõtmeid, native-pildikatset ega backend’i build ei vajanud.

SQL kompileeriti värskes eraldatud PostgreSQL 17.6 baasis. Sinna laaditi 23
senist migratsioonide deklaratsiooni; Auth/Storage helperid ja metatabelid
olid sünteetilised. Kaks kasutamata provider-extensionit jäeti sellest
kontrollbaasist välja. Rakenduse release jooksis postgres NOSUPERUSER rollis.
Ainult kaks Storage policy DDL-i kontrolliti eraldi fixture-owner all, sest
vanilla PostgreSQL-is puudub Supabase’i supautils. Pärast põhikoostist lisatud
kaks minimaalset granti rakendati eraldi ja lähtefaili täpne diff kontrolliti.

Kaheksa SQL-kontrolli läbisid. Need hõlmasid tegelikku piltideta
prepare → confirmation → publish → sama kviitungi kordust,
omaniku hinna 123.4 → 150 muutmist revision 2 juurde ning anonüümset detaili.
Lisaks kontrolliti vaikimisi suletust, täpset readiness-vastust, Auth-wrapperi
ja vaadete õigusi, otsese prepare’i gate’i, lubamisloendit ning bucket’i seadeid.
Kõik näidisread tühistati tehingu lõpus. Värske kontrollcluster on peatatud;
olemasolevat kohalikku keskkonda ei puudutatud.

See tõendab konkreetset SQL- ja rakenduseühendust. **Päris managed Storage’i
HTTP-voog, selle policy-haldusõigus ja gateway-kuju, Verceli käitus ning pildiga
hosted avaldamine vajavad esimest tegelikku veebikäiku.** Tõendid ja varasemad
katkestused säilivad üleandmispaki `evidence/hosted-release/` kataloogis.

## Lõppkoristus ja järgmine tegevus

Avaldamise jaoks on vaja kontrollitud SOURCE/WEB valmimist. Kohalik
process-exit/private-volume oracle ei ole avaldamise happy-path’i eeldus.
See on eraldi terminalse failikustutuse ja reservi vabastamise tõend.

Hosted `settle` kontrollib Authi ja loeb kasutaja tegelikku summary’t. Ta tagastab
alati `pending` ja `filesRemaining:null`, ka nullsummade korral. Ta ei käivita
Abort/Delete’i ega väida, et objekt on lõplikult kadunud. SQL auxiliary-receipt’i
trigger keeldub hosted terminaltõendi loomisest. Reserve hoitakse kinni.
29 MiB sloti kohta ja 300 MiB konto kohta piiravad ledger’it; need ei ole
provider’i kogu ajutise kettamahu füüsiline garantii.

Üldise avaliku väljalaske jaoks jäävad kehtima püsiva, piiratud ja kordusturvalise
koristuse ning säilitustähtaja nõuded. Allikas on
`v2-publication-requirements-approved-20261012.md`, jaotised 3 ja 5.

Järgmine praktiline samm on konkreetne Supabase’i siht. Eraldi testbaas hoiab
proovikuulutused päris avalikust voost lahus. Production-baasi jagav Verceli
Preview võib avaldatud read sinna nähtavale tuua; senine production-meedia
pole uueks ühendatud. Seetõttu vajab see alternatiiv tahtlikku päris avaldamise
valikut ja vastavat lugemise ühendamist. Koodi ettevalmistus ei ole sihivalik.

Pärast sihivalikut jätkame senise Mac → GitHub → Vercel tööviisiga ning teeme
ühe pildiga veebikuulutuse. Testide laiendamine, uued pluginad ja vestluse
vahetamine pole selle sammu eeltingimused.

## Allikad

- [Supabase S3 autentimine](https://supabase.com/docs/guides/storage/s3/authentication):
  legacy anon JWT + kasutaja session ning eraldi serveri S3 võtmed.
- [Storage skeemi piirid](https://supabase.com/docs/guides/storage/schema/design):
  objektide/bucket’ite muutmine API kaudu ja RLS-poliitikate kasutamine.
- [Supautils](https://github.com/supabase/supautils): policy-haldus ilma
  hallatud tabeli omandi ülevõtmiseta; tegeliku projekti konfiguratsiooni ei oletata.
- [PostgreSQL 17 rolliatribuudid](https://www.postgresql.org/docs/17/role-attributes.html):
  rolli loomise automaatne ADMIN-grant ja eraldi SET/INHERIT-grant.
- Projekti tõendid: kasutaja saadetud metadata tulemus, retained SQL lähtefailid,
  source-provenance.json ning käesoleva jätkupaki kontrollilogid. Ülesvoolu Storage’i
  lähtevaatlus commit’il `3a88e1f74b7082d83a456449806a222e3e6c3bfa` selgitab
  request.path kuju; see pole Selqiro managed deployment’i versioonitõend.
