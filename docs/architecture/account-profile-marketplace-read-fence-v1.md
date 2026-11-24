# Avaliku profiili kuulutuste ja rubriikide konto kättesaadavus

24.11.2026 Europe/Tallinn. Ette valmistatud vastu võetud `ac5521a7e944ebfb3710ea97b9913cc91b9130ee`
alusele. Uue paketi Maci käivitus, SQL rakendamine, commit/push, Vercel ning
tegelik kasutuskontroll on ootel.

## Ulatus ja üks andmeallikas

Kolm iseseisvalt kutsutavat lugejat peavad kontrollima vaadatava profiili
omanikukonto kättesaadavust. Avaliku profiilipäise kontroll ei anna seda õigust
teistele RPC-dele. Muutuvad ainult järgmiste funktsioonide kehad:

| Lugeja | Säiliv ülesanne |
| --- | --- |
| `get_public_profile_marketplace_v1(text,uuid,integer,integer)` | Vana profiililoendi leping; rubriigifiltriga tavakuulutused. |
| `get_public_profile_marketplace_v2(text,uuid,integer,integer)` | Tava- ja hobusekuulutused koos nende kanooniliste rubriigiseostega. |
| `get_public_profile_store_categories_v2(text,text,integer,integer)` | Profiili marketplace- või services-sektsiooni nähtavate kirjete rubriigid ja esivanemad. |

Sama `account_lifecycle_private.account_is_available(uuid)` jääb muutmata.
Uut kontooleku allikat, avalikku API versiooni, brauseri kontopäringuid ega
kasutajaliidese äriloogikat ei lisata. Uus release on
`supabase/releases/account-profile-marketplace-read-fence-v1/`.
Ajaloolisi paigaldatud SQL-faile ei muudeta ega rakendata uuesti.

## Ühe profiili kontroll enne sisu

Sisendi valideerimine ja kuni kahe aktiivse identiteedi leidmine slugi järgi
jäävad esimeseks. Täpselt üks kandidaat on nõutud; kahe sama slugiga kandidaadi
korral ei valita sobivamat kontot ega ühendata nende sisu.

Alles ainsa identiteedi leidmise järel lahendatakse konto omanik. Eraisikul on
see `identities.user_id`, ettevõttel sama identiteediga seotud
`business_accounts.owner_user_id`. Puuduv seos või tundmatu tüüp ei kasuta
avaldajat, loojat ega ettevõtte liiget varuomanikuna.

Konto helperit kutsutakse enne sisu- ja rubriigi-CTE-sid ühe korra leitud
profiili kohta. Kaartide ja rubriikide arv ei suurenda konto kontrollide arvu.
Puuduva või mitmetähendusliku profiili puhul konto helperit ei kutsuta.
Kontroll on lugemine; uut rea lukustamist ega konto paranduskirjutust pole.

Sobimatu konto korral määratakse sisemine `identity_value` väärtuseks NULL.
Senine ümbris annab `profile_available=false`, `items=[]`, `total_count="0"`,
`has_more=false`, `next_offset=null` ja `window_limit_reached=false`.
Rubriikide vastuses on lisaks `identity_id=null`. Sisendiga seotud slug,
rubriik, ulatus, limiit ja nihe säilivad. Päringuviga jääb veaks; toorest
null-vastust ega omaniku möödapääsu ei lisata.

## Säiliv nähtavus ja leheküljed

Profiili tavakuulutustel säilib aktiivne olek ja rangelt tulevane tähtaeg;
NULL-tähtaeg ei muutu profiilil avalikuks. Hobustel jäävad avaldamise sündmus,
sisuräsi, pildi lõplikkus, efektiivne tähtaeg ja kõik viis pakkumisliiki.
Hindade, valuuta, asukoha ja avalike väljade leping ei muutu.

Marketplace’i senine kahepoolne blokeerimine kontrollib sisu avaldajat;
teenuste rubriikidel säilib senine omaniku blokeerimise kontroll. Konto
kättesaadavus kontrollib profiili omanikku. Üldotsingu ajutine peitmine ei muuda teadliku
profiilikülastuse senist käitumist. Profiilipäise legacy-slugi varuteid,
ettevõtte staatuse või omaniku blokeerimise uusi reegleid siia ei kopeerita.

V1/V2 rubriigierinevus, sama identiteedi järeltulijad, kogu nähtava sektsiooni
rubriigid koos esivanematega, ühine järjestus, koguarv ja leheküljed säilivad.
Teenuste rubriikide sama konto kontroll on vajalik ühise RPC tõttu;
`service_publication_private.is_public` ja `visible_to_viewer` jäävad muutmata.
See ei lõpeta teenuste eraldi sisu- ja kontaktiteede konto kontrolli.

Kliendi parserid, kõigi rubriigilehtede koondamine, katkestus ning vaataja,
profiili, filtri ja lehe vahetusel vana vastuse peitmine säilivad.

## Ettevalmistuse kontrollid ja mõõtmine

17/17 uut sihitud kliendikontrolli läbisid päris TypeScripti parserite ja API-dega; 23 allikapinni säilisid. Lisaks läbis 7 hook’i juhtumit juhitud sünteetilise efekti/renderduse harness’iga ning 12 native PostgreSQL-i vastust tegelike parseritega. Hook’i katse pole React DOM ega brauser; native-wire’i unavailable-rühm on puuduv slug, olemasoleva sobimatu konto juhtumid on SQL-katsetes. Rakenduse kliendikood ja sõltuvused jäid muutmata.

58/58 native PostgreSQL 17.6 kontrolli läbisid. Tegelikud konto-, hobuse- ja teenuse nähtavuse/finality helperid töötasid sünteetiliste andmetega. Kontrolliti era-/ettevõttekontot, omanikku ja avaldajat, puuduvaid/piiratud kontosid, kolme lugeja õigusi, mõlemat rubriigiulatust, v1/v2 erinevusi, rubriigipuud, aegumist, avaldamise lõplikkust ning lehekülgi. Üks tegelik preflight → kaitstud apply → COMMIT-järgne kinnitus → eraldi verify läbis; triivi ja katkise tehingu juhud peatusid. 75 katse-/SQL-sisendi räsid säilisid ja oma klaster on peatatud. Täiendav live-kataloogileping on allikast koostatud ning vajab Macis värsket kinnitamist. Attempt/slot/object/policy viited on sünteetilised FK-toed, mitte kogu avaldamise või Storage’i katse.

Päris vanade/uute lugejate 14 võrdlusjuhus (13 aktiivset profiili ja üks puuduv) säilis JSON täpselt. Andmestik: 801 tavakuulutust, 801 avaldamiskontrolli läbivat hobust, 151 kehtivat teenust ja 153 rubriiki; suurel profiilil 1600 pakkumist. Üks konto helperi kutse leitud profiili kohta, puuduval profiilil null. Veel 20 000 kõrvalise konto, identiteedi, profiili, tavakuulutuse, rubriigi, teenuse ja vastavate rubriigiseoste lisamisel säilisid 8 valitud juhu tulemused ning kutsete arvud. Suure profiili v2 loendi mediaan 966,67 → 981,87 ms; mõõtmine on ühe kliendi sünteetiline katse, mitte tootmiskoormuse tõend. Eraldi piiratud plaanide järelvaatlus täiendab algse salvestusfiltri välja jäetud slugi/omaniku päringuid. Järelvaatluse 152 plaanis kasutavad slugi, omaniku ja konto kontrollid indekseid; need ei käi kõiki kontosid läbi. Senine marketplace-rubriigiharu luges mõõtmisel kõiki 20 801 tavakuulutuse-rubriigi seoseid (järelvaatluses lisandus algse katse viimane fixture-rida: vana ja uus lugesid mõlemad 20 802). Suure profiili kaartide/finality koostamine enne lehekülge jäi alles. Need on eraldi optimeerimistööd enne suuremat mahtu.

Üks uus täielik Next.js 16.4.6 / TypeScripti build läbis 33.481 sekundiga. Kõik 765 build’i sisendit säilisid; package.json, lukufail ja rakenduskood on muutmata. Kasutati olemasolevaid täpseid sõltuvusi ning inertseid kohalikke koostamisseadeid. Valmis profile, my-area ja products lehtede väljundid. Maci build ja deployment on eraldi järgmine tõend.

20/20 uut Maci uuendaja sihitud juhtumit läbisid 19.963 sekundiga. Kõik 43 sisendit säilisid. Päris ajutine Git-hoidla, kohalik bare-remote ja piiratud alamprotsessid kontrollisid järjestust ning peatumist; runtime-proov, CLI, SQL ja build’i tulemused olid selles runner’i katses sünteetilised. Seitse senist transporti/protsesse/Giti/sõltuvusi kaitsvat helperit säilivad baiditäpselt. See pole Maci ega pilveteenuse käivitus.

Uue versiooni päris brauserikontroll on ootel sama uue commit’i Ready / Production järel. Siin ei käivitatud uut brauserikatset ega kasutatud päris kontosid. Eelmine dokumenteeritud kohaliku brauseri socket-piir jääb ajalooliseks tõendiks; tänast brauseri tööd ega selle tõrget ei väideta. Kliendi, juhitud hook’i ja SQL vastuste kontrollid ei tõenda klikke, hydration’it või päris teenuse kasutusteed.

Sünteetilised päringud ja juhitud hook’i katse ei tõenda päris teenusega
brauseri klikke ega uue versiooni avaldamist. Kasutaja kontroll järgneb sama
uue commit'i Ready / Production tulemusele.

## Rakendamise piir

Uuendaja kontrollib värskelt Maci täpset main ac5521a alust, kogu lähtepuud,
indeksit/tööpuud, kinnitatud remote'i, olemasolevaid sõltuvusi, CLI sihti ja
eelmise eduka hobuste käigu originaalraportit. Originaal säilib lugemiseks
lukus. Uued sihitud klienditestid ja värske build eelnevad SQL kirjutusele.

Uute sihtide kataloogiootused pärinevad kontrollitud lähtekoodist ja eraldatud
PostgreSQL-i koostamisest; need pole veel live-andmebaasi vaatlus. Värske
piiratud eelseis peab kinnitama täpsed definitsioonid, signatuurid, õigused,
omanikud, seadistused ning vajalike sõltuvuste, tabelite ja indeksite lepingu.
Varasemad konto-, profiili-, tava- ja hobuselugejate lepingud säilivad kontrolli all.
Tundmatu eelseis peatab enne kirjutust.

Kolme funktsiooni asendus toimub ühes kaitstud tehingus. Kinnitus loetakse
pärast COMMIT-i ja sellele järgneb eraldi järelseisu lugemine. Ebaselget SQL
kirjutust ei korrata automaatselt. Hilisem Giti peatumine ei tühista juba
rakendatud SQL-i; raport eristab etappe. Commit/push hõlmab ainult paketi faile.

## Alles jääv töö

Konto sulgemist, taastamist ja kustutamist see moodul ei ava. Teenuste ja tööde
eraldi lugejad, showcase, legacy-teed, tabelite otseõigused/RLS, kirjutused,
kontakt, sõnumid, ajalugu, meedia ja pilditöö lõppkinnitus vajavad veel oma
lõpetatud kontrolli. Avalike piltide varasemaid koopiaid ega salvestatud
jagamismetadata't see muudatus ei tühista.

Olemasolev profiilipäring koostab sisu kaardid ja hobuse lõplikkuse enne
lehekülge; rubriigipäring hindab kogu sektsiooni. Päringuplaanid eristavad uue kontokontrolli sammud varasemast sisutööst.
Kolme ajamõõtmise põhjal ei eraldata kontrolli täpset lisakulu. Suurema andmemahu ja liikluse
jaoks vajalik otsingu/profiililoendite optimeerimine jääb eraldi kohustuseks.

Uus konto valib eraisiku VÕI ettevõtte; olemasoleva kahe identiteediga konto
andmed säilivad. SMTP paus põhidomeeni kasutuselevõtuni ning konto tervik →
kuulutuste esiletõstmine → reklaamid järjekord säilivad. E-posti kinnitamine ja
parooli taastamine peavad töötama enne väliseid testijaid või avalikku registreerimist.
