# ASUKOHT-1: kohanimede soovituste allikas ja kasutuselevõtt

Seis: 27.11.2026, Europe/Tallinn. Geoapify serveriadapter on ASUKOHT-1
koodis ette valmistatud ja piiratud transpordiasendustega kontrollitud.
Teenusekontot, API-võtit, tasulist paketti ega tootmise ühendust pole loodud
või muudetud. Kohanimede tegelikku katvust ei ole võtmega kontrollitud.
Teostusleping: [profile-location-v1-20261127.md](profile-location-v1-20261127.md).

## Valitud allikas

Uus ühine kohavalik kasutab Geoapify Address Autocomplete'i serveripoolse
adapteri kaudu. Riikide valik tuleb Selqiro versioonitud riikide loendist;
kohanimede soovitused tulevad ainult valitud riigist. Pakkuja valik jääb
adapteri taha, et salvestatud Selqiro kohakirje ei sõltuks ühe teenuse
toorvastuse kujust.

Geoapify ametlik API toetab riigi ranget filtrit `filter=countrycode:ee`,
kohataseme valikut ja keeleparameetrit. Vastuses on riigikood, tulemuse liik,
nimi ja koordinaadid. `bias` muudab eelistust, `filter` piirab tulemusi;
Selqiro riigipiir vajab viimast. [1]

Teenuse ametlik tooteleht lubab tulemuste ja soovituste salvestamist ning
vahemällu panemist. See sobib profiili püsiva põhiasukoha ja hilisema
pakkumise asukohakoopia jaoks. [2]

27.11.2026 hinnaleht näitab tasuta paketis 3000 krediiti päevas ja kuni
5 päringut sekundis; tasuta pakett on mahupiiride ja nõutud viidetega
lubatud ka kommertstootmises. Üks autocomplete-päring maksab ühe krediidi.
See on alustamise võimalus, mitte prognoos Selqiro tegeliku kasutusmahu kohta. [2, 3]

Tasuta paketis peab kasutajaliideses olema Geoapify viide; andmeallika viited,
sh OpenStreetMap, säilivad samuti. Tingimused jätavad ülempiiride ületamisel
teenusepiirangu või lisatasu võimaluse. Seetõttu peab rakendus ise mahud
piirama, mitte käsitlema tasuta plaani piiramatuna. Kontot pole tellitud. [4]

## Miks senist avalikku teenust ei jätkata samal kujul?

V1/V2 auditis leitud tee kasutab avalikku `nominatim.openstreetmap.org`
teenust. Selle ametlik kasutuspoliitika keelab automaatsed soovitused
kirjutamise ajal ja seab kogu rakendusele ühe päringu sekundis piiri.
Poliitika käib selle avaliku serveri, mitte kõigi Nominatimi paigalduste
kohta. Seetõttu ei sobi senise tee lihtsalt avamine kõikidele riikidele
kokkulepitud typeahead'i aluseks. [5]

## Selqiro teostuspiirid

Need on ette valmistatud teostuse piirid. Kohalikud tõendid ja päris
kasutuselevõtu vastuvõtt on allpool eristatud.

1. **Kinnitatud valik.** Kirjutatud tekst on otsingusisend. Salvestatavaks
   kohaks saab loetelust valitud ja serveris kontrollitud kirje. Riigi
   muutmine tühistab varasema selle riigiga sobimatu koha.
2. **Riik mõlemal poolel.** Päring kasutab ranget riigifiltrit; server
   kontrollib ka vastuse riigikoodi. Brauseri saadetud koordinaadid,
   kohanimi või riigikood üksi ei kinnita lubatud salvestust.
3. **Asula või piirkond.** Esimeses ühises valikus kasutatakse ainult
   kokkulepitud ligikaudseid kohatüüpe. Hoone, tänava või vabateksti
   täpset punkti ei salvestata eraisiku ligikaudse koha pähe.
   Ettevõtte uus täpne geokodeeritud punkt jääb hilisemaks. Senine
   vabatahtlik aadressitekst ja selle teadlik avaldamine säilivad.
4. **Püsiv sisemine kuju.** Versioonitud API lepingu kinnitatud kirjes on riigikood,
   kuvamisnimi, piirkonna eristus, kohatüüp, lubatud täpsus, punkt ning
   allika nimi ja allika identifikaator. Allika identifikaator on läbipaistmatu
   viide; see ei anna õigust profiili muuta. Null-laius või null-pikkus
   on lubatud arvväärtus, mitte puuduva koha tunnus.
5. **Profiili kirjutus.** Uus leping kontrollib tegelikku omanikku,
   aktiivset kontot, aktiivset profiili ja eeldatud revisjoni. Olemasolevas
   profiili `lock_owner` funktsiooni vastu võetud lähtekujus puudus aktiivse
   konto kontroll; uus v2 ümbris lisab selle oma lugemis- ja kirjutusteedele
   vana v1 lepingut ümber kirjutamata.
6. **Piiratud päringud.** Rakendus ootab kirjutamispausi, tühistab aegunud
   päringud ja kuvab vaid viimase päringu vastuse. Rakenduse ühine kvoot,
   kasutaja piirang kaitsevad teenuse mahtu. ASUKOHT-1 ei lisa jagatud
   kohapäringute vahemälu. Kohalik
   riigiloend ei kuluta geokodeerimise päringuid.
7. **Mitmekeelsus.** Kohateksti ei normaliseerita ainult ASCII-tähtedeks.
   Riigiloend toetab kuvamiskeelt ja nimetuste aliasi. Jaapani jm IME
   sisestuse ajal ei saadeta poolikuid koostepäringuid. Sama nimega kohad
   eristuvad piirkonna ja riigi järgi.
8. **Vea korral aus olek.** Võtme puudumine, kvoodi lõpp või pakkuja viga
   annab selge teate. Tulemuse riiki ei laiendata, geokodeerijat ei vahetata
   salaja ja vabatekstist ei tekitata väljamõeldud punkti. Olemasolev
   salvestatud koht jääb alles.
9. **Andmete ulatus.** Teenusele läheb kohanimede päring, mitte profiili
   isikuandmed või kogu vorm. Võtit hoitakse serveri seadistuses;
   diagnostikaraportisse ega vestlusse seda ei lisata. Toorvastust ei
   salvestata profiili andmeväljade asendajana.

## Ettevalmistuse tõend ja veel vajalik vastuvõtt

Metaandmete raport on vastu võetud. Versioonitud profiilileping, serveri
adapter ja kliendi ühine kohavalija on valmis ülevaadatud lähtekoodina.
70 sihitud testi, range TypeScript, värske Next build, 23 PostgreSQL native
juhtumit ja 6 kinnituse parserirühma läbisid. Riigi, kasutaja, revisjoni,
nullkoordinaadi, Unicode'i, aegumise ja hilinenud päringute piirid on
kontrollitud sünteetiliste sisenditega.

Päris brauserikatseid on 0: selle keskkonna Chromiumi binaar puudub.
Renderdatud märgistuse kontroll ei tõenda fookuse, klaviatuuri või IME
tegelikku brauserikäitumist. Geoapify päris vastuseid pole küsitud.

Kasutuselevõtul tuleb seadistada serveri `GEOAPIFY_API_KEY`, käivitada
uus ASUKOHT-1 uuendaja, saata uus raport ning kontrollida sama commiti
Ready / Production. Seejärel proovida Eesti/Paide, Soome/Helsingi,
Jaapan/Tokyo ja 東京; salvestamist ja lehe värskendamist; riigi muutmist
poolelioleva valiku ajal ning ettevõtte vana aadressi eemaldamist asulavahetusel.
Juhend: [profiili asukohavaliku kasutuselevõtt](../continuity/PROFILE_LOCATION_INSTALL_20261127.et.md).

ASUKOHT-2 uue pakkumise koopia, ASUKOHT-3 pakkumiste kaugusjärjestus ja
ASUKOHT-4 ajutine teenusekoht jäävad järjestikusteks järgmisteks etappideks.
Kohanimede pakkuja ei otsi Selqiro kuulutusi; hilisem kaugusotsing toimub
Selqiro andmetest valitud riigi sees.

## Ametlikud allikad

Loetud 27.11.2026. Viited tõendavad siin nimetatud API võimalusi ja
paketi tingimusi, mitte Selqiro integratsiooni toimimist.

1. [Geoapify Address Autocomplete API dokumentatsioon](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/)
2. [Geoapify autocomplete: salvestamine ja päringu hind](https://www.geoapify.com/address-autocomplete/)
3. [Geoapify hinnad](https://www.geoapify.com/pricing/)
4. [Geoapify tingimused ja viited](https://www.geoapify.com/terms-and-conditions/)
5. [Avaliku Nominatimi kasutuspoliitika](https://operations.osmfoundation.org/policies/nominatim/)
