> **Hilisem kasutaja kinnitus 31.10.2026:** telefoni kirjutusväli on ka
> kuulutusekaardiga klaviatuuri kohal nähtav ning varem liiga suur foto õnnestus
> arvutis lisada. Need tulemused on vastu võetud. Ühe telefonifoto avamise
> jätkutöö on `MESSAGING_PHONE_PHOTO_20261031.md`. Allolev tekst on varasema
> tarne ajalooline kirjeldus, selle paigaldust ega klaviatuurikontrolli ei korrata.

# Suurte sõnumifotode ja telefoni kirjutusvälja jätkuparandus — 31.10.2026

## Kasutaja kinnitatud olukord

Kasutaja kinnitab, et foto valimine ja saatmine töötavad nii arvutis kui telefonis.
Ka kuulutusekaart läheb tekstiga kaasa. Üle 5 MB foto jäi senise kliendipiiri taha.
Kompaktse kuulutusekaardiga mitmerealine kirjutusväli jäi telefonis ikka klaviatuuri
varju. Seetõttu ei loeta 30.10 sünteetilisi vaatekatseid tegeliku telefoni vea
lahendamise tõendiks.

Portaali avalikud failid sisaldasid 31.10 kontrollimisel eelmist viewport-hook'i
ja kompaktse kaardi CSS-i. See kinnitab avalikult pakutavat koodi kontrollimise
hetkel; eilse ekraanipildi ajal telefonis puhverdatud versiooni ei saa sellest
tuletada. Viimast tootmis-commit'i ei oletata.

## Foto automaatne vähendamine

JPEG-, PNG- ja WebP-algfail võib nüüd olla kuni 32 MiB ning 64 miljonit pikslit.
Kohalik päisekontroll piirab mõõtmed enne dekodeerimist; pikema külje ülempiir on
32 768 px, loetavate päisebaitide piir 1 MiB ja konteinerikirjete piir 8192.
Need on brauseri algfaili piirid, eraldi serveri ja vana fotolugemise piiridest.

Brauser küsib kuni 1600 px bitmap'i ning teeb maksimaalselt viis piiratud
kvaliteedi/mõõtmete kodeerimiskatset. Üleslaaditav WebP jääb kuni 1 400 000 baidi
piiresse. Olemasolev 2 000 000-baidi päringupiir ja serveri eraldi kontroll säilivad.
Seadmes olev algfoto jääb alles; võrku saadetakse ettevalmistatud koopia.

EXIF-i suund loetakse kohalikult ning rakendatakse canvas'es täpselt üks kord.
See väldib JPEG/PNG ja WebP erinevat orientatsioonikäitumist Chromiumis. Väljundis
ei ole algfaili EXIF-i ega XMP-d; canvas võib lisada standardse sRGB värviprofiili.
Katkestust kontrollitakse asünkroonsete sammude vahel ning bitmap/canvas vabastatakse.
Suurendatud sisendipiir ei tähenda piiramatut brauserimälu: dekoodri ajutisi
allikapuhvreid haldab brauser. Vigane või üle piiride fail saab selge veateate.

Üleslaadimise ebaselge tulemuse kordus kasutab sama ettevalmistatud faili, räsi
ja päringuvõtit; algpilti ei töödelda ega saadeta korduse tõttu uuesti.

## Telefoni paigutus

Vestluse marsruut kasutab `interactive-widget=resizes-content` viewport-seadistust.
Androidi Chrome saab seetõttu klaviatuuri ajal vähendada paigutuse enda kõrgust.
Seadistus on ainult vestluse marsruudis; suumimist ei piirata. Brauserid, mis seda
vihjet ei rakenda, kasutavad olemasolevat nähtava vaateala kõrguse/nihke käsitlust.

Kirjutusala paigutus jätab ruumi saatja reale ning teksti/saatmise reale. Manused
ja teadete piirkond saavad kokku tõmbuda ning enda sees kerida. Vestluse väline
ümbris ei ole enam toetatud brauseris varjatud kerimiskonteiner. Vaate mõõtmine
reageerib ka sisestusele, vormi mõõtmete muutusele ja lehele naasmisele.

Toetatud brauseris kasvab tekstiväli brauseri enda `field-sizing: content`
käitumisega. Ülejäänud brauseritele jääb mõõdetud JavaScripti varuvariant.
Kuulutusekaart, foto, saatja identiteet, Enter/Shift+Enter ja sõnumi kinnitused
kasutavad sama olemasolevat sõnumivoogu.

## Kontroll ja tõendi piir

Lõplikud kontrollid, lähteräsid ja failide täpsed tõendiviited on paketi
`review/verification.json` failis. Täpne lokaalne koondtulemus: **PASS**.

Pildi ettevalmistuse 37 kontrolli kasutavad päris Chromiumi dekoodrit ja
kodeerimist. Sama 23 008 191-baidi JPEG, mille vana kood tagasi lükkas, vähenes
818 642-baidiseks WebP-ks (1600 × 1200). Kontrolliti ka üle 5 MB PNG/WebP-d,
48 MP JPEG-d, 24 MP PNG-d, orientatsiooni, vigaseid sisendeid ja katkestusi.
Foto-hook'i kontrollid kasutavad päris Reacti voogu ning sünteetilisi
autentimise ja serveri vastuseid. Päris sõnumeid ega pilvefotosid ei saadetud.

Vana paigutuse konkreetne väljavool kordus väga madala nähtava ala, foto,
kuulutusekaardi ja kinnitamata saatmise teatega. Tavalise kõrgusega Androidi
klaviatuuri täpset kasutajaviga siin füüsilises seadmes ei korratud. Sünteetiline
vaateala ja native-klaviatuur on eraldi tõendid; paranduse lõplik kasutuskinnitus
tuleb pärast paigaldamist kasutaja telefonist.

Tootmisbuild, TypeScript ja muudetud failide ESLint on kontrollitud lõpliku
lähtekoodiga. Paigaldaja 22 kontrolli kasutavad tegelikke ajutisi Git-hoidlaid
ja kohalikku bare-remote'i, kuid paigaldajakatsete build on asendatud. Rakenduse
päris build on eraldi kontroll. Andmebaasi ja Storage'i varasemaid kontrolle
ei esitata selle lähtekoodiparanduse uue tulemusena.

## Paigaldamine ja järgnev samm

Paki `selqiro-sonumid-parandus-20261031.zip` Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-sonumid-parandus-20261031/uuenda.py" --publish
```

Uuendaja kasutab olemasolevat `/Users/taivo/selqiro` hoidlat. Enne kirjutamist
peavad sobima eelmise tarnitud telefoniparanduse täpsed lähteräsid, puhas main,
tuntud `cbd475757690db7bd1faf8784cd43359f45d5be9` eellane ja remote main == HEAD.
Tegelik hilisem baas salvestatakse uude päevikusse; tundmatut lähtekoodi ei aktsepteerita.

Algfailid varundatakse, build kontrollitakse ning commit ja tavaline push
sisaldavad ainult manifesti ulatust. Commit'i pealkiri:
`Fix chat viewport reflow and resize large photos`.

Päevik: `~/Library/Application Support/Selqiro/messages-mobile-20261031/<manifest-sha>/result.json`.
Vanu SQL-/Storage-/kontakti-/kaardipakette ei käivitata, vanu päevikuid ei muudeta.
`PEATATUD` korral on järgmine sisend selle rea tekst ja uus `result.json`.
`VALMIS` järel oodatakse sama commit'i Verceli **Ready** olekut.

Telefonis kontrollitakse üle 5 MB foto lisamist, kuulutusekaardiga mitmerealist
teksti, fotot ja kaarti koos ning klaviatuuri sulgemist/avamist. See uus tarne
ei märgi tootmisse rakendamist ega füüsilise telefoni tulemust ette tehtuks.

## Tehnilise käitumise alus

- https://developer.chrome.com/blog/viewport-resize-behavior
- https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- Paigaldatud Next.js `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`.
