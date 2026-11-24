# Töökuulutuste avaliku lugemise konto kontroll — v1

24.11.2026 Europe/Tallinn. Ettevalmistatud lähtekood; kasutaja Maci rakendus,
andmebaasi muutus, uus commit/push ja deployment on eraldi järgmised tõendid.
Alus on vastu võetud `a9d86e63ab667545598da8e40ee2a2d0c7365df3`,
puu `e5e7d7d2253c7c89ff09bbd84d3e501674c2de90`, 2227 faili.

## Eesmärk ja täpne ulatus

Avalik tööpakkumine peab arvestama avaldaja konto kättesaadavust.
Sama kontooleku allikas on `account_lifecycle_private.account_is_available(uuid)`.
See kontrollib olemasolevat aktiivset kontoolekut ja Auth-kirje kättesaadavust.
Konto oleku muutmise toimingut käesolev moodul ei lisa.

| Muudetav funktsioon | Vastutus |
| --- | --- |
| `jobs_private.visible_to_viewer(uuid)` | Identiteedi kanoonilise omaniku konto kontroll koos senise kahepoolse blokeerimisega. |
| `get_public_profile_jobs_v1(text,integer,jsonb)` | Konto kontroll pärast ühese profiilislugi leidmist ja enne tööde lugemist. |

Eraisiku kanooniline omanik on `identities.user_id`; ettevõttel
`business_accounts.owner_user_id`. Pakkumise koostaja ega ettevõtte liige ei
asenda omanikku. Kasutaja aktiivse brauseriprofiili järgi omanikku ei tuletata.

Viewer-helper mõjutab muutmata avaliku üksikvaate ja tööotsingu lugejaid.
Anonüümne jagamise eelvaade kasutab sama üksikvaate RPC-d. Profiililugeja
varane kontroll on vajalik, et kättesaamatu konto identiteet ei jääks tühja
profiili tööloendi ümbrises avaldatuks.

## Vastused, kursorid ja õigused

Puuduv või mitmetähenduslik slug annab senise null-identiteedi. Kui leitud
profiili omaniku konto ei ole kättesaadav, nullitakse `identity_value` enne
muutmata sisupäringut. Vastus sisaldab `identity_id=null`, tühja `items` loendit,
`has_more=false` ja `next_cursor=null`. Uut `profile_available` välja ei lisata.

Üksikvaade säilitab null-vastuse. Null ei nimeta pakkumist kindlalt suletuks:
selle põhjuseks võib olla ka puuduv, aegunud või vaatajale piiratud pakkumine.
Päringu- ja sisendivead jäävad vigadeks. Tööotsingus toimub konto kontroll enne
kursori tulemuste valimist ning `limit+1` leheküljepiiri. Täpset koguarvu
selle olemasoleva tööotsingu lepingus ei ole. Filtrid, avaldaja peitmine,
kahepoolne blokeerimine ning kuupäeva ja ID järgi järjestus säilivad.

Kliendi ranged parserid, avalike väljade valik, täpsed rahasummad ja
tõlked jäävad muutmata. Uut kontopäringut ega kontooleku vahemälu brauserisse
ei lisata. Muutunud funktsioonidel säilivad signatuurid, vaikeväärtused,
omanik, ACL, STABLE omadus ja otsingutee. Tabelite otseõigusi ei laiendata.

`jobs_private.is_public(public.jobs)` on muutmata, sest see on ka kontakti
sõltuvus. Avaldamine, sulgemine, pikendamine, omaniku lugemine ja varasem
lugemisluku parandus säilivad. Konto kontrolli ei lisata kõrvalteena
kontaktile, kirjutustele või nende korduskviitungitele.

## Kataloog ja kaitstud rakendamine

Allikad ning täpne enne/pärast leping asuvad
`supabase/releases/account-job-read-fence-v1/` all. Kontroll säilitab eelmise
teenuste väljaande BASE- ja AFTER-lepingu ning lisab viimase tööde paranduse
funktsiooni- ja tabelifaktid. Kaks sihtkeha eraldatakse muutumatutest
sõltuvustest; ülejäänud leping peab jääma samaks.

Uue mooduli kataloogiootused pärinevad vastuvõetud lähtekoodist ja isoleeritud
PostgreSQL-i koostest. Eelmine teenuste raport ei tõenda tööde tänast kataloogi.
Maci jooks vajab värsket täpset eelseisu. Uuendaja asendab ühes kaitstud
tehingus kaks keha, kontrollib järelseisu, ootab COMMIT-järgset kinnitust
ning käivitab eraldi verify. Päris kasutajaandmeid ei ekspordita.

Kui kirjutuse kinnitus kaob, võib järelseisu kontrollida ainult lugemisega.
Isegi täpne järelseis ei anna selles uues paketis automaatset commit/push'i
luba ilma algse rakendamise kinnituseta. Uuendaja peatub, säilitab etapid
raportis ja ei korda SQL kirjutust. See rangem piir kehtib uuele paketile;
varem väljastatud pakke ei muudeta.

## Ettevalmistuse kontrollid ja tõendi piir

12/12 uut sihitud kliendikontrolli läbisid muutmata API-de/parseritega; 25 lähte-/lukufaili pinni säilisid. Lisaks läbis 6 päris hook’i juhitud kontrolli: vaataja/profiili vahetus, katkestus, vana edu/vea peitmine ja pooleliolev kursorileht. Hook’i katse pole React DOM ega brauser. Värske native PostgreSQL-i 22 vastusest läbis 20 päris parsingu ja 2 olid korrektsed null-detailid; 4 eraldi vigase konteksti/vastuse kontrolli lükati tagasi. Esimese katse otse sisestatud mittekanooniline sünteetiline palgasumma parandati tegeliku normaliseerija järgi; algne katse säilib. Portaali koodi, parsereid ega sõltuvusi selleks ei muudetud.

60/60 native PostgreSQL 17.6 kontrolli läbisid parandatud sünteetiliste sisenditega: kanooniline era-/ettevõtte omanik, puuduv või piiratud konto/Auth, detail, profiili null-ümbris, otsing, filtrid, kursorid, blokeerimine/peitmine, aegumine, õigused ja kataloogitriiv. Tegelik kaitstud apply, COMMIT-järgne kviitung ning eraldi verify läbisid; katkine tehing ja vale eelseis peatusid. 19 sünteetilise relatsiooni sõrmejälg säilis ja klaster peatati. Kõik 180 sisendit säilisid katse ajal; kaks genereeritud metaandmefaili finaliseeriti hiljem ning käiguaegsed koopiad on alles. Maci live-kataloog vajab eraldi värsket vastavust.

33 vana/uue võrdlusjuhtu, 198 ajastatud RPC-kutset ja 75 eraldi valitud päringuplaani. Katses kasvas 24 tööd 500 sobiva tööni ning lisati 5000 kõrvalist kontot/tööd, sh 2500 ettevõtet. Ühe kliendi muutumatutel katseandmetel olid kõik vastuseväljad võrdsed peale iga päringu read_at aja; see ei olnud üks jagatud MVCC snapshot. 5500 tööga filtrita otsing tegi 25 konto kontrolli (mediaan 13.41 → 15.57 ms), filtreeritud otsing 500 (31.21 → 79.99 ms) ja 200 tööga profiil 201 (19.75 → 36.00 ms); profiili limit=1 tegi samuti 201 kontrolli. Konto/Auth ning ettevõtte omaniku lugemine kasutas PK-indekseid. Filtrita otsing kasutas avaldamise kursoriindeksit; filtreeritud/profiili kandidaatide töö vajab eraldi optimeerimist. Kolm kordust, üks klient ja sünteetiline andmestik ei kinnita Productioni latentsust, RPC eelarvet ega samaaegset suurt mahtu. Varasem teenuste mahu piir säilib.

Üks uus täielik Next.js 16.4.6 / TypeScript 5.9.3 build läbis 34.77 sekundiga eraldi tühja build-kaustaga. Kõik 765 sisendit säilisid; valmis tööotsingu, töö üksikvaate ja avaliku profiili väljundid. Kasutati lukufaili täpseid olemasolevaid sõltuvusi ja inertseid lokaalseid seadeid. Maci build ning Verceli avaldamine on järgmised eraldi tõendid.

29/29 uut uuendaja kontrolljuhtu läbisid 36.672 sekundiga; 46 külmutatud sisendit säilisid. Päris ajutine Git-hoidla/bare-remote ning piiratud oma alamprotsessid kontrollisid järjestust ja peatumist. Runtime-proov, CLI, SQL- ja build-vastused olid selles runneri katses sünteetilised. Seitse jagatud helperit jäid baiditäpseks. Kadunud SQL kinnituse järel tuvastatud järelseis ei luba commit/push’i ega automaatset korduskirjutust.

Üks selle versiooni kohaliku Chromiumi käivituskatse peatus enne lehe loomist: socket() failed: Operation not permitted. Brauseriväiteid 0; päris kontosid ei kasutatud. Käivitust ei korratud lisalippude või teise ligipääsuteega. Tegelik veebikontroll jääb pärast sama uue commit’i Ready / Production tulemust kasutaja Macis teha.

## Kontoelutsükkel ja mahu piir

See moodul lisab lugemiskontrolli, mitte konto sulgemise või kustutamise
kasutusvoogu. Otseõigused, kirjutused, kontakt, säilivad vestlused ja
meedia/Storage'i kättesaadavus vajavad kontoelutsükli tervikus eraldi lõpetamist.
Olemasolevad kontod ja sisu säilivad; kahe identiteediga vana konto ei tekita
uue kasutaja registreerimisse uut mitme identiteedi mudelit.

Tööde mõõtmine eristab tulemuse piiri tegelikult hinnatud kandidaatide arvust.
`limit=24` ei tõenda iseenesest, et SQL hindab ainult 24 kontot. Päris
helperikutsete loendurid, seotud plaanid ning sünteetiliste andmete suurused
on kontrollitõendis. Kolm kordust eraldatud arvutis ei tõenda tootmiskeskkonna
latentsust, samaaegsuse taluvust ega kümne miljoni kasutaja valmidust.

Eelmise teenuste mooduli teadaolev mahu piir säilib: 5500 sünteetilise teenuse
filtrita otsingu mediaan kasvas selles katses ligikaudu 567 ms pealt 1105 ms
peale. See oli teenuste eraldi mõõtmine, mitte tööotsingu tulemus. Kandidaatide
ja omanike korduva kontrolli optimeerimine vajab eraldi põhjendatud tööd.

Pärast sama uue commit'i Ready / Production tulemust kontrollib kasutaja
olemasoleva tööpakkumise otsingut, üksikvaadet ja profiili tööde loendit.
Järgmine käsk ning täpse raporti juhis on `docs/continuity/HOSTED_PORTAL.md`-s.
SMTP paus ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.
