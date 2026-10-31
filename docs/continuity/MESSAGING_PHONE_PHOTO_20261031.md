# Telefoni sõnumifoto avamise ühilduvus — 31.10.2026

## Vastu võetud ja praegune ülesanne

Kasutaja kinnitab telefonis kirjutusvälja nähtavust nii kuulutusekaardiga kui
ilma. Arvutis õnnestus lisada varem liiga suureks osutunud foto. Klaviatuuri,
vestluse paigutuse ega automaatse vähendamise eelmist parandust ei alustata uuesti.

Telefonis valitud Viofo autokaamera foto andis enne üleslaadimist teate
„Seda fotot ei saanud avada. Vali teine JPEG-, PNG- või WebP-pilt.”
See vana teade kattis nii päise lugemise kui bitmap-dekodeerimise tõrked.

## Tõend ja diagnoosi piir

Vestlusse saabunud Viofo koopia on 185 804-baidine JPEG, 1152 × 1536 pikslit,
JFIF + ICC, ilma EXIF-ita. SHA-256:
`2049a4791ef1b416716729f09d8902945c4b1de0a9b803141f4af6da20e17214`.
Pillow ja päris Chromium avavad selle. Vastuvõetud koopia ei pruugi olla telefoni
algfaili muutmata baitkoopia; selle edukas avamine ei tõenda algfaili omadusi ega
füüsilise Androidi tõrke kindlat põhjust.

Sõltumatus kontrollis kordus konkreetne ühilduvusviga: vana päiselugeja lükkas
tagasi JPEG-d, mille valikuline EXIF sisaldas tundmatut orientatsiooni, vigast
TIFF-andmestikku või kaht sama EXIF-plokki. Brauser dekodeeris samad failid.
Samuti sõltus avamine ainult ühest brauserimeetodist ning sellele anti aegunud
`imageOrientation: "none"` valik, kuigi EXIF oli juba enne eemaldatud.

## Parandus

- Vigane valikuline EXIF ei muuda muidu loetavat pilti keelatuks. Kõik leitud
  EXIF-plokid eemaldatakse kohalikust dekodeerimiskoopiast. Esimene korrektne
  orientatsioon rakendatakse canvas'es täpselt üks kord; puuduva või tundmatu
  orientatsiooni korral säilib kodeeritud pikslite suund.
- Esmane tee kasutab piiratud mõõtmetega `createImageBitmap` kutset standardsete
  valikutega. Puuduva/toetamata meetodi, tõrke või eiratud mõõtmete korral
  proovitakse sama kohalikku Blob-i brauseri pildielemendi kaudu.
- Varuvariandil on 20-sekundiline laadimispiir ning katkestuse käsitlus. Taimer,
  sündmused, objekti URL ja pildiallikas vabastatakse kõigil lõpetamisteedel.
  Väiksema mäluga telefoni juba vähendatud, sama kuvasuhtega tulemus on lubatud;
  seda ei suurendata. Võõrast võrguaadressi ei avata.
- Faili lugemise, toetamata vormingu ja mõlema dekoodri tõrgetel on eristatavad,
  kasutajale arusaadavad teated. Sõnumitekst ja kuulutusekaart jäävad mustandisse.

Algfaili piirid on endiselt 32 MiB / 64 MP / 32 768 px; struktuuri, lugemismahu
ja konteinerikirjete kontrollid säilivad. Saadetav WebP jääb kuni 1600 px ja
1 400 000 baidini, päring kuni 2 000 000 baidini. Serveri valideerimine, privaatne
hoidla, saatja omanikuseos ja ebaselge korduse samad baidid/võti säilivad.
Brauser võib allika dekodeerimiseks kasutada ajutist mälu; need piirid ei taga
suvalise seadme ega vigase/toetamata faili edukat avamist.

## Kontroll

**Lõpliku lähtekoodi tulemus: PASS.** 55 tegeliku brauseri pildikontrolli,
7 Reacti foto-only katsegruppi, 12 kontrollitud ressursi/katkestuse katset,
production build koos TypeScriptiga, kolme muudetud lähtefaili ESLint ning
22 paigaldajakatset läbisid. Viofo koopia andis 62 792-baidise WebP ka siis,
kui esimene dekooder oli sunnitud tõrkuma. Üle 14 MB JPEG/PNG/WebP-d jäid
pärast vähendamist alla 1,4 MB ja kogu päring alla 2 MB.

Paketi `review/verification.json` ja selle viited sisaldavad lõpliku lähtekoodi
räsidega buildi, TypeScripti/linti, tegelikke brauseri dekodeerimis- ja
kodeerimiskatseid ning foto-only Reacti voogu. Sunnitud bitmap-tõrge on katse
tingimus, mitte väide kasutaja füüsilise telefoni tegeliku dekoodrivea kohta.
Autentimine ja teenusevastused on sünteetilised. Paigaldaja katsed kasutavad
tegelikke ajutisi Git-hoidlaid/kohalikku remote'i ja asendatud buildi;
rakenduse päris production build kontrollitakse eraldi.

Kasutaja Viofo algpilti ega ekraanipilte tarnepaketti ei lisata. Tööriistadega
ei saadetud pärissõnumeid, laaditud pilvefotosid ega tehtud uut live deployment'i.
Telefoni klaviatuurivaate kasutaja kinnitus on uus tegelik vastuvõtutõend;
vanade sünteetiliste paigutuskatsete kordamine pole selle paranduse kontroll.

## Üks paigalduskäsk

Paki `selqiro-foto-telefon-20261031.zip` Maci Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-foto-telefon-20261031/uuenda.py" --publish
```

Uuendaja leiab `/Users/taivo/selqiro`, kontrollib viimase tarnitud
`selqiro-sonumid-parandus-20261031` täpseid lähteräsisid, puhast maini, tuntud
`cbd475757690db7bd1faf8784cd43359f45d5be9` eellast ja remote main == HEAD-i.
Tegelik hilisem commit ei ole ekraanipiltidest teada ning seda ei oletata.
Asendatavad failid varundatakse, build kontrollitakse, tehakse manifesti piires
commit `Improve phone message photo decoding` ja tavaline push.

Oma uus päevik: `~/Library/Application Support/Selqiro/messages-photo-20261031/<manifest-sha>/result.json`.
Vana töö ja päevikud säilivad. `PEATATUD` korral saada peatuse rida ja selle
uue jooksu raport. SQLi, Storage'i ega konto parandajaid ei käivitata.

`VALMIS` järel oota sama commit'i Verceli **Ready** olekut, värskenda telefonis
vestlust ja vali sama Viofo foto tühja tekstiväljaga. Eesmärk: eelvaade ja
„Foto on saatmiseks valmis”, seejärel kasutaja enda tavapärane saatmine.
Füüsilise telefoni tulemust ei märgita kohalike testide põhjal ette tehtuks.

## Tehnilised allikad

- https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/naturalWidth
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode
- Paigaldatud Next.js juhis: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
