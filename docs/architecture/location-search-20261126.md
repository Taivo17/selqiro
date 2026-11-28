> **27.11.2026: ajalooline audit, osaliselt asendatud.** Praegune tooteleping on
> `location-country-20261127.md`: valitud riik on range piir, ülemaailmne
> laienemine jääb hilisemaks ning vanade pakkumiste asukohti ei täideta.
> Allpool säiliv 26.11 tekst kirjeldab varasemat ettepanekut ja koodiauditit;
> selle vanu rakendussamme ei kasutata tänaste käskudena.

# Ühine asukohaotsing: valitud keskpunktist lähimad enne

26.11.2026, Europe/Tallinn. **Kasutaja kinnitatud põhisuund ja lähtekoodi audit;
geograafilise otsingu teostus ei ole selles pakis.** Üksikasjalikud koodiviited
ning kontrollitud failide räsid on kõrvalkaustas `location-search-20261126/`.
Audit põhineb vastu võetud commit'il `2b3407f`, mitte uuel tootmise vaatlusel.

## Soovitud kasutus

Kasutaja valib Paide, Tokyo või muu koha. Valitud punkt on otsingu keskpunkt.
Kõigepealt leitakse sellele lähimad sobivad avalikud pakkumised. Järgmised
lehed jätkavad järgmiste lähimatega. Linnapiiri ületamine või teise riiki
jõudmine ei katkesta otsingut, kui kasutaja pole ise määranud riiki või
maksimumkaugust. Keskpunkti valik ei muuda profiili aadressi ega kasutajaliidese keelt.

Otsing ei vaja nähtamatut 5/10/25/50 km hüpete jada: üks serveri kaugusjärjestus
annab sama laieneva otsingu tulemuse. Kategooria, märksõna, töökoha/tööotsa
valik ja nähtavuse tingimused rakenduvad enne järjestamist ning lehekülgi.
Esile tõstmine ei tohi vaikimisi „Lähimad enne” järjekorda salaja ümber teha.

## Mida V1-st tegelikult leidsime

V1 `get_marketplace_listings_nearby` arvutab valitud punktist sfäärilise
kauguse, järjestab pakkumised selle järgi ning tagastab 30 kaupa. Fikseeritud
raadiust ega riigi/linnapiiri selles SQL-is pole. Idee vastab kasutaja mälule.

Terve V1 kasutustee vajab siiski parandamist. Linnanime geokodeerimine kasutab
vaikimisi profiili riiki või Eestit. Ebaõnnestumisel kasutatakse vaikselt
profiili koordinaate, kuigi silt võib jääda Tokyo. Brauser tõstab sama
linnanimelised tulemused kauguse järgi lähimatest ette. Osa märksõna-, hinna-
ja kategooriafiltreid rakendub alles pärast lehe laadimist. Jaapani kirjamärgid
kaovad asukohavaliku normaliseerimisel ning nullkoordinaatide tõeväärtuskontrollid
käsitlevad ekvaatorit või nullmeridiaani valesti. Neid osi ei kopeerita V2-sse.

Peamised tõendid: `supabase/repairs/20261113_provider_controls/10_legacy_search.sql`,
`src/entities/listing/api/legacyDiscoveryMarketplace.ts`, `app/page.tsx`,
`app/components/LocationAutocomplete.tsx` ja kaks `app/api/location/` päringuteed.

## V2 tänane lähtekoht

| Rubriik | Tänane otsing | Puuduv asukoha alus |
| --- | --- | --- |
| Tavakuulutused | Linna/riigi tekstivaste, uuemad enne | Uus managed avaldamine saadab koordinaadid NULL; SQL keelab praegu mitte-NULL väärtuse |
| Teenused | Linna/riigi täpne vaste, uuemad enne | Loomine ei salvesta punkti; muutmisel säilib vana punkt isegi siis, kui asukohatekst muutub; teenindusala puudub |
| Töökohad ja tööotsad | Linna/riigi täpne vaste, uuemad enne | Tabelis ja sisulepingus puudub geograafiline punkt |
| Hobusepakkumised ühises turuotsingus | Senine EE turu ulatus | Valitud koha koordinaate ei säilitata avalikus otsingulepingus; täpsed erakoordinaadid on kaitstud |

Praeguse lehe brauseris kauguse järgi sortimine ei leia tervest andmestikust
lähimaid. Uus ühine keskpunkt ei muuda hobuste senist avaldamisturu piirangut.
Asukoha võimekus ja turu/avalikustamise lubatavus on erinevad tingimused.

## Üks arusaadav valik kõigis kolmes otsingus

Põhiväli on „Kust otsid?” koos kinnitatud kohavalikuga, näiteks
„Paide, Järvamaa, Eesti” või „Tokyo, Jaapan”. Sama nimega kohad eristatakse
riigi ja piirkonna abil. Valitud koha kirje sisaldab kontrollitud punkti,
riiki, piirkonda, allikat, püsivat kohatunnust ja täpsust. Vabateksti ei esitata
edukalt valitud keskusena enne koha kinnitamist. Tõrge jätab senise valiku
nähtavalt alles või palub uut valikut; teise punkti juurde vaikselt ei minda.

„Kasuta minu asukohta” on kasutaja käivitatav mugavus. Käsitsi valimine
töötab ka seadme asukoha loata. Valik säilib rubriikide vahetamisel ning
tagasi otsingusse naasmisel; taustal muutuv GPS ei järjestaks loetavat lehte
ümber. Täpne seadme asukoht ei lähe automaatselt jagatava URL-i või avalikku logisse.

Valitud keskpunkti korral on järjestus „Lähimad enne”. Kaardil võib olla
„Umbes 12 km Paide keskpunktist”; käsitsi Tokyot valinud Paide kasutajale ei
kirjutata eksitavalt „12 km sinust”. Linnataseme punkt annab ligikaudse kauguse.
„Kuni 25 km” on eraldi teadlik range filter, millest otsing automaatselt ei välju.
Ilma keskpunktita võib kasutada senist kuupäevajärjestust, kuid seda ei nimetata lähedusotsinguks.

## Pakkumise asukoht tähendab eri rubriikides erinevat asja

| Vajadus | Asukoht, mille järgi sobivust otsida | Täiendav tähendus |
| --- | --- | --- |
| Jalgratas lähedal | Kauba tegelik kättesaamise koht või avalik ligikaudne piirkond | Müüja profiili kodulinn ei pruugi olla kauba asukoht |
| Töökoht lähedal | Tegelik töö tegemise koht | Kaugtöö on eraldi valik; ettevõtte peakontor ei anna töö kaugust |
| Aia parandamise või lumekoristuse tööots | Koht, kus töö tuleb teha | Töö tegemise aeg ei ole kuulutuse kehtivuse lõpp |
| Puksiir või lumekoristusteenus | Kas pakkuja teenindab valitud kohta | Kontori lähedus ei tõenda teenindusala ega vaba masinat |
| Veotellimus | Pealevõtmise koht, hiljem eraldi sihtkoht | Kaks marsruudi otsa ei mahu ühe „linn” välja tähendusse |

Teenuse jaoks tuleb eristada kliendi juurde tulemist, teenust pakkuja juures
ja kaugteenust. Kliendi juurde tuleval pakkujal on teadlikult määratud
teeninduspiirkond. Sobiv teenindusala kontrollitakse enne pakkujate järjestamist.
Kui see on määramata, näidatakse seda ausalt ega lubata, et teenus katab valitud koha.

„Täna saadaval” või „24 h” on eraldi ajakohane pakkuja väide koos kehtivusega.
Kuulutuse olemasolu ei tõenda vaba puksiiri, kohe väljasõitu ega lume lükkamise
võimalust samal hommikul. Nende kiirfiltrite andmed lisatakse siis, kui nende
salvestamine ja aegumine on olemas. Esimeses geograafilises versioonis piisab
teenindusala ning ligikaudse asukoha selgest esitamisest.

## Täpsus, privaatsus ja ülemaailmne korrektsus

Eraisiku avalik punkt on vaikimisi linna või piirkonna ligikaudne keskpunkt.
Ettevõte võib avaldada oma tegevuskoha täpse aadressi. Otsing ja avalik
kaugus arvutatakse avalikust punktist. Salajase kodukoordinaadi järgi
järjestamine koos lihtsalt ümardatud kaugusega ei ole piisav privaatsuspiir:
korduvad otsingupunktid võivad asukohta kitsendada.

Puuduv asukoht ei ole `(0,0)`. Üheselt määratav vana linn+riik võib saada
ligikaudse kohapunkti, koos päritolu ja tuletatud täpsuse märgisega. Mitmetähenduslik
koht vajab omaniku kinnitust. Vana teenuse mitte-NULL koordinaati ei loeta
värskeks, kui asukohateksti on vahepeal muudetud. Asukoha muutmine uuendab või
tühistab vana tuletatud punkti. Määramata asukohaga pakkumised peavad olema
leitavad eraldi selgelt märgistatud vaates; neile ei leiutata kaugust.

Vahemaa on esialgu ligikaudne geograafiline kaugus. Teisel pool lahte või
piiri asuv pakkuja võib maanteed mööda olla palju kaugemal. Sõiduaega ja
marsruudikaugust ei tuletata sirgjoonelisest kaugusest. Jaapani kirjamärgid,
nullmeridiaan, ekvaator, kuupäevaraja ületamine ja võrdsed kaugused kuuluvad
sihtkontrollidesse. Kasutaja määratud riigifilter jääb eraldi rangeks piiriks.

## Teenusepakkuja ja andmebaasi tehniline piir

Vana kood kasutab avalikku Nominatimi otsingut. OSMF avaliku teenuse poliitika
keelab kliendi automaatse kohasoovitamise/autocomplete'i selle teenuse peal,
piirab kogu rakenduse kasutuse maksimaalselt ühele päringule sekundis ning
nõuab muu hulgas tuvastatavat päringut ja omistust. Seetõttu ei saa vana
350 ms soovituste voogu muutmata üle võtta. Valida tuleb kohaotsingu pakkuja
ja režiim, mis lubab kavandatud kasutust, koos serveri vahemälu, päringupiiri,
ajalõpu ja vahetatava adapteriga. Käesolev pakett ei telli tasulist teenust.

Serveri ruumiindeks ja lähima naabri päring sobivad üldpõhimõtteks. Tegelik
PostGIS-i olemasolu ja hostitud indeksite seis tuleb enne migratsiooni
piiratud ainult lugemisega kontrollida. Geograafilise meetermõõdu ja
indeksi kaugusdefinitsioon peavad ühtima. Uus kursor peab olema seotud
keskpunkti, filtrite ja nähtavuse kontekstiga ning sisaldama stabiilset
viigimurdjat. Praegust kuupäevakursorit ei saa kaugusotsingus muutmata kasutada.

## Rakendamise järjekord

1. Kinnitada asukoha avaliku täpsuse ja keskpunkti andmeleping ning võtta
   piiratud kataloogi/andmete valmisoleku raport: ruumivõimekus, puuduvad ja
   mitmetähenduslikud kohad, vanade punktide päritolu. Isiklikke aadresse ei ekspordita.
2. Lisada avaliku otsingukoha salvestus ja omaniku muutmisteed. Teenuste ja
   hobuste avaldamise sisuhetktõmmiseid ei muudeta nii, et senine avalik sisu
   muutuks kehtetuks. Kõrvaltabel koos lähterevisjoniga on üks hinnatav lahendus.
3. Ühendada kohavalik aktiivsetesse kuulutuste, teenuste ja tööde avaldamis-
   ning muutmisvaadetesse. Täita vanad kirjed ainult üheselt määratava ligikaudse kohaga.
4. Lisada serveri lähimad-enne otsingud koos konto-, aegumise-, blokeerimise-,
   peitmise- ja avaldamise lõppkinnituse kontrollidega. Teenuste puhul lisada teenindusala sobivus.
5. Ühendada sama keskpunkt kolme otsingulehe, URL-i ja tagasiliikumisega.
   Kontrollida Paidet ja Tokyot, tühja linnasisest tulemust, mitut lehekülge,
   rangeid kauguspiire ning privaatsuse ja konto kättesaadavuse säilimist.

## Välised tehnilised allikad, kontrollitud 26.11.2026

- OSMF Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
- PostGIS nearest-neighbour index search: https://postgis.net/workshops/postgis-intro/knn.html
- PostGIS ST_Distance, geography ja meetrid: https://postgis.net/docs/ST_Distance.html
- MDN Geolocation API, turvaline ühendus ja kasutaja luba: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
