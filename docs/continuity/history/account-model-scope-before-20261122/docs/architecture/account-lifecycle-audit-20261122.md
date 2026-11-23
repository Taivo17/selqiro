# Selqiro — konto sulgemise ja taastamise lähtekoodiaudit

22.11.2026, Europe/Tallinn. Vastu võetud alus: `034211d2ee3dfadd4ba791977c98e310754e4d94`.

## Tulemus ja üks soovitus

Konto elutsükkel tuleb ehitada oma serveri- ja andmebaasimoodulina. Taastatava
sulgemise keskne toiming on konto ligipääsu ja avaliku nähtavuse piiramine.
Lõplik kustutamine on järgnev, eraldi koordineeritud töö. Esimene väike
rakendusmoodul on **konto sulgemise mõju eelvaade**, mis loeb konto seoseid ja
selgitab mõju kasutajale.

Praegune tulemus on lähtekoodiaudit, serverilepingu kavand ja kontrolliplaan.
Portaali runtime, SQL, kontod ja failid jäävad selle töö käigus samasse seisu.
Viimane paigaldatud ja kasutaja vastu võetud versioon on endiselt `034211d`.
E-posti kinnitamise aktiveerimine jääb senise kokkuleppe järgi domeeni
kasutuselevõtu juurde, enne väliste kasutajate kaasamist.

Auditi järeldused on kontrollitud vastuvõetud lähtefailidest. Vanas migratsioonis
leitud andmeseos on lähtekoodi tõend, mitte värske pilveandmebaasi vaatlus.
Viimane tööloendi SQL-raport tõendab selle paranduse piiratud järelseisu; see
ei tõenda kogu konto kustutamise sõltuvusgraafi. Tegelikke kasutajakirjeid,
kirjavahetust, fotosid ega saldosid audit ei lugenud.

## Konto, identiteet ja avalik profiil

| Mõiste | Olemasolev allikas | Tähendus sulgemisel |
| --- | --- | --- |
| Sisselogimiskonto | `auth.users`; konto identifikaator | Sulgemise taotleja ja värske autentimise alus. |
| Konto portaaliandmed | `public.profiles`; sh aktiivse identiteedi viit | Aktiivse profiili valik ei määra kogu konto sulgemise ulatust. |
| Tegutsemise identiteet | `public.identities` | Eraisiku identiteet kuulub kontole; ettevõtte identiteet seostub ettevõttega. |
| Avalik profiil | `public.identity_profiles` ja avalikud lugemisfunktsioonid | Selle kuvamise saab konto elutsüklist sõltuvaks teha eraldi sisukirjete muutmisest. |
| Ettevõtte konto ja liikmesus | `public.business_accounts`, `public.business_members` | Rakenduse omanikuseos, liikmeroll ja aktiivne ligipääs on eri kontrollid. Need ei tõenda iseenesest õiguslikku esindusõigust. |
| Pakkumised | Tavakuulutused, hobused, teenused, tööd ja tooteväljapanekud | Omaniku/identiteedi seos ja iga mooduli senine staatus peavad säilima. |
| Vestlus | Konto ja identiteedi paarid, osalejad ning kanali seos | Konto eemaldamine võib mõjutada ka teise osalise ajaloo lugemist. |
| Energy | Identiteedi rahakott ja muutumatu sündmusraamat | Ettevõtte rahakott ei muutu lahkuva liikme isiklikuks varaks. |

Täpsed failid, sümbolid ja räsid on [lähteviidete registris](../../evidence/source-references.json).
Identiteedi osa täpsemad leiud on [uurimismärkmes](../../research/identity/identity-audit.md).

## Olulisemad leiud

### 1. Konto kustutamine võib läbida ettevõtte andmeseoseid

Ajaloolises baaskeemis viitab `business_accounts.owner_user_id` kasutajale
`ON DELETE CASCADE` reegliga. Ettevõtte kaudu jätkub seos identiteedi ja teiste
andmeteni. Samas leidub teistes moodulites `RESTRICT`, `NO ACTION` ja
muutmiskaitseid. Seega ei ole olemasolevate failide põhjal põhjendatud ühe
Auth-kirje kustutamise käsitlemine valmis, ohutu konto kustutusvoona.

Eelvaade peab eristama kasutaja enda eraisiku identiteete, ettevõtte liikmesusi,
rakenduses omanikuna seotud ettevõtteid ning ebaselgeid seoseid. Teise aktiivse
liikme olemasolu ei anna talle automaatselt omaniku õigusi ega vestlusajalugu.
Ettevõtte viimane omanik vajab selget üleandmise, ettevõtte sulgemise või toe
kaudu lahendamise teed. Seda ei lahendata ettevõtte vaikse kustutamise ega konto
tähtajatu sundavatuna hoidmisega.

Allikad: `supabase/migrations/20260722173530_baseline_20260722.sql`,
identiteedi uurimismärge ja seal viidatud uuemad õiguskontrollid.

### 2. Konto olek ei tohi kirjutada üle iga pakkumise olekut

Tööd, teenused, hobuse- ja tavakuulutused kasutavad eri avaliku nähtavuse
kontrolle. Mõju tuleb lisada nende serveri/andmebaasi ühisesse õiguskontrolli,
sealhulgas otsingusse, üksikvaatesse, profiili ja pildi lugemisse. Üksnes
menüü peitmine ei kata otseseid päringuid.

Soovitatud mudelis jääb suletud töö suletuks, peatatud teenus peatatuks ja
aegunud pakkumine aegunuks ka pärast konto taastamist. Konto sulgemine lisab
eraldi piirangu; taastamine eemaldab ainult selle piirangu. Eraisiku konto
olek ei sulge automaatselt ettevõtet, kus teised volitatud inimesed jätkavad.

Allikad: identiteedi viiteregister; `get_my_jobs_v1` uus lugemisleping;
`M.listing_media_binding`, `M.horse_media_binding`, `M.service_media_binding`.

### 3. Vestlusajalugu sõltub mõlema osapoole seoste säilimisest

`messaging_private_v2.exact_thread` nõuab mõlema konto ja identiteedi täpseid
paare ning kahte vastavat osalejakirjet. Ühe osapoole identiteedi kustutamine
või viite tühjendamine võib muuta allesjäänud osalise ajaloo kättesaamatuks.
Sõnumite, piltide ja saatmiskviitungite vahel on lisaks muutumatus- ja
viitetervikluse piirangud.

Taastatava sulgemise ajal säilivad need seosed. Sulgunud konto uusi
vestlustoiminguid piiratakse eraldi; aktiivse vestluspartneri senise ajaloo
lugemine lähtub jätkuvalt tema osalusest. Ettevõtte uus haldaja ei saa ainult
liikmeks lisamise tõttu lahkunud inimese varasemaid vestlusi.

Lõpliku kustutamise puhul vajavad sõnumitekst, manused, autoriviited ja
ajaloolised pakkumiskaardid eraldi säilitamise/kustutamise reegleid. Nime
asendamine ei eemalda isikuandmeid sõnumi sisust. Auditis ei valitud kõigile
vestlustele üht tähtajatut hoidmisreeglit.

Allikad: `M.messaging_contract`, `M.contact_channels_peers`,
`M.legacy_message_ui`, `M.privacy_contract`.

### 4. Profiilipildi eemaldamine käivitab pöördumatu elutsükli

Haldatud profiilipildi eemaldamine viib valitud vara olekust `active` olekusse
`retired`; koristus jätkab `deleting` ja `deleted` suunas. Tagasiteed `active`
olekusse see olekumasin ei paku. Seepärast ei kasutata pildi eemaldamise
toimingut ajutiselt suletud profiili peitmiseks.

Praegune `identity-media` lahendus kasutab avalikke pildiaadresse. Profiili
peitmine ei tühista juba jagatud pildi URL-i. Sama piiri tuleb arvestada vanade
kuulutuste, teenuste ja väljapanekute pildiradadel. Kasutajale ei lubata
pelga profiili peitmise põhjal kõikide varasemate pildilinkide kohest sulgemist.
Kui see saab avaliku sulgemisvoo nõudeks, tuleb piltide väljastamine eraldi
ümber korraldada ja kontrollida.

Allikad: `M.profile_media_sql`, `M.profile_media_design`,
`M.legacy_listing_images`, `M.legacy_service_images`, `M.legacy_showcase_images`.

### 5. Pooleliolev üleslaadimine ei tohi pärast sulgemist uut sisu avaldada

Piltide üleslaadimisel, väljaannete avaldamisel ja sõnumimanuste lisamisel on
oma kinnitused, broneeringud ning koristusolekud. Sulgemine peab peatama uue
töö alustamise ja kontrollima konto olekut uuesti viimases avaldamise või
manuse sidumise andmebaasitoimingus. Selleks on vaja ühist, lühikeste
tehingutega kooskõlastatud konto versiooni kontrolli.

Juba väljastatud operatsiooni tulemuse tuvastamine või vabastamine võib
samal ajal vajada piiratud teenusõigusega töötajat. Kõigi taustatööde peatamine
võib jätta failid või broneeringud ripakile. Tundmatu tulemusega väliskirjutus,
ajapiir või üksik 404 ei tõenda lõplikku kustutamist.

Allikad: `M.upload_account_cleanup`, `M.upload_capacity`,
`M.message_image_cleanup`, `M.publication_chain`.

### 6. Osa olemasolevaid lugemisradu muudab andmeid

`get_my_energy_wallet_v2` ja `get_my_energy_ledger_v2` kutsuvad abifunktsiooni,
mis võib lisada puuduva rahakoti. Sõnumite ja profiilipiltide edukas lugemine
võib käivitada koristuse. Neid radu ei saa kasutada kõrvaltoimeteta konto
mõju eelvaate koostamiseks.

Uus eelvaade loeb juba olemasolevaid kirjeid ühe kooskõlalise andmebaasivaate
sees. Puuduv rahakott on `not_created`; lugemata või tundmatu osa on
`unavailable`/`unknown`. Tundmatut ei kuvata nulli ega turvalise kustutusloana.

Allikad: `F.energy_schema`, `M.message_handler`, `M.message_image_service`,
`M.profile_media_handler`.

### 7. Energy ja kviitungid vajavad eraldi lõpliku kustutamise lepingut

Energy sündmusraamatu autori FK on lähtekoodis `ON DELETE SET NULL`, kuid
sama tabeli triger keelab iga UPDATE ja DELETE. Nende definitsioonide koos
kehtimisel kohtaks Auth-kirje kustutamisest tulenev FK-uuendus muutmiskaitset.
See on lähtekoodist tuletatud vastuolu, mitte katsetatud tootmisviga.

Ka avaldamiskviitungid, poliitika nõusolekud, admini audit ja JSON-i salvestatud
koopiad võivad sisaldada konto viiteid. Kõik seosed ei ole FK-d. Lõpliku
kustutamise kaardistus peab hõlmama ka neid andmeid ning piiritlema iga liigi
säilitamise eesmärgi ja tähtaja. Piiranguid ega trigereid ei kõrvaldata lihtsalt
selleks, et kustutuskäsk läbi läheks.

Energy olemasolu või selle ostmine ei ole konto sulgemise eeltingimus.
Juba reserveeritud toimingud vajavad kontrollitud lõpetamist/vabastamist;
ettevõtte rahakotti ei nullita ühe liikme konto tõttu. Maksete checkout'i ja
webhook'i teostust vaadatud lähtekoodis ei leitud; see ei tõenda tegelike
andmete, saldo või välise teenuse puudumist.

Allikad: `F.energy_schema`, `F.energy_operations`, `F.policy_acceptances`,
`F.service_events`, `F.horse_events`, `F.job_requests`, `F.legacy_audit`.

## E-post ja turvaline sulgemistaotlus

E-posti kinnitamine tõendab ligipääsu postkastile. Konto sulgemine vajab
toimingu hetkel värsket autentimist ja serveris sama konto kontrolli.
Praegune parooliga sisselogimine võimaldab selle teekonna kavandada e-posti
saatmise aktiveerimisest eraldi. Pelk `email_confirmed_at`, brauseri kinnitus
või äsja värskendatud JWT ei ole selle toimingu värske paroolitõend.

Supabase'i `reauthenticate()` saadab koodi ja dokumenteeritud nonce'i voog
on seotud paroolivahetusega. Sellest ei tuletata automaatselt konto kustutamise
õigust. Taastatava sulgemise ajal jääb Auth-konto alles; tavaline sisselogimine
võib viia piiratud taastamisvaatesse, kuid ei taasta kontot ega pikenda tähtaega.

Supabase'i Auth soft-delete on dokumentatsiooni järgi pöördumatu. See ei sobi
30-päevase taastamisakna tehniliseks aluseks. Varem väljastatud JWT võib säilitada
kehtivuse kuni aegumiseni, mistõttu sulgemist tuleb kontrollida päris
serveri/andmebaasi õigusradadel, mitte ainult kasutajaliideses või väljalogimisel.

Allikad: `A.auth_page`, `A.registration_plan`, `A.energy_auth`,
[ametlike allikate register](../../evidence/external-sources.json).

## Esimene väike serverimoodul

Eelvaade on kontopõhine ning kuvab kõik asjakohased identiteedid sõltumata
päises valitud profiilist. Esimene teostatav osa tagastab konto seosed,
ettevõtte rollide eristuse ja selgelt märgistatud katvuse. Moodulipõhised
sisuloendid lisanduvad samasse lepingusse kontrollitud koondarvudena.

Eelvaate vastus ei anna kustutusluba. Sulgemise või kustutamise nuppe ei lisata
enne nende serverilepingute valmimist. Kasutaja näeb ainult toimivat eelvaadet
ja arusaadavat selgitust selle ulatuse kohta.

Täpsed sisendid, vastuse kuju, autentimine, piirangud ja tulevased sulgemise/
taastamise invariandid on [serverilepingus](account-lifecycle-server-contract-v1.md).
Kontrollid ja rakendamisjärjekord on [kontrolliplaanis](account-lifecycle-verification-plan-v1.md).

## Üks järgmine töö

Koostada selle eelvaate jaoks olemasoleva pilveprojekti **piiratud kataloogi
lugemiskontroll**: konto/identiteedi ja nendega seotud moodulite FK-d, trigerid,
RLS, õigused ning kasutatavate funktsioonide definitsioonide sõrmejäljed.
See uus tõendivajadus tuleneb auditis leitud ettevõtte kaskaadidest ja
muutumatuskaitsete vastuoludest. Tööloendi valmis parandust ei korrata.

Kataloogikontroll ei vaja kontode, e-posti aadresside, sõnumite, pildiobjektide
ega saldode lugemist. Isiklikud koondarvud kuuluvad hiljem ainult autentitud
kasutaja enda eelvaatesse. Käesolevas auditipakis ei ole paigaldajat ega
käivitamiseks antud SQL-i. Järgmine diagnostika peab säilitama Maci/Giti
kontrollid ning kasutaja täpse `SAADA SEE FAIL` raportikäitumise.
