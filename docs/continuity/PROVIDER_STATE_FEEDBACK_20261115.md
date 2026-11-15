# Varem loetud seisu kuvaparandus — 15.11.2026

## Vastu võetud alus

Viimane Maci commit on `3aaebc6d663e6d11c02c49bed502b32ed4312852`.
Täpne 1765-failine puu on `ce11882a16861c7401ac22fd18d96c9b6fa84444`.
14.11 paranduse raport (274617 B) SHA256:
`d2d6aa561050d4d6f05b4d985d538eadb3df4b846c47d036ca424e8803c367d8`.
See kinnitab ühte SQL-katset, eraldi järelkontrolli, applied-seisu, üheksat
kaitset, kolme säilinud invarianti ning täpset commit/push’i. Sama commit’i
Ready / sinine Production on vastu võetud kasutaja 14.11 kuvatõmmiselt.

15.11 kasutaja kinnitus: „kõik toimis sinu kirjelduse järgi”. Viis pilti
15:18:23–15:20:49 näitavad eemaldamist, uut blokeerimist, blokeeritud vestlust,
vana kinnituse unknown-teadet ning lõppnimekirjas alles olevat blokeeringut.
Kaitsetulemus ja ajaloo säilimine on vastu võetud. Konkreetset conflict-teadet
ega selle browser-päringu HTTP/RPC vastust pildid ei tõenda.

Kasutuskatse täpne üleandmispakk on
`selqiro-seis-20261115-blokeering-kontrollitud.zip` (4338056 B), SHA256
`01e21e7b068afcfd4d9566d44f692c749f25967da55ffdfbd4605dbee325a6bd`.
Selles on piltide räsid ja kasutajakinnituse tõendipiir. Päris sõnumite ja
fotode pilte ei kopeerita selle kuvaparanduse Git-payloadi.

## Miks on vaja väikest kuvamuudatust

Ebakindla kirjutuse järel säilitab olemasolev `ProviderControlSession`
enne kirjutust loetud `view.state` väärtuse. Pealkiri „Praegune salvestatud
seis” võis jätta mulje uuest õnnestunud serverilugemisest. See tekst ei olnud
värskuse tõend. SQL 40001/HTTP409 ning SQL42501/HTTP403 olid kliendis juba
teadaoleva keeldumisena kaetud. Unknown-i täpset põhjust ei määrata piltidest
ega muudeta kuvaparandusega konfliktiks.

Vana `blocked_account` sihi puudumine ei tõenda, et sama kasutaja uus blokk
puudub. Seetõttu ei tohi selle vastuse põhjal näidata „Sa pole seda kasutajat
blokeerinud”. Vana sihi puhul säilib olemasolev kättesaamatuse teade ja
eelistuste kokkuvõte jäetakse kuvamata.

## Üks tuletatud kuvareegel

| Olemasolev seansiseis | Kuvamine |
| --- | --- |
| `ready` ja `targetAvailable=true` | „Seis viimase kontrolli ajal” / “State at the last check” |
| Säilinud seis kirjutuse, ootel lugemise, vea või ebakindla tulemuse ajal | „Varem loetud seis” / “Previously read state”; selgitus, et varasem info ei kinnita praegust seisu |
| Seisu veel ei ole | Eelistuste paneeli ei näidata |
| `targetAvailable=false` | Eelistuste paneeli ei näidata; vana sihi kättesaamatuse teade säilib |

Väike `providerStatePresentation` on puhas tuletus olemasolevast seansiseisust;
uut muutuvat värskuse lippu ei lisata. Neli runtime-faili on kuvamudel,
`ProviderPreferenceState`, `ProviderControlDialog` ja EN/ET sõnastik.
Inglise keelele taandumine säilib. Ühine dialoog katab olemasolevad tarbijad.

`providerControlSession`, `useProviderControls`, RPC-klient ja kõik SQL-failid
on baiditäpselt muutmata. Blokeeringu ID/aja CAS, konto- ja hilinenud vastuse
kaitsed, üks selgesõnaline kirjutus, eraldi lugemine, teine blokk, 24 tunni
peitmine ning vestluse mustandi, foto eelvaate ja ajaloo käitumine säilivad.

## Käesoleva kandidaadi kontroll

- **7/7 sihttesti PASS.** Tegelik seansimudel, Reacti dialoogi renderdus ja
  tõlkeloogika: ebakindel kirjutus, ootel/nurjunud/uus õnnestunud lugemine,
  konflikti säilimine, vastuste järjekord, konto katkestamine, vana sihi
  kadumine ja EN/ET/fallback. Automaatset uut kirjutust ei tekkinud.
- **Täielik build PASS.** Next 16.2.1 webpack, TypeScript, 28 staatilist
  lehte; 675 runtime-/seadistussisendit, drift 0. Sama lähtekoodi esimene
  katse peatus olemasoleva AI-marsruudi puuduval build-muutujal. Teine katse
  läbis kohalike inertsete Supabase/OpenAI build-väärtustega; päris
  teenusepäringuid ega saladusi ei kasutatud.
- **Brauser:** Tegelik brauserikontroll jäi keskkonna piirangute tõttu tegemata. Kohalik Chromium peatus socket()-õiguse vea tõttu enne ühegi testijuhu käivitumist. Lubatud CDP-brauser ei pääsenud kohaliku HTTP-serverini ning selle file-URL katse keelas brauseri turvapoliitika. Edasised brauserikatsed lõpetati; käesolevat kasutajaliidese tulemust pärisbrauseris ei ole kinnitatud.
- **Uuendaja:** 14 sihitud jätkamise, protsessi ja säilituse juhtu PASS.
  Fikseeritud sihttesti alamprotsessist eemaldatakse pärandunud
  `SELQIRO_PROVIDER_STATE_PROOF`, et väline keskkonnamuutuja ei kirjutaks
  testi raportit suvalisse asukohta. Kasutaja shelli keskkonda ei muudeta.
  Lõpliku pakendi räsid ning ajutise Git-puu/indexi ja loaderi tulemused
  säilivad `kontrollid/loplik-kontroll.json`-is koos tegeliku ja simuleeritud
  piiri eristusega. Maci Finderi ega live-remote’i tulemust ei simuleerita
  päriselt toimunuks.

Sihttesti tõend SHA256
`d463195ca549ac7d577a24fca6ba837041c6fd40464da2022e5cdf1b121f59a9`.
Build’i 675 sisendi inventuur SHA256
`25e095d6095d07cbf48d45506f3dcb2900b214fa99623f6179fd88fe6a4a3a8c`.
Läbinud build’i logi SHA256
`158ba7e5387d33b3e2b96c9e82d7d5cfd14b06bec41effbe94086fed78321d14`.
Täpsed tõendid ja varasem keskkonnatõrge säilivad väljaandes; neid ei kirjutata
tagantjärele ümber edukaks kontrolliks.

## Tarne ja jätkamine

Pakett `selqiro-salvestatud-seisu-teade-20261115` rakendab 19 faili: 8 asendust ja 11 lisandust,
0 kustutust. Muutmata 1757 alusfaili on räsikaitsega. Lõpptulemus on
1776-failine kandidaat. Kolm senist continuity-faili säilivad
`history/provider-state-feedback-base-20261115/` all koos `preservation.json`-iga.
Dev-log ja arhitektuur on ainult lisatud osaga; senised prefiksid säilivad.

Värske täpne Git/lähte/remote’i kontroll ja eelmise eduka päeviku lugemislukk
eelnevad kirjutamisele. Seejärel ainult üle vaadatud payload, uus sihttest,
muudetud kliendi build, täpne staging, commit ja push. Iga protsessil on
piiratud aeg ning püsiv intent. Lõpetatud etappi ei korrata; teadmata
protsessi/commit/push’i tulemus peatab. Ühtki SQL-i, Storage’i, teenuse
ühendamise või npm-paigalduse sammu pole.

Järgmine käsk ja täpse jooksuraporti saatmine on `HOSTED_PORTAL.md`-s.
Maci rakendamine, uus commit/push ja sama commit’i Ready / Production on
praegu **kinnitamata**. Need on eraldi tõendid. Blokeeringu säilimise
vastuvõtukatse on lõpetatud; kuvaparanduse järel vaadatakse ainult uus
seisukirjeldus üle. Väljastatud vanu pakke ja kasutaja päevikuid ei muudeta.
