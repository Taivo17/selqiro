# Foto lisamine avaldatud kuulutusele

Leping: 06.11.2026. Paigalduse ja kasutuskatse tegelik seis on
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

- Ühe SOURCE-faili piir on 25 MiB ja WEB-faili piir 4 MiB.
- Konto senine 300 MiB loogiline reserv ja üleslaadimise sageduspiirid säilivad.
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

`cleanup_mode: held` ja üldiste koristus-RPC-de suletud ligipääs säilivad.
See samm ei lülita sisse üldist taustakoristust. Automaatne lõpetamine
ilma omaniku avatud lehest sõltumata ning tehniliste paneelide eemaldamine
tavakasutaja vaatest jäävad avaliku avamise eelseteks töödeks.

## Kontroll ja tarne

Sihitud kontrollid peavad hõlmama üht edukat lisamist, tühja galerii esimest
pilti, kümne foto piiri, sama revisjoni võistlust, katkenud võrguvastuse
jätkamist, identiteedi vahetust, lisatud foto põhipildiks valimist ja
eemaldamist ning olemasolevate fotode/teksti säilimist. SQL-i ja Storage'i
sünteetilisi tõendeid ei nimetata tootmise kasutuskatseks.

Uus eraldi räsikaitsega pakett kontrollib enne Maci kirjutusi haru, HEAD-i,
tööpuud/indexit, kinnitatud remote'i ja kõiki lähtifaile. Täpne eelmise
paranduse commit leitakse selle olemasolevast tulemuspäevikust ning
kontrollitakse sõltumatult Giti puud ja vanemat. Päeviku väitest üksi ei piisa.
Varem väljastatud pakke ega kasutaja päevikuid ei muudeta.
