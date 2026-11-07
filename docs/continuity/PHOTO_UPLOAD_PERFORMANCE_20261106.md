# Foto lisamise kiirendus — valmistatud 06.11.2026

## Kasutaja mõõtmise piir

Kasutaja hindas ühe foto lisamiseks umbes **29 sekundit**, võimalik vahemik
**27–31 sekundit**, loendades sekundeid nupuvajutusest foto nähtavale tulekuni.
Stopperit ei kasutatud. Sama foto algne maht ja võrgu/seadme tingimused ei ole
teada. See on kasulik esialgne kogukestus, mitte etapiviisiline mõõtmine.

## Valmis lähtekoodimuudatus

Uus ühine brauseri ettevalmistus vähendab suure JPEG/PNG/WebP maksimaalse
pikema serva 2048 px-ni ning proovib üht WebP kodeeringut kvaliteediga 0,9.
Väike fail jääb muutmata; originaal säilib ka siis, kui kodeering ei vähenda
mahtu. Orientatsioon ja läbipaistvus säilivad. Senine serveri autoriteetne
kontroll ja WebP82 väljund töötavad edasi.

Brauseri piiratud performance.measure ja serveri fikseeritud Server-Timing
näitavad ajajaotust ilma sisu logimise, uue teenuse või tehnilise paneelita.
Ühtegi senist serveripäringut ega õiguskontrolli ei eemaldatud. Täpne leping
on [listing-photo-preparation-v1.md](../architecture/listing-photo-preparation-v1.md).

## Kohalikud võrdlusfailid

Tegelik Chromiumi brauserikodeerija ja rakenduse native sanitizer; teenuse
RPC/Storage vastused on asendatud. Sisendid on sünteetilised, mitte kasutaja
fotod. Need tulemused ei ole tootmise üleslaadimise kestused.

| Sünteetiline fail | Algmaht | Saadetud maht | Mahu vähenemine | Ettevalmistatud mõõt |
| --- | ---: | ---: | ---: | --- |
| JPEG | 7 141 825 B | 993 462 B | 86,1% | 2048 × 1536 |
| EXIF-pöördega JPEG | 7 142 513 B | 998 270 B | 86,0% | 1536 × 2048 |
| Läbipaistev PNG | 12 713 958 B | 843 810 B | 93,4% | 2048 × 1536, alfa säilib |
| Väike WebP | 78 B | 78 B | 0% | 96 × 64, muutmata baidid |

Brauseri ettevalmistus koos räsimisega oli suurte võrdlusfailide kohalikes
juhtudes umbes 0,8–1,0 sekundit. Suure JPEG-i native serveriteisenduse üksik
mõõt oli algfailiga 632 ms ja ettevalmistatud failiga 668 ms; seega ei väideta,
et parandus tingimata vähendab selle faili kodeerimisaega. Peamine tõendatud
muutus on **väiksem saadetav ja SOURCE-ist tagasi loetav failimaht**.
Pöördega JPEG ja PNG andsid samas katses native ajad vastavalt 765/624 ms ja
704/603 ms; need üksikud kohalikud mõõdud pole püsiva jõudluse lubadus.

Viis brauserijuhtu kontrollisid ka täpset upload-räsi, serveri päris väljundit,
orientatsiooni, alfa säilimist, väikese faili muutumatust ning kadunud PUT-
vastuse taastumist pärast lehe laadimist ainult ühe PUT-iga. 1440 ja 390 px
laiusel ei tekkinud horisontaalset ülejooksu. Täielik build läbis.

## Järgmine tõend

Pärast uue paketi rakendamist ja sama commit'i Verceli Ready-tulemust lisa
samal seadmel/ühendusel üks sama algne foto. Võrdle nähtavat kogukestust
varasema ligikaudse 27–31 sekundiga. Kui viivitus jääb suureks, määra selle
ühe juhtumi etappide järgi järgmine kitsaskoht; ära lisa oletuslikku uut
järjekorda ega eemalda õiguskontrolli. Tootmise kiirenemist pole veel mõõdetud.

---

## Varasem lähtekoodivõrdlus enne kiirendusparandust

Allpool säilib sama päeva algne diagnoos ja tollane tõendipiir. Selle osa
„järgmine” tähendab toonast kavatsust; praeguse sammu määrab CURRENT_STATE.

# Foto lisamise jõudlus — 06.11.2026

## Tegelik kasutaja tagasiside

Kasutaja kinnitas, et uue foto lisamine olemasolevale kuulutusele toimib ja
foto on nähtav ka avalikus vaates. Samas hindab kasutaja V2 lisamist V1-st
aeglasemaks. Funktsionaalne kasutuskatse on vastu võetud; ajajaotus on mõõtmata.

Uut Maci raportit, täpset commit'i või Verceli deployment'i identiteeti selle
teatega ei esitatud. Lähtekoodi kontroll tehti väljastatud fotolisamise paketi
1066-failise puu järgi. Selle dokumendi koostamine ei käivitanud serverit,
brauserikatset, üleslaadimist ega tootmise päringut.

## Lähtekoodis kontrollitud erinevused

| Etapp | V1 | V2 hallatud foto lisamine |
| --- | --- | --- |
| Brauseri ettevalmistus | `resizeImage(file, maxWidth = 1600, quality = 0.82)` loob canvas'e kaudu JPEG-i. 1600 piirab laiust, mitte pikemat serva. | `ManagedPhotoAdditionSession.capture` säilitab valitud Blob-i baidid; brauseris vähendamist ega ümberkodeerimist pole. |
| Üleslaaditav maht | Saadetakse brauseris ette valmistatud JPEG. | Saadetakse algne fail, lubatud kuni 25 MiB. |
| Serveri pilditöötlus | V1 üleslaadimisfunktsioonides puudub privaatse SOURCE-i ja eraldi kontrollitud WEB-i ahel. | SOURCE loetakse tagasi, baidid/räsi kontrollitakse ja pilt dekodeeritakse. Sharp pöörab orientatsiooni järgi, vähendab kuni 2048 px pikema servani ja kodeerib WebP kvaliteediga 82, effort 4. Metaandmed eemaldatakse ja väljund kontrollitakse. |
| Salvestuse kinnitamine | Otse `listing-images` üleslaadimine; pärast üleslaadimisi üks pildiridade lisamine. Kogu salvestusvoog sisaldab ka muid päringuid. | Eraldi WEB kirjutamine, selle tagasilugemine/räsikontroll, valmiduskviitung ja galerii lisamise kinnitus. Mitmed päringud ootavad eelmist. |
| Mitu fotot | `runWithConcurrency(files, 3, ...)` töötleb kuni kolme valitud fotot korraga. | Praegune lisamisvaade lisab ühe foto korraga. |

V1 kontrollitud lähtekohad:

- `app/sell/page.tsx`: `resizeImage`, `uploadListingImages`, `runWithConcurrency`.
- `app/my-page/page.tsx`: `resizeImage`, `uploadNewImages`, `runWithConcurrency`.

V2 kontrollitud lähtekohad:

- `src/features/listing-edit/model/managedPhotoAdditionSession.ts`: `capture`, `start`, `complete`, `accept`.
- `src/entities/listing/api/completePublicationImage.ts`: privaatne SOURCE-i saatmine ja valmis WEB-i kviitung.
- `src/server/listing-publication/multipart/multipartPublicationImages.ts`: SOURCE/WEB loomine, lõpetamine, tagasilugemine ja kinnitamine.
- `src/server/listing-publication/images/worker.cjs` ning `image-contract.cjs`: serveri pildiretsept ja piirid.
- `src/server/listing-publication/journey/createJourneyHandler.ts` ning `hostedPreviewReadiness.ts`: päringu autentimine ja kasutuselevõtu kontroll.

## Mida see tõendab

V2-s tehakse võrreldes V1 pildiüleslaadimise abifunktsioonidega rohkem tööd
ning suure telefoni foto korral võib üle võrgu liikuda rohkem baite.
Kontrollitud erinevus on võimalik aegluse põhjus. Selle põhjal ei saa veel
öelda, kui palju aega võtab kasutaja ühendus, serveri dekodeerimine, WebP
kodeerimine või järjestikuste teenusepäringute ooteaeg.

Need pole mõõdetud tootmise sekundid ega tõend ühe kindla etapi ülekaalust.
V1 kolme paralleelse töö eelis puudutab mitme foto lisamist; see üksi ei
selgita ühe foto viivitust. Praegune serveri pildikontroll ei kasuta AI-d.

## Üks järgmine soovitus

Tee ühisele foto lisamise rajale üks piiratud jõudlusparandus:

1. Mõõda jämedad etapiajad: brauseri ettevalmistus, üleslaadimine, serveri
   lugemine/töötlus/salvestus ja galerii lõplik kinnitus. Kogu ainult kestusi,
   failimahtusid ning tehnilisi etapinimesid; fotode sisu, failinimesid,
   kasutaja teksti, volitustokeneid ega allkirjastatud URL-e ei logita.
2. Kasuta mõõtmise põhjal ühist brauseri ettevalmistust, mis arvestab
   olemasolevat 2048 px veebiväljundit, hoiab pildi kvaliteeti ja vähendab
   vajaduse korral üle võrgu saadetavat mahtu. Kasu tuleb mõõta sama
   võrdlusfaili ja kasutusteega; kindlat kiirendusprotsenti enne seda ei lubata.
3. Vähenda ainult tõendatult üleliigseid sama toimingu päringuid, säilitades
   kõik serveri autoriteetsed omandi-, identiteedi- ja seisukontrollid.

Üleslaadimise ja kinnitamise senine täpsete baitide/räsi leping säilib.
Brauseri uus kodeering muudab faili räsi; katkestuse järel sama algse faili
uuesti valimine vajab seetõttu ettevalmistatud baitide ja algse valiku
üheselt määratud seost. Seda taastumislepingut ei tohi kiiruse nimel nõrgendada.
Uut üldist töövoomootorit, paralleelset galeriid või teist pilditoru ei lisata.

## Käesoleva sammu ulatus

Rakenduskood, SQL, tõendatud katsed ja väljastatud paigalduspakk ei muutu.
Uuendatakse ainult praeguse seisukirje dokumente eraldi töökopias. Uut
kiirendusparandust ega paigalduskäsku siin veel ei väljastata.
