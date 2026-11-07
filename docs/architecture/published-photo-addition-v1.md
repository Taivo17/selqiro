# Foto lisamine avaldatud kuulutusele

Leping: 07.11.2026. Paigalduse ja kasutuskatse tegelik seis on
[`CURRENT_STATE.json`](../continuity/CURRENT_STATE.json).

## Eesmärk ja kasutaja toiming

Omanik saab lisada olemasolevale hallatud kuulutusele ühe foto korraga.
Senised fotod, nende veebiaadressid, põhipilt ja kuulutuse tekst säilivad.
Aktiivses galeriis võib olla kuni kümme fotot. Tühja galerii esimene foto
saab põhipildiks; muul juhul jääb valitud põhipilt samaks.

Foto lisamine ei salvesta kasutaja pooleliolevaid teksti- ega hinnamuudatusi.
Muutmisvorm jääb sama tegutseja puhul paigale. Toiming kasutab sama omaniku
lukku nagu põhipildi valimine ja foto eemaldamine. Konto või identiteedi
vahetus katkestab kohaliku töö ning hiline vastus ei tohi uut vaadet muuta.

See on tavaline kuulutuse haldus ja ei tarbi Energyt.

## Miks algset avaldamiskatset ei avata uuesti

Algse avaldamise pildikohad ja failiviited on muutumatud. Juba avaldatud katse
taasavamine või eemaldatud pildikoha korduskasutus võiks muuta vana URL-i
tähendust. Seetõttu kasutab iga lisatav foto üht uut olemasoleva tüübi
privaatset üleslaadimiskatset, milles on üks SOURCE-pildikoht järjekorraga 0.

Üks uus kaitstud seostabel `managed_image_additions_v1` seob selle katse
olemasoleva kuulutuse avaldamistõendiga. Tabel hoiab pärast edukat lisamist
muutumatut kviitungit. See ei sisalda teist avalikku kuulutust, uut mahabilanssi
ega eraldi üleslaadimis- või koristusjärjekorda. `publications.listing_id`
jääb unikaalseks ning aktiivse galerii autoriteetne allikas on endiselt
`public.listing_images`.

Lisamiskatse kirjeldab ausalt oma eesmärki ja emaavaldamist. Sellele ei
valmistata fiktiivset kuulutuse pealkirja ega hinda. Tavaline avaldamis-RPC
keeldub lisamiskatset uue kuulutusena avaldamast.

## Sama pilditöötlus ja piirid

Ühine `completePublicationImage` teenindab nii uue kuulutuse loomist kui ka
foto lisamist. Kasutatakse senist private SOURCE → kontrollitud native
pilditöötlus → private WEB rada, multipart-sessioone ja muutumatuid kviitungeid.
Olemasolevaid pilte ei saadeta uuesti ega töödelda ümber.

Suure valitud foto brauseri ettevalmistus, täpsete algsete/saadetud baitide
seos ja mõõtmine on ühises
[foto ettevalmistuse lepingus](listing-photo-preparation-v1.md). See vähendab
saadetavat SOURCE-mahtu, säilitades senise serveri kontrolli ja jätkamise.

- Ühe SOURCE-faili piir on 25 MiB ja WEB-faili piir 4 MiB.
- Konto senine 300 MiB loogiline reserv ja üleslaadimise sageduspiirid säilivad.
  Uus foto vajab 29 MiB reservi ka siis, kui saadetav fail on väiksem.
- Faili sisu võetakse kinnisest Blob-ist; faili valimise järel tehtud
  kasutajaliidese muudatus ei asenda juba alanud toimingu baite.
- Brauseri püsiv jätkamiskirje seob konto, identiteedi, kuulutuse, päringu,
  faili räsi ja täpse galerii lähteseisu. Sinna ei salvestata faili sisu,
  algset nime, ligipääsutokeneid ega allkirjastatud Storage'i URL-e.
- PUT-i kavatsus salvestatakse enne võrku saatmist. Tundmatu vastuse järel
  kontrollitakse sama katset; juba saadetud PUT-i ei alustata pimesi uuesti.

## Üks kontrollitud lisamine

`prepare` seob ühe failikirjelduse ja päringuvõtme emaavaldamisega. Uus katse
saab tekkida ainult praeguse lubatud tegutseja, sobiva galerii revisjoni,
vaba fotokoha ja kehtivate avaldamistingimuste korral. Sama võtme kordus
ei loo uut katset ega pikenda selle tähtaega.

Pärast olemasoleva pilditöötluse WEB-kviitungit kinnitab `append` ühe
andmebaasitehinguga kõik järgmised asjad:

1. sama kasutaja, aktiivne identiteet ja kuulutuse haldamise õigus;
2. sama emaavaldamine, lisamiskatse, failikoht ja WEB-kviitung;
3. galerii oodatav revisjon ja vähem kui kümme aktiivset fotot;
4. lõpetatud SOURCE- ja WEB-sessioonid, õiged räsi/baidid/objektiversioonid
   ning puuduvad lõpetamata multipart-osad;
5. üks uus galerii rida, järgmine revisjon ja muutumatu lisamiskviitung;
6. lisamiskatse sulgemine ning SOURCE-i suunamine senisesse koristuspäevikusse.

Kui sama lähteseisu pealt valmistatakse ette kaks fotot, saab esimene
kinnitatud lisamine revisjoni edasi viia. Teine peab enne uut kinnitamist
lugema värske galerii. SQL kontrollib piiri uuesti, sõltumata brauseri nupust.

Salvestuse kviitung ja järgnev värske galerii lugemine on eraldi tõendid.
Kui foto on lisatud, kuid järgnev lugemine ebaõnnestub, ei kuvata olematut
tagasivõtmist ega saadeta uut faili. Jätkamine saab sama muutumatu kviitungi.
Ka hiljem eemaldatud fotot ei taastata vana päringu kordusega.

## Püsiv järjekorranumber ja meedia päritolu

Galerii järjekorranumber eristatakse üleslaadimise pildikoha numbrist.
Algne pilt säilitab oma algse katse ja pildikoha. Lisatud foto URL osutab
uue katse pildikohale 0, kuid galerii saab järgmise seni kasutamata numbri.
Kümne foto piir kehtib aktiivsele liikmesusele; eemaldatud numbreid ei taaskasutata.

Ühine SQL-lugem `managed_image_origins_v1` kirjeldab seda seost. Galerii,
põhipildi valimine, foto eemaldamine ning avalik ja omaniku meediavaade
kasutavad sama päritoluseost. Galerii vastuse skeem 2 annab pildi juurde
eraldi `media_attempt_id` ja `media_ordinal`. Vana skeemi 1 lugemine on
lubatud üksnes algse katse olemasoleva 0–9 pildikoha tähenduses.

SQL rakendub enne uue rakenduse deployment'i. Seetõttu säilib tavalise
olemasoleva galerii skeem 1 kuni esimese lisatud foto kinnitamiseni;
lisamistoimingu ümbris kasutab ühte selget skeemi 2 projektsiooni. Algse katse
koristusvastus jääb skeemi 1 ning ilma seotud lisamisteta multipart-vastus
skeemi 3. Seotud uute objektide korral kasutatakse laiendatud skeeme 2 ja 4.
Uus rakendus loeb mõlemat kuju. Vana avatud brauserileht ei tohi tundmatut
uut päritolu oletuse abil ümber tõlgendada.

## Eemaldamine, tühistamine ja reserv

Lisatud foto SOURCE ja hiljem eemaldatud WEB kasutavad sama kitsast
ühe objekti koristust. Uue claim'i skeem 2 seob emaavaldamise ja tegeliku
päritolukatse; sama `cleanupOne` teeb endiselt ühe täpse objekti Storage'i
eemaldamise ja värske puudumiskontrolli. Emaavaldamise kviitungi loendur
hõlmab ka seotud lisamisi. Varasem kahekümne objekti arv ei ole kogu
kuulutuse eluea ülempiir.

Kogu kuulutuse eemaldamine sulgeb ka pooleliolevad lisamiskatsed. Hiline
üleslaadimine ega append ei saa kuulutust või fotot uuesti nähtavaks teha.
Terminalse multipart-koristuse skeem 4 annab ühe vastusega kuni kakskümmend
täpselt seotud ootel objekti ja eraldi kogu seose loenduri.

Tühistamine säilitab senise päringu sulgemiskirje ka enne ettevalmistuse
vastust. Pooleliolevad failid jäävad senisesse päevikusse ja reservi kuni
tõendatud lõpetamiseni. SQL ei kustuta Storage'i metainfo ridu ning
teadmata tulemus ei vabasta ruumi.

## Avaldatud SOURCE-i piiratud lõpetamine, 07.11.2026

[Aktsepteeritud diagnostika](../continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md)
näitas, et avaldatud lisamiste koristust ootavad SOURCE-id hoidsid konto
reservi. Parandus seob kaks olemasoleva lisamistoimingu kohta sama hosted
SOURCE-koristajaga; uut SQL-i, mahapiiri ega koristusjärjekorda ei lisata.

- Kui `prepare` annab täpse `publication_retained_bytes_limit` keeldumise
  SQLSTATE-ga `54000`, võib lõpetada ühe sama emaavaldamise SOURCE-objekti.
  Allocator annab selle keeldumise enne uue katse ja objektide loomist.
  Tundmatu võrguvastus ega muu veakood seda rada ei käivita.
- Enne ja pärast koristust loetakse praeguse kasutaja õigustega värske
  omaniku kviitung. Identiteet, kuulutus, emaavaldamine ja selle päringuvõti
  peavad sobima. Alles kviitungi loenduri tõendatud vähenemise järel
  korratakse sama `prepare` käsku samade argumentidega kõige rohkem üks kord.
  Allocator kontrollib reservi, õigusi ja galerii revisjoni uuesti.
- Kinnitatud `append`-kviitung võib käivitada ühe sama emaavaldamise SOURCE-i
  lõpetamise Next.js-i `after()` kaudu pärast vastust. Kinnitatud lisamise
  vastus säilib ka siis, kui koristuse registreerimine või lõpetamine ebaõnnestub.
  Kliendi galerii täisvalideerimine jääb eraldi kohustuseks.

Mõlemad lõpetamiskutsed kasutavad 20 sekundi täitmispiiri. `prepare`-rajal
kehtib ka päringu katkestussignaal; pärast vastust käivitatud kutsel on oma
piir ja route'i/platvormi eluiga. Alles jäävad senised täpsed claim-, lease-,
Storage'i puudumise ja SQL-i lõpetamistõendid. Tundmatu tulemus ei vabasta
reservi ega muuda kinnitatud lisamist ebaõnnestunuks.

Praegune lubatud äriliige võib erineda algsest avaldajast. Selle liikme
õigusi kontrollitakse uuesti, kuid kviitungi algne avaldaja ei muutu.
Selline koristus võib vabastada algse avaldaja reservi, mistõttu teise liikme
järgmine `prepare` võib oma konto piiri tõttu endiselt keelduda.

Üks kutse puudutab kõige rohkem üht sobivat SOURCE-i samas emaavaldamise
seoses. See ei kustuta aktiivseid WEB-fotosid ega käi läbi teisi kuulutusi või
kontosid. `cleanup_mode: held` ja üldiste koristus-RPC-de suletud ligipääs
säilivad. See ei ole püsiv taustatööde planeerija ega kogu varasema järjekorra
tühjendamine. Tehniliste paneelide eemaldamine tavakasutaja vaatest jääb
avaliku avamise eelseks tööks. Parandus ei tõenda foto lisamise uut kiirust.

## Kontroll ja tarne

Sihitud kontrollid peavad hõlmama üht edukat lisamist, tühja galerii esimest
pilti, kümne foto piiri, sama revisjoni võistlust, katkenud võrguvastuse
jätkamist, identiteedi vahetust, lisatud foto põhipildiks valimist ja
eemaldamist ning olemasolevate fotode/teksti säilimist. SQL-i ja Storage'i
sünteetilisi tõendeid ei nimetata tootmise kasutuskatseks.

Paranduse kinnitatud lähteseis on Maci `main` commit
`a4b5b2d14e456e6e83d4412b839ef330259cd048`: 07.11 kell 11:29 UTC diagnostikas
vastasid 1081/1081 lähtefaili väljastatud fotovaliku r2-le ning tööpuu ja index
säilisid enne/pärast lugemist. Räsikaitsega tarne kontrollib enne kirjutusi
haru, HEAD-i, tööpuud/indexit, kinnitatud remote'i ja lähtefaile uuesti.
Varem väljastatud pakke ega kasutaja päevikuid ei muudeta.

Lõpliku ühise build'i, serverikontrollide, paketi ja päris Maci/Verceli
kasutuskatse seis kuulub ainult `CURRENT_STATE.json`-i; käsk kuulub
`HOSTED_PORTAL.md`-sse. Kohalikud katsed ei tõenda Maci paigaldust,
tootmises vabastatud reservi ega uue foto nähtavust päris avalikus vaates.

## Otsene fotovalik ja täpne ajutine piirang, 07.11.2026

Üks nähtav rakenduse nupp avab native failivalija samas kasutaja sündmuses.
Peidetud failisisend jääb omaniku värskenduse ajal lubatuks, et valijast
tagastatav fail ei kaoks. Nähtav avamisnupp kontrollib endiselt omaniku ja
galerii valmisolekut. Kohalik valik seotakse valija avanud kontrolleriga ning
säilib ajutise lugemise või lugemisvea ajal. Senine kontrollitud terminalse
toimingu reset ootab sama kontrollerit, lubatud omanikku ja vaba galeriikohta.

Ootel valik asendab vana eduteate teatega, et uut fotot pole veel lisatud.
Täituva galerii puhul ei alustata reset'i ega üleslaadimist. Kohalikust
valikust saab loobuda ka lugemisvea või täis galerii korral; see ei tühista
kaugtoimingut. Valija katkestamine ei muuda päevikut; kontrolleri või
identiteedi vahetus ja uuem teise vahekaardi kavatsus säilitavad senised
kaitsed. Faili valimine ei saada faile ilma eraldi üleslaadimistoiminguta.

Lõplikku komponenti kontrolliti üheksa sihitud integreeritud Chromiumi
juhuga. Tõendid ja päris OS-valija katse piir on
[juhtumi ülevaates](../continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md).

Aktiivse galerii kümne foto piir on eraldi konto kolme avatud katse, veereva
24 tunni 20 uue katse ja 300 MiB reservi piiridest. Ühe foto lisamine loeb
uueks katseks. Edukas published lisamine ei ole enam open; koristust ootav
algfail võib siiski hoida oma reservi. Brauser kuvab olemasoleva suletud
kolme veakoodi järgi täpse kasutajateate, säilitades jätkamise/katkestamise.
Tundmatule veale ei omistata kvoodipõhjust ja serveri piire ei suurendata
pelgalt galerii fotode arvu või üldise veateate põhjal.

Kasutajaliidese keele nõue ja tegelik V2 puudujääk on
[ühises keelelepingus](interface-language-v1.md). Keelte sidumisel tuleb
sõnumid tõlkida kuvamisel, säilitades poolelioleva toimingu ja selle võtmed.


## Kaitstud foto laadimine paralleelselt galerii lugemisega, 07.11.2026

Pärast parsitud püsivat lisamiskviitungit võib alustada täpselt selle foto
tavalist kaitstud WEB-lugemist samaaegselt järgneva värske galerii lugemisega.
Kviitung ega eellaadimine üksi ei muuda fotot nähtavaks galerii liikmeks.
Värske autoriseeritud galerii võrdlus salvestuskviitungiga jääb nõutuks.

Olemasolev omaniku hook hoiab ühe toimingu jooksul kõige rohkem üht ajutist
eellaadimise URL-i. Sama URL-võtmega pildikomponent on esialgu peidetud ning
muutub nähtavaks alles värske galerii liikmena. Aktiivsete fotode arv ja
toimingunupud tulevad ainult galeriist; tühi galerii ei saa eellaadimisest
fiktiivset põhipilti. Päring/Blob URL säilib nähtavaks muutumisel.

Galerii lugemise vea, hilisema eemaldamise või konteksti muutuse korral
peidetud komponent eemaldatakse ja senine pildilaadija vabastab ressursid.
Meedia Auth/readiness, jooksva omanikuseose, täielike baitide/räsi ja seose
lõppkontrolli ei muudeta. Uut püsivat vahemälu, järjekorda ega üleslaadimiste
kordust ei lisata. Värske galerii lugemine toimub endiselt pärast salvestust.

Enne seda muudatust on kasutaja kinnitanud f1745be paranduse, kümne foto
kasutuskatse ning Frankfurdi fra1 redeploy. Serveri mõõtmine paranes
7,6472 → 4,3452 sekundile; üks uus kogu lisamise katse võttis 12 sekundit.
Uue paralleelse laadimise tootmisajavõitu pole veel mõõdetud.
Täpsed mõõdud, teostus ja kontrollipiirid:
[PHOTO_DISPLAY_20261107.md](../continuity/PHOTO_DISPLAY_20261107.md).
