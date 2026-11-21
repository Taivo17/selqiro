<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 21.11.2026 Europe/Tallinn — profiilipildi sobitamine vastu võetud; postkasti oma pildi väike kujundusparandus ette valmistatud

## Praegune checkpoint

eb29922 profiilipildi sobitamise ja suuremate vestluspiltide uuenduse Maci raport, sama commit’i Ready / Production ning kasutaja esitatud sobitamise, salvestamise ja vestluste ekraanipildid on vastu võetud. Järgmine eraldi parandus suurendab ainult vestluste loendi Postkast-real oma profiilipildi 24 pikslilt 40 pikslile. Avatud vestluse all jääb oma pilt 24 px; vastaspoole pildid on endiselt 56 px ja telefonivaates 48 px.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main eb29922d6c47e3ff7bc5bbbd2bbdbaf62f59f22a, tuletatud puu 4e61ce1410982c77e835598f036813233cad409e, 1964 faili. Alus taastatakse eelmise väljastuse täpsest inventarist ja 19-faililisest kattest ning võrreldakse kandidaadiga.
- **Eelmise käigu raport:** 294433 B; SHA256 302393e6fd8d7aa31d771e42fe002b051f63836c135f9e6d6d17824754f99e9b. Release 66ef188b7257ad6b07c0b3b1fdc60735694c8c46dc720d55db47b7db29877c5d. Raportis on 17/17 testi, build passed ja push verified. Maci logide sisu ei olnud üleslaaditud JSON-is; käsutulemused on raporti tõendid.
- **Uue paranduse ulatus:** Üks lisatud CSS-reegel .inbox .sender .avatar: width 40px, height 40px ja algustähe font 16px. Loendi Postkast-rida on selle reegli ainus saatjatähis. Rakenduse käitumisloogika, salvestamine ja õigused ei muutu.
- **Säiliv pildisobitamine:** Vastu võetud ringi täitev lõige, suurendamine, nihutamine, terve pildi valik ja eraldi asendi kinnitamine/salvestamine jäävad samaks. Varem salvestatud pildi uueks sobitamiseks valitakse kohalik originaal uuesti.
- **Ajalugu:** Eelmise jooksva juhise kolm faili säilivad baiditäpselt history/inbox-avatar-base-eb29922-20261121 all. Varem väljastatud pakette, raporteid ega päevikuid ei muudeta.

## Tegelik kohalik katse

- Uus väljastus seotakse ühe CSS-reegli sõltumatu ulatuse ülevaatuse ja sama lähtekoodi täieliku Next/TypeScript build’i tõendiga. Väikese CSS-muudatuse jaoks uusi rakendusteste ei lisata ega varasemaid pilditöötluse teste korrata.
- Selles töökeskkonnas oli eelmise väljastuse Chromiumi käivitamine socket-piiranguga blokeeritud. Uut päris brauseri läbimängimist ei väideta; kasutaja 21.11 ekraanipildid tõendavad vastu võetud eb29922 töövoogu, mitte veel uue 40 px reegli tulemust.
- Uuendaja säilitab eelmise eduka originaalraporti ainult lugemiseks ning kontrollib enne kirjutamist kogu lähtepuud, indeksit ja remote’i. Käivitatakse build; SQL-i, Supabase CLI ega Storage’i toiminguid ei ole.

## Production / kasutajaliides

- eb29922 Verceli Ready / Production ekraanipilt on vastu võetud. Seda ega varasemate commit’ide avaldamise kinnitusi ei ole vaja uuesti küsida.
- Kasutaja esitas ringi täitva kiivripildi sobitamise ja Pilt salvestatud teate, suuremad vestluste loendi/päise vastaspoole pildid ning väikese saatjapildi avatud vestluse all. Need on kasutaja töölauavaate tõendid.
- Uue postkasti 40 px oma pildi paranduse Maci käik ja uus avaldamine on ootel.

## Üks järgmine töö

Ava selqiro-postkasti-profiilipilt-20261121.zip Downloads-kaustas ja käivita: python3 -I -B "$HOME/Downloads/selqiro-postkasti-profiilipilt-20261121/uuenda.py" --publish. Saada lõpus näidatud uus raport. Oota sama uue commit’i Ready / Production tulemust ja värskenda vestluste loendit.

**Peatumisel:** Tundmatu lähtekood, indeks, remote, eelmise eduka käigu originaalraport või paketifail peatab uuenduse. Saada lõpus näidatud raport või selle puudumisel PEATATUD rida. Säilita olemasolevad failid ja raportid; vanu uuendusi ega SQL-käske ei ole vaja korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — uue väikese kujundusparanduse ainus käivitamiskäsk.
- docs/architecture/profile-avatar-fit-20261121.md — nüüd vastu võetud pildisobitamise leping; postkasti uue mõõdu kirjeldus on käesolevas jooksvas seisus.
- docs/architecture/profile-media-20261120.md — olemasoleva pildisalvestuse õigused ja olekumudel.
- docs/architecture/advertising-pricing-self-service-plan.md — hilisema reklaami ja hinnakirja suund.

## Säilivad piirid

- Uuendus ei eemalda hulgi vanu profiilipilte. Vana pilt asendub selle profiili selgesõnalise valikuga; taustakoristus puudutab ainult uue registri täpseid kasutusest eemaldatud või aegunud katsefaile.
- Avaliku viite eemaldamine ja Storage API kustutuse järel praeguse võtme puudumine ei tõesta kõigi ajalooliste versioonide või vahemälukoopiate füüsilist hävitamist. Tegelikke bucket versioning/lifecycle väärtusi esialgne koguja ei lugenud. Konto lõpliku kustutamise kord on eraldi töö.
- Ettevõtte loomine, üleandmine, registreerimise lihtsustamine ja eraisiku/ettevõtte esmavalik jäävad eraldi. Olemasolevate profiilide omanikud ja pakkumised ei muutu.
- Reklaam ning esiletõstmine jäävad oluliseks järgmiseks etapiks: iseteenindus, avalik hinnakiri, ühtne stardihind ja riigi erihinnad, fikseeritud paketid; oksjon ei ole esimese versiooni eeltingimus.
- AI jääb välja lülitatuks. Sõltuvuste turvauuendused, konto sulgemise/kustutamise tähtajad ja laiem avamiseelne turvaülevaatus jäävad eraldi. Profiilipiltide õiguste kontroll ei ole kogu portaali turvasertifikaat.

## Keskkond

- Olemasolev /Users/taivo/selqiro ja Taivo17/selqiro remote; selle töö lähtecommit on 68c3996.
- Uuendaja kasutab olemasolevaid rakenduse sõltuvusi ja nõuab eelneva lõpetatud käigu originaalraporti säilimist. Uut kontot, projekti, võtit ega pilditöötluse teenust ei lisata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
