# Avaliku profiili konto-oleku kontroll

23.11.2026 Europe/Tallinn. Alus `4b607828d0b153b84166ba963fdb4e77337e11f0`.
See dokument kirjeldab järgmist ettevalmistatud serverimuudatust. Maci rakendamine,
pilve SQL, uus commit/push ja uue versiooni kasutustee kinnitatakse eraldi raportiga.

## Eesmärk ja väike ulatus

Kanoonilise avaliku profiilikaardi ja selle meediaprojektsiooni lugemine peab
arvestama sama autoriteetse konto olekuga, mida näitab privaatne Minu konto vaade.
See on konto hilisema sulgemise üks eeldus. Konto oleku tabel lubab praegu endiselt
ainult `active`; sulgemise, taastamise ja kustutamise toiminguid see moodul ei lisa.

Uues `supabase/releases/account-public-profile-fence-v1` release’is lisandub üks
privaatne ainult lugev funktsioon. Olemasolevas `get_store_by_slug` lugejas muutub
ainult valitud kandidaadi sobivuse lõppfilter. Avaliku vastuse kuju ja kliendi
rakenduskood säilivad. `get_public_profile_media_v1` jääb muutmata delegaadiks.

## Üks kontoandmete allikas

`account_lifecycle_private.account_is_available(uuid)` kontrollib:

- konto identifikaator pole puudu ja Auth konto on olemas;
- samal kontol on autoriteetne olekurida väärtusega `active` ja positiivne revisjon;
- Auth konto ei ole kustutatuks märgitud ega praegu keelatud;
- kui Auth loomisaeg on olemas, on see lõplik ajaväärtus, nagu Minu konto getter nõuab.

Puuduv rida annab `false`. Lugemine ei loo olekurida, ei paranda andmeid ega võta
realukku. Algoleku loob varasem Auth INSERT-trigger. E-posti kinnitamise seadistus
ei ole selle avaliku sobivuse kontrolli sisend; kasutaja SMTP paus säilib.

Helper on `STABLE`, fikseeritud `pg_catalog` search_path’iga ning kasutab täielikke
skeeminimesid. Sellel pole anon/authenticated/service_role otsest täitmisõigust.
Avalik profiililugeja kutsub seda olemasoleva kontrollitud definer’i õigustes.
Privaatset konto olekut ega selle põhjust avalikku vastusesse ei lisata.

Kontroll on ühe juba valitud profiili omanikukonto kahe primaarvõtme päring.
Uut kontode koondloendust, otsingutulemi skannimist ega kontooleku vahemälu ei lisandu.
See ei ole koormustesti ega miljonite samaaegsete päringute tõend.

## Kanooniline valik eelneb sobivusele

`get_store_by_slug` valib senises materialiseeritud `selected` CTE-s esmalt
kanoonilise `identity_profiles.slug` vaste, seejärel vana `profiles.store_slug`
aliase ning ainult ühe kandidaadi. Uus konto kontroll on selle valiku järel.

Kättesaamatu kanoonilise profiili asemele ei tohi avaneda teise konto sama vana
alias. Slugi järjestust, kandidaatide valikut ja olemasolevat LIMIT-i ei muudeta.
Sobivad identiteeditüübid on selgelt `private` ja `business`; tundmatu tüüp ei
muutu vaikimisi ettevõtteks.

Eraisiku konto tuletatakse `identities.user_id` järgi. Ettevõtte konto tuletatakse
`business_accounts.owner_user_id` järgi. Olemasolev `block_account_id` kannab sama
seost; brauseri aktiivne profiil ega liikmete nimekiri ei määra avalikku konto olekut.
See säilitab ühe konto varasemate identiteetide seosed uue haldusvoota.

Säilivad senised identiteedi ja ettevõtte aktiivsuse tingimused, mõlemasuunaline
blokeerimine, täpse eraisiku aadressi peitmine, ettevõtte valitud avalik aadress,
linna/riigi nähtavus ning profiilipiltide senine lahendus.

## Meedia ja kliendi piir

`get_public_profile_media_v1` loeb kanoonilise slugi kaudu sama profiili ning
kontrollib identiteedi ID vastavust. Kui põhilugeja profiili ei tagasta, annab
meedia lugeja `NULL`. Selle keha, omanikku ja õigusi paigaldus ei muuda.

Olemasolev klient eristab edukat tühja profiili, päringuviga ja meedia lugemise
tehnilist viga. Tühi profiil kuvab olemasoleva „Profiili ei leitud” vaate.
Meedia edukas `NULL` peidab varasema profiilikaardi; tehnilise meediavea korral
säilib senine juba loetud profiili fallback, kus teadmata paigutusega hallatud
kaanepilt eemaldatakse. Selle kitsalt säilitatud käitumise põhjal ei väideta kohest
kõigi varem loetud andmete tagasivõtmist.

Päringud hindavad konto olekut oma lugemishetkel. Siin ei lisandu sulgemise
võidujooksude, avatud brauserilehe vahemälu või pildi-URLide tagasivõtmise lepingut.
Varem väljastatud avalik pildi-URL ei muutu selle filtriga kasutuskõlbmatuks.

## Paigaldus ja säilimine

Värske ainult metaandmeid lugev eelseis kontrollib täpseid sihtdefinitsioone,
omandiveerge, vajalikke indekseid, funktsiooniõigusi ning paigaldatud kontooleku
alust. Oodatud profiililugeja õigused on taastatud vastu võetud lähtekoodist;
need ei ole uus pilvevaatlus. Tegelik eelseis peab sobima enne kirjutust.

Üks piiratud SQL-tehing lisab helperi ja asendab ainult ühe profiililugeja.
Sama tehing kontrollib järelseisu. Eraldi ainult lugemise verify kinnitab lõpptulemuse.
Olemasolevate kontode, profiilide, piltide, sõnumite ega finantsandmete ridu ei
muudeta. Auth-trigger ja ainult-active tabelipiirang säilivad.

Maci uuendaja kontrollib tegelikku main/HEAD-i, kogu 2108-failist aluspuud,
tööpuud/indexit, kinnitatud remote’i, sõltuvusi ning eelmise eduka r2 käigu täpset
originaalraportit. Seejärel teeb ta ainult uued sihitud kliendikontrollid ja ühe
värske build’i, kontrollib SQL eelseisu, rakendab ühe muutuse, kontrollib järelseisu
ning commit’ib/push’ib ainult selle paketi failid. Tundmatu SQL tulemus ei põhjusta
uut kirjutamiskatset. Kõik originaalraportid, vana ajalugu ja kasutaja muudatused säilivad.

Uus käivitaja kasutab eraldi päevikut. Varasema r2 parandatud protsesside ja
real/effective UID käsitlus säilib; vana peatumisajalugu ei muudeta edukaks.
Raport väljastatakse privaatse unikaalse Downloads-koopiana, täpse
`SAADA SEE FAIL` rea ja piiratud Finderi valikuga.

## Kontrollide piir

Uued kliendikontrollid kasutavad tegelikku TypeScripti profiililugejat ja meedia
parserit sünteetilise transpordiga ning tegeliku Reacti serverrenderdust eesti
ja inglise keeles. Eraldatud PostgreSQL katsed kontrollivad helperit, täpset vana
ja uut lugejat, delegatsiooni, õigusi, asukoha privaatsust, blokeerimist ja slugi
kokkupõrget. Negatiivsed andmed jäävad ainult sünteetilistesse testidesse.

Täpsed testiarvud, käivituskäsud, runtime-versioonid ja räsid on uue paketi
`proof/` kaustas ning seisukirjes. Täielik Next.js/TypeScripti build kasutab
lukufaili täpseid olemasolevaid sõltuvusi ja inertseid lokaalseid koostamisseadeid.

Selle töökeskkonna varasem Chromiumi käivitus peatus socket-piirangu juures enne
lehe loomist; toetatud pilvebrauser ei pääsenud kohalikule serverile. Sama blokeeritud
seadistust ei korrata ega piirangust mööda minda. Reacti serverrenderdus ei ole
brauseritest. Pärast uue commit’i Ready / Production tulemust tuleb värskendada
portaali ja kontrollida olemasoleva eraisiku ning ettevõtte avalikku profiili
koos piltidega. Ühtegi päris kontot ei suleta selle kontrolli tegemiseks.

## Järgmised piirid enne sulgemist

Otsingu ja pakkumiste otse-RPC-d, teenused, tööd, showcase’id, teised profiili- ja
ajalooliste sõnumikaartide lugejad ei päri automaatselt selle põhilugeja kontrolli.
Neile järgnevad tavalised kirjutamised, kontakt/sõnumid ja välise pilditöö lõppkinnitus.
Sulgemise tegevus lisandub alles nende vajalike serveriteede katmise järel.

Üks eraisiku või ettevõtte algprofiil, SMTP paus, tavalise osalemise tasuta olemine
ning suletud AI päringuteed säilivad. Konto tervikule järgnevad kuulutuste
esiletõstmine ja reklaamide esimene kasutustee.

## Tehniline viide

PostgreSQL 17 funktsioonide STABLE, SECURITY DEFINER, search_path’i ja EXECUTE
õiguste leping: https://www.postgresql.org/docs/17/sql-createfunction.html.
Viide selgitab tehnilist valikut; Selqiro pilveseisu tõend tuleb Maci raportist.
