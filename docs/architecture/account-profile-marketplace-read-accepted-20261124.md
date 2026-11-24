# Avaliku profiili kuulutuste ja rubriikide konto kontroll — vastu võetud

24.11.2026 Europe/Tallinn. **Commit 0cb3484 on vastu võetud.**

## Eraldi tõendid

| Kiht | Kinnitatud seis | Tõendi piir |
| --- | --- | --- |
| Maci testid ja build | Raportis 17/17 testi ning üks edukas Next.js 16.4.6 build | Parsitud kontrolltulemus ja väljundiräsid; täielikku TAP/build’i teksti pole eksporditud |
| Andmebaas | Täpne eelseis, üks rakendamine, COMMIT-järgne kinnitus ja eraldi verify | Räsiga seotud runner’i tunnistus, mitte toorkataloogi eksport ega serveri allkiri |
| Git | main 0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a; ainult 32 paketi faili, puhas lõppseis ja push | Raporti viimase kontrolli aeg 24.11 kell 13:55:56.980 Tallinn; uut remote’i lugemist siin ei tehtud |
| Vercel | Sama lühikese räsiga Ready / Production, 26 s, main | Eraldi kasutaja pilt; algne raporti READY_NOT_CHECKED säilib |
| Tegelik kasutustee | Kasutaja „testimisel kõik töötab” | Kasutaja kinnitus ettenähtud kontrollile; iga kliki eraldi jälge ei lisatud |
| Uus üleandmine | Seisukirje, genereeritud üleandmine, juhend ja päevikulisad on ette valmistatud | Pole pärast 0cb3484 Maci kirjutatud ega commit/push tehtud |

## Lähtealus ja muutuse ulatus

Ainus vanem on `ac5521a7e944ebfb3710ea97b9913cc91b9130ee`. Uus puu on `6d213969675d86eea8e2ff56b99f9a232715b3a8`, 2202 jälgitavat faili.
Täpsed lähtebaidid, SHA-256, Git blob ja failirežiimid on kontrollitud;
inventari SHA256 on `06215ad319d5972e56f401423ec53eb1a9fa56560a7398dc3a36312a439ea991`. Paketis oli 7 muudetavat ja 25 uut
lähtefaili. Rakenduskood ja sõltuvused säilisid.

SQL asendas kolme funktsiooni kehad: get_public_profile_marketplace_v1/v2 ja
get_public_profile_store_categories_v2. Konto kontroll toimub leitud profiili
kanoonilise omaniku järgi ühe korra enne sisu lugemist. Ühine rubriigifunktsioon
katab ka teenuste rubriike. Sobimatu konto korral säilib vana kättesaamatu
profiili tühi vastus. Päringuvead, sisendipiirid, pagineerimine, sisufiltrid ja
järjestus säilivad. Kasutajakontode, profiilide ega sisu ridu ei muudetud.

## Raporti kontroll ja piir

Originaal: `selqiro-profiili-kuulutuste-konto-olek-20261124-raport-20261124-135557-9f43f399d25a.json` (1 359 380 baiti), SHA256 `38ceedd0b083d20ca524b96a53ae46713dab6bdf61a390e5e3face223ce9260a`.
Väljastatud ZIP SHA256 `f69c9e8ab3c1206848cc48f0e67bf0627446d49fe547726933f88d97753eec78`; manifest `dfcdb83702f876e38b580986f8e241c2df9ef2dcc65be88fb393c1c96824acf9`.
Raporti run_id ja package_sha256 viitavad manifestile, mitte ZIP-i räsile.

569 käsukirjet seovad ajad, olekud, lõpetamise ja väljundite pikkused/räsid.
Käsuridade argv ei ole raportis; käskude tähendus seotakse täpse väljastatud
runner’i lähtekoodiga. Kolm parsitud SQL ümbrist taastati standardse JSON-kujuna
ja need vastasid täpselt väljundite pikkustele/räsidele; sama parser läbis.
See tõendab raporti sisemist ja paketiga kooskõla. See ei asenda sõltumatut
andmebaasi toorkataloogi ega lisa teenuse krüptograafilist allkirja.

Eelseis oli before, üks acknowledged apply oli after, eraldi verify oli after.
Uute sihtide ja kuue sõltuvuse kontroll hõlmas 10 relatsiooni, 50 veergu,
20 indeksit ja 39 võtit; konto-, profiili-, tava- ja hobuselugejate varasem
BASE leping jäi samuti kontrolli alla. database_apply_count=1 ning
account_rows_read/account_rows_exported=false. Järelkontroll eelnes Gitile.

Maci käik lõppes 24.11 kell 13:55:57.008 Tallinn. Eraldi pildi fail
`Screenshot 2026-11-24 at 13.56.45.png` (499 275 baiti), SHA256 `6f02f42addf9a32a1b3000745b7f28c0beb0ef56f166b4dbb56185421dbe65c9`, näitab Ready / Production.
Täisraportit ja pilti ei kopeerita uuesti; evidence/ säilitab viited ja räsid.

## Säiliv jõudluse piir

Ettevalmistuses olid konto/omaniku/slugi otsingud indekseeritud ja konto helperi
kutse üks leitud profiili kohta. Suure profiili 1600 pakkumise v2 mediaan oli
966,67 → 981,87 ms. Vana ja uus rubriigiharu lugesid mõlemad kogu 20 801
seosega hulga (järelvaatluses 20 802); kaartide ja finality töö enne lehekülge
jäi alles. Need vajavad eraldi optimeerimist. See vastuvõtt ei kinnita
miljonite kasutajate koormust, samaaegsust ega tootmiskeskkonna latentsuse SLA-d.

## Üks järgmine töö

Lähtekoodiaudit soovitab teenuste visible_to_viewer(uuid) konto kontrolli ning
profiiliteenuste v1/v2 varast profiiliomaniku kontrolli. Nii katab üks moodul
teenuste avaliku sisu lugemise ja korrektse kättesaamatu profiili ümbrise.
Täpne kavand, muutumatud piirid ja allikapinnid on `docs/architecture/account-service-read-next-20261124.md` ning
`docs/architecture/account-service-read-next-20261124.sources.json`. Uut teostust ega paigaldajat selles vastuvõtus ei koostatud.

Konto sulgemine, taastamine ja lõppkustutamine jäävad välja lülitatuks.
SMTP, domeenid, AI, Energy ning kuulutuste esiletõstmise/reklaamide järjekord
säilivad kokkulepitud kujul. Teste, build’i, SQL-i ega lõpetatud paigaldajat
vastuvõtul ei korratud. Vanad juhendid säilivad history all baiditäpselt.
