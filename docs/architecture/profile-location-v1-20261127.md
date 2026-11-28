# ASUKOHT-1 — profiili kinnitatud põhiasukoht

Seis: 27.11.2026, Europe/Tallinn. Teostus on ette valmistatud eraldatud
lähtepuus. See dokument ei kinnita Maci paigaldust, uut Git-commiti,
Verceli juurutust ega päris Geoapify päringu tulemust.

## Alus ja tööjärg

Alus on vastu võetud `7c53643012545c7dfa99ba976e6f2613e3c3a201`, puu
`98444c7d31e7afac995f195d884700b60c82b6cf`: 2443 faili. 27.11 kasutaja
asukoha aluse raport (310390 baiti; SHA-256
`cc884c36ae31b5217b69c45e0810f28d5791572f462152225cf67d6fd11c5938`)
läbis 582 sõltumatut kooskõlakontrolli. Vastuvõtt ja tõendite piir on
`location-foundation-accepted-20261127/REVIEW.md` failis. Raport kinnitab
skeemi ja senise lähtepuu säilimist; `implementation_ready=false` ei
muutu metaandmete vastuvõtmise tõttu automaatselt tõeks.

| Etapp | Ulatus | Seis |
| --- | --- | --- |
| ASUKOHT-1 | Ühine riigi/asula valik ja profiili põhiasukoht | Käesolev teostus; paigaldus ja päris kasutustee ootel |
| ASUKOHT-2 | Põhiasukoha ühekordne eeltäide uue pakkumise loomisel, pakkumise oma valik | Järgmine pärast esimese etapi vastuvõttu |
| ASUKOHT-3 | Valitud riigi sees keskpunktist lähimad pakkumised enne | Järjekorras |
| ASUKOHT-4 | Teenuse käsitsi ajutine koht koos alguse/lõpuga | Järjekorras |

Konto sulgemine, taastamine ja lõppkustutus ning Uudiste koondamine on
säilinud tööjärjes. Selle muudatusega ei aktiveerita konto kustutamist.

## Kasutaja teekond

Profiili muutmise vaates on trükitav riigivalik ja selle riigi asula või
piirkonna soovitused. Riike otsitakse kohalikust 249 ISO identiteediga
loendist; aliased sisaldavad 22 keele nimekujusid. Näiteks Soome, Suomi
ja Finland tähistavad sama `FI` koodi. See loend ei luba, et iga riigi
iga asula on kohateenuse andmetes olemas, ega ava uut hobuste turgu.

Kohanimede päring algab vähemalt kahest märgist pärast 400 ms kirjutamispausi.
IME koostamise ajal päringut ei saadeta. Riigi, päringu, keele või aktiivse
profiili muutumine tühistab eelmise päringu tulemuse kasutamise. Valida
saab hiire või klaviatuuriga. Sama nimega kohad eristuvad piirkonna ja riigi järgi.

Kirjutatud kohanimi üksi ei ole kinnitatud punkt. Kasutaja valib soovituse
ja salvestab kogu profiilivormi ühe olemasoleva salvestamisnupuga.
Pooleliolev valik annab selge veateate. Valiku saab eemaldada või taastada
salvestatud asukoha. Eemaldamine jõuab andmebaasi alles vormi salvestamisel.

Vana tekstiline riik/linn säilib tavalisel nime või tutvustuse muutmisel.
Seda ei geokodeerita automaatselt. Uue kinnitatud punkti saab kasutaja
teadliku kohavalikuga. Profiili salvestus ei muuda ühtegi olemasolevat
kuulutust, teenust ega tööpakkumist.

Eraisiku valik salvestab asula või piirkonna punkti. Täpseid tänava- või
hoonepunkte ei pakuta eraisiku ligikaudse kohana. Ettevõttele säilib senine
vabatahtlik aadressitekst ja avaldamise nähtavusvalik. See tekst ei ole
selles etapis kontrollitud täpne koordinaat. Ettevõtte asula vahetamisel
tühjendatakse senine aadress ja täpne nähtavus muutub linnatasemeks,
et vana tänavaaadress ei jääks uue linna juurde. Kasutajale kuvatakse põhjus.

## Andme- ja salvestusleping

Kinnitatud kohakirjel on täpselt kümme välja: `country_code`, `country_name`,
`place_name`, `region_name`, `latitude`, `longitude`, `precision`, `source`,
`source_id`, `source_kind`. Versioon on RPC ja skeemi nimes. Riigikood on
ülemises registris ISO kahetäheline kood. `city` tähendab `locality`
täpsust; `county` ja `state` tähendavad `region` täpsust. Null-laius ja
null-pikkus on lubatud arvväärtused; puuduvat punkti ei asendata `(0,0)`-ga.

Profiili vana seitsme tekstivälja leping ning kaheksa vana profiilifunktsiooni
jäävad muutmata. Uus lugemine tagastab `{profile, location}`. Uus salvestamine
ühendab sama profiilirevisjoni all tekstiväljad ja asukoha käsu:

| Käsk | Tulemus |
| --- | --- |
| `keep` | Senised riik/linn ja kinnitatud punkt säilivad; kohateksti ümbernimetamist ei lubata |
| `select` | Serveris kinnitatud ühekordne valik salvestatakse koos sama koha tekstiga |
| `clear` | Riik, linn ja kinnitatud punkt eemaldatakse teadlikult |

Kohakirjed ja lühiajalised valikud asuvad uues privaatses skeemis
`profile_location_private`. Asukohavalik ei kirjuta vanadesse avalikesse
`lat/lng` veergudesse. Trigger eemaldab uue punkti, kui mõni vana lubatud
kirjutustee muudab profiili riiki või linna. Nime, tutvustuse või foto
muutmine ei kustuta sama asula punkti. PostGIS-i selles etapis ei paigaldata.

Uued profiili lugemise ja salvestamise RPC-d kontrollivad autentitud
kasutajat, konto kättesaadavust, valitud aktiivset profiili ning tegelikku
omanikku. Lugemine tagastab profiili revisjoni; salvestamine kontrollib
eeldatud revisjoni vastavust. Ettevõttel kontrollitakse ka ettevõtte ja
omaniku liikmesuse aktiivsust. Erinevate kontode andmeid ei saa käsku
lisatud identiteedi abil valida. Vana konto kustutamise terviktöö ei ole
sellega lõpetatud.

## Serveri kohateenus

`POST /api/v2/profile-location/suggest` kasutab Geoapify Address Autocomplete'i.
Päringus on range `filter=countrycode:...`, `type=locality`, keel ja piiratud
tulemuste arv. Vastusest võetakse vastu ainult valitud riigi `city`,
`county` või `state`. Postiindeksi, linnaosa, tänava ja hoone vastus ei
muutu asula punktiks. Toorvastust, tänavaaadressi, IP-aadressi ega
profiilivormi sisu ei talletata otsinguajalukku.

Pakkujale saadetakse kohatekst, riigifilter ja keel; profiili kasutaja-ID,
profiili-ID ega isiku tutvustust ei saadeta. API-võti on ainult serveri
keskkonnas `GEOAPIFY_API_KEY`. Vastused on `private, no-store` ning vead
on piiratud veakoodid. Avaliku Nominatimi varuteed ei kasutata.

Soovitusega antakse 30 minuti pikkune allkirjastatud valikutõend, mis on
seotud kasutaja, aktiivse profiili, rakenduse ja Supabase projektiga.
Brauseri koordinaate ei usaldata salvestusõigusena. Põhivormi salvestamisel
kontrollib server tõendit, registreerib 15 minuti pikkuse ühekordse valiku
ainult serveri õigusega RPC kaudu ning annab autentitud salvestusse selle
UUID. SQL kontrollib omanikku ja revisjoni uuesti ning kasutab valiku ära
samas tehingus, kus profiil salvestatakse.

Rakenduse ühine piir on kuni 3000 kohapäringu reserveeringut jooksva
24 tunni jooksul ja vähemalt 250 ms vahet ühiste reserveeringute vahel.
Ühe kasutaja piir on 60 tunnis. Reserveering arvestatakse enne välispäringut
ning tõrge seda automaatselt tagasi ei anna. See piir kehtib ainult selle
Selqiro tee kohta: muudes rakendustes sama võtmega tehtud päringuid see
ei arvesta. Kasuta Selqiro jaoks eraldi võtit/projekti.

Puuduv võti või teenuse tõrge jätab kohasoovitused kättesaamatuks;
olemasoleva asukoha säilitamine ja profiili muude väljade muutmine ei vaja
uut välispäringut. Ükski salvestus ei kordu automaatselt. Ebaselge vastuse
järel võrreldakse värskelt loetud revisjoni, tekstivälju ja kohaandmeid;
hilinenud teise profiili vastust ei võeta omaks.

## Kasutuselevõtt ja vastuvõtt

Juhend on `docs/continuity/PROFILE_LOCATION_INSTALL_20261127.et.md`.
Uuendaja kontrollib täpset lähtealust, tööpuud/indeksit, sõltuvusi,
varasemaid raporteid ja CLI-d. See käivitab sihitud testid ning värske
build'i, loeb andmebaasi eelseisu ja rakendab ühe kinnitatud SQL-i.
Tulemus peab sisaldama COMMIT-i järgset kinnitust ja läbima eraldi
lugemiskontrolli enne commit/push'i. Katkenud või ebaselget SQL-kirjutust
ei korrata. Vana migratsioonide jada ega vana uuendajat ei taasesitata.

Kohalik ettevalmistus kontrollib sünteetilisi andmeid ja päris rakenduskoodi.
Päris Geoapify päringu katvus ning kasutaja Maci ja tootmise teekond tuleb
kinnitada uue raporti ja sama uue commiti kasutuskontrolliga. Lõplikud
testide logid ja sisendräsid on uuenduspaketi `evidence/` kaustas; SQL-i
native tõend ning sõltumatu ülevaatus on `proof/sql/` kaustas.

ASUKOHT-1 lõpetamise tingimus on toimiv valik ja salvestamine pärast
värskendamist nii eraisiku kui ettevõtte profiilis, korrektne riigivahetus,
vana teksti säilimine ning asukoha eemaldamine/taastamine. Siis jätkub
ASUKOHT-2 uute pakkumiste eeltäitega. Kaugusotsingu olemasolu ei järeldu
veel profiili kohavaliku toimimisest.

## Ametlikud allikad

Loetud 27.11.2026; need kirjeldavad teenuse lepingut, mitte meie tootmise testi.

- [Geoapify Address Autocomplete API](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/)
- [Geoapify hinnad ja nõutud viited](https://www.geoapify.com/pricing/)
- [Verceli keskkonnamuutujate haldamine](https://vercel.com/docs/environment-variables/managing-environment-variables)
- Riigiandmete päritolu ja litsentsid: `docs/third-party/location-country-data/README.md`.
