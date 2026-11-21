<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 21.11.2026 Europe/Tallinn — fb36c3b vastu võetud; turvauuenduse kohalikud lõppkontrollid läbitud

## Praegune checkpoint

Kasutaja Maci edukas raport, fb36c3b Ready / Production ja uus vestluste loendi ekraanipilt on vastu võetud. Postkast-real oma profiilipilt on 40 px; vastaspoole pildid 56 px / mobiilis 48 px; avatud vestluse all oma pilt 24 px. Järgmine eraldi väljastus uuendab Nexti, Sharpi ning kolme nendega seotud või olemasoleva tarbija ühilduvat transitiivset teeki. Kasutaja palus lisada e-posti kinnitamise. See kuulub järgnevasse registreerimise tööpaketti. Eraisiku töökuulutuste lubamine on põhjendatud soovitus, mille serveriõigused tehakse eraldi muudatusena.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main fb36c3bd932501121fe3c67a667724bd47ea8244, puu bb5cdd87bf94ba2ada7fe97f45c54a734d538e07, 1968 lähtefaili; eelmine commit eb29922d6c47e3ff7bc5bbbd2bbdbaf62f59f22a.
- **Eelmise käigu tõend:** Raport 292627 B, SHA256 a13a2e78cd048c9e3fb2acc3209b624a28c026ba4dbc577ba854c7ec8b6033a0, release c0c880427cdc5d6ae4ac420bd031c1e06d1350082e11d1833cc8eada5e5c2b66. Raportis build passed ja push verified; toored Maci buildi/Giti logid ei olnud üles laaditud. Avaldamise ja kujunduse tõend on kasutaja ekraanipilt.
- **Täpsed uuendused:** next 16.2.1 → 16.4.6; eslint-config-next 16.2.1 → 16.4.6; sharp 0.34.5 → 0.35.5. Lukus lisaks ws 8.20.0 → 8.23.0, source-map-js 1.2.1 → 1.2.4 ja zod 4.3.6 → 4.6.7. Muud 14 otsesõltuvust säilivad.
- **Native komponendid:** Sharp native 0.35.5; @img/sharp-libvips pakett 1.3.4; tegelik libvips 8.18.7 ja librsvg 2.63.2. Valideeritakse nii laaditud binaar kui ka viie pilditöötluse API ehitatud failide loend.
- **Õiguste piir:** Rakenduse autentimise, profiilide, töökuulutuste, RLS-i, RPC-de, kontoandmete ega Storage poliitikate muutmist selles paketis ei ole.
- **Ajalugu:** Eelmise jooksva juhise kolm faili on baiditäpselt säilitatud docs/continuity/history/security-base-fb36c3b-20261121 all. Vanad väljastused ja originaalraportid jäävad muutmata.
- **Ühilduvusparandused:** Sharp 0.35.5 uute tüübide jaoks muudeti ainult tüübiimporte kahes imageCodec.ts failis. Nexti tegelik build näitas hobuse- ja teenusekuulutuste dünaamiliste pilditöötlusfailide puudumist NFT loenditest; next.config.ts sama olemasolev failide kaasamisloend rakendub nüüd kõigile kolmele publication API-le. Pilditöötluse ärireeglid ei muutunud.

## Tegelik kohalik katse

- Lõpliku kandidaadi kontrollid on läbitud: puhas npm ci täpsest muutumata lukust; tegelik Linux x64 Next/Sharp/native/libvips laadimine; 140/140 olemasolevat pilditesti, null vahelejäetud/katkestatud testi; Next 16.4.6 vaikimisi Turbopacki build koos TypeScripti kontrolliga; kõigi viie pilditöötluse API tegelikud NFT loendid. Lõppjooksud on native-3, tests-3, build-3 ja traces-2. ZIP-i kontrollid-kaustas on täpsed sisendrässid ja väljundid.
- Rakendustestid kasutavad sünteetilisi pilte ja asendatud Auth/RPC/Storage teenuseid. Need ei tõenda live-teenuse seadistust ega testi teiste kasutajate andmetega. Uut live-brauseri või Maci jooksu ei väideta.
- Maci uuendaja teeb need samad uue versiooni kontrollid enne piiratud commit/push toimingut. Edukat ja muutumatu tõendiga etappi jätkamisel uuesti ei käivitata; katkestuse või ebaselge tulemuse korral peatub. Vanade väljastuste rakendus- ega andmebaasikatseid ei korrata.
- Lõpliku luku npm audit raporteerib 10 mõjutatud paketinime: 8 mõõduka ja 2 kõrge raskusastmega; kõik allesjäänud kirjed on dev:true. Need vajavad eraldi arendustööriistade hooldust ja ei võrdu kümne tõendatud portaali ründeteega. Kogu portaali turvaauditit ega nullriskiga tulemust ei väideta.
- Maci uuendaja 23 sihitud offline kontrolli ja trace-kontrolli 18 täiendavat failisüsteemikontrolli läbisid. Uuendaja fixture’ites olid npm/native/rakendustest/build simuleeritud; tegelikud Linuxi rakenduskontrollid on eraldi tõendid. Uut Maci ega live-käivitust ei ole veel toimunud.

## Production / kasutajaliides

- fb36c3b sama commit’i Ready / Production ja kasutaja soovitud suurema oma postkastipildi tulemus on vastu võetud; vana käiku pole vaja korrata.
- Selle turvauuenduse Maci käik, uus commit ja Verceli avaldamine on kasutaja ühe käsu käivitamiseni ootel.
- E-posti kinnitamise tegelikku Supabase seadistust, saatmisvõimet ja olemasolevate kasutajate kinnitamise seisundit selles lähtekoodipaketis ei muudetud ega loetud.

## Üks järgmine töö

Ava selqiro-turvauuendus-20261121.zip Downloads-kaustas. Käivita: python3 -I -B "$HOME/Downloads/selqiro-turvauuendus-20261121/uuenda.py" --publish. Saada lõpus SAADA SEE FAIL juures näidatud uus raport. Oota sama uue commit’i Ready / Production tulemust. Seejärel jätka e-posti kinnitamise ja esmase eraisiku/ettevõtte valikuga; järgnevalt laienda töökuulutuste õigused eraisikule koos backend-kontrollidega.

**Peatumisel:** Tundmatu lähtekood, indeks, remote, varasem originaalraport, uus paketifail, installi/native/testi/buildi/trace tulemus või muutunud sisend peatab avaldamise. Saada täpne uus raport või selle puudumisel PEATATUD rida. Ära kustuta päevikuid, muuda kontrolli väärtusi ega käivita vanu uuendajaid/SQL-käske.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — selle turvauuenduse üks käivitamiskäsk.
- docs/architecture/security-dependency-update-20261121.md — piiratud sõltuvusmuutus, kontrollid ja tõendite piir.
- docs/architecture/registration-email-and-private-employers-plan.md — e-posti kinnitamise järgmine töö ja eraisiku tööandja soovitus koos ametlike allikatega.
- docs/architecture/advertising-pricing-self-service-plan.md — reklaam ja esiletõstmine, iseteenindus ning riikide hinnad.

## Säilivad piirid

- AI kuulutuste päringuteed jäävad suletuks. AI, reklaam, esiletõstmine, konto kustutamise kord ja registreerimise ümbertegemine ei kuulu sellesse turvauuenduse lähtekoodideltasse.
- Selles paketis ei kustutata ega asendata kasutaja pilte. Praegused omaniku-, profiili-, vestluse- ja töökuulutuste õigused säilivad.
- E-posti kinnitamine tõendab postkasti kontrolli, mitte inimese isikusamasust, ettevõtte esindusõigust ega tehingu turvalisust. Kasutaja on selle lisamise heaks kiitnud; actual Auth seadistus ja SMTP on järgmise etapi kontroll.
- Eraisikust tööandja võimalus ei tohi piirduda nupu kuvamisega. Avaldamine, haldamine, avalik lugemine, blokeerimine ja kontakteerumine vajavad ühtset eraisiku omandimudelit. Konto liigi ja tegeliku töösuhte vahel ei ole üksühest vastavust.
- Uute kasutajate üks nähtav esmavalik eraisik/ettevõte; olemasolevaid kasutaja identiteete ega andmeid ei ühendata ega kustutata. Ettevõtte liikmete õiguste üleandmine ei lahene automaatselt ühise parooliga.
- Reklaam ja esiletõstmine jäävad tulumudeli etapiks: iseteenindus, enne ostu nähtav hind, ühtne stardihind ja riigi erihinnad, fikseeritud paketid. Oksjon ei ole esimese väljastuse eeltingimus.

## Keskkond

- Olemasolev /Users/taivo/selqiro ja Taivo17/selqiro remote; ainus selle paketi lähtecommit on fb36c3bd932501121fe3c67a667724bd47ea8244.
- Paigaldatakse täpsest uuest package-lock.json failist npm ci abil. Elutsükli installiskriptid on keelatud; dev- ja optional-paketid on kaasatud. Uut kontot, projekti, võtit ega teenust ei looda.
- Originaalne lõpetatud fb36c3b uuenduse raport säilib ainult lugemiseks ning peab koos kogu lähtepuuga sobima. Node/npm ja Maci native komponendid kontrollitakse tegelikus käivituses.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
