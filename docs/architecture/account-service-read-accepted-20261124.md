# Teenuste avaliku lugemise konto kontroll — vastu võetud

24.11.2026 Europe/Tallinn. **Commit a9d86e6 on vastu võetud.**

## Eraldi tõendid

| Kiht | Kinnitatud seis | Tõendi piir |
| --- | --- | --- |
| Maci kontrollid | 15/15 nõutud testi ja edukas Next.js 16.4.6 build | Raporti parsitud tulemused ning väljundite pikkused/räsid; täielikku TAP/build’i teksti ei eksporditud |
| Andmebaas | Üks kolme funktsiooni tehing, COMMIT-järgne kinnitus ja eraldi verify | Täpse väljastatud runner’i kviitungid; toorkataloogi või serveri allkirja ei ole |
| Git | main a9d86e63ab667545598da8e40ee2a2d0c7365df3; paketi 32 faili, puhas lõppseis ja push | Raporti viimane remote’i kontroll 24.11 kell 15:24:03.269 Tallinn; uut remote’i päringut siin ei tehtud |
| Vercel | a9d86e6, Ready / Production, main, 22 s | Eraldi kasutaja pilt; raporti algne READY_NOT_CHECKED säilib |
| Tegelik kasutustee | Kasutaja „Testides kõik töötab” | Kinnitus ettenähtud olemasoleva teenusesisu kontrollile; iga kliki eraldi võrgujälge ei lisatud |
| Uus dokumentatsioon | Seisukirje, genereeritud üleandmine, juhend ja päevikulisad on valmis | Pärast a9d86e6 pole neid Maci kirjutatud, commit’itud ega pushitud |

## Täpne lähtealus ja ulatus

Ainus vanem on `0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a`. Uus puu on `e5e7d7d2253c7c89ff09bbd84d3e501674c2de90`, 2227 jälgitavat faili.
Inventari `review/runner/accepted-inventory.json` SHA256 on `ceda65370c3771fee8217d254f6d93d0e89602dd56ae4f2cab9177ac236abc83`.
Taastatud allikad vastavad SHA-256-le, Git blob’idele ja failirežiimidele.
Uus allikakoopia ei ole kasutaja Maci checkout. Muutus 7 olemasolevat ja lisandus
25 uut faili; senine kliendikood ning package.json/lukufail säilisid.

SQL muudatus katab service_publication_private.visible_to_viewer(uuid) ja
get_public_profile_services_v1/v2. Üks kontooleku allikas on olemasolev
account_lifecycle_private.account_is_available(uuid). Eraisikul kasutatakse
identities.user_id, ettevõttel business_accounts.owner_user_id; autor või liige
ei ole asendusomanik. Viewer-helperi kaudu kitsenevad ka olemasolev teenuse
üksikvaade, otsing ja rubriigilugemine. Profiili varane kontroll säilitab
kättesaamatu konto korral null-identiteediga tühja ümbrise.

Konto- ega sisuridu ei muudetud. is_public, kontakt, meedia, kirjutused,
otseõigused ja konto active-only skeem säilisid. Konto sulgemise, taastamise
või lõppkustutamise toimingut see pakett ei aktiveerinud.

## Raporti päritolu ja tõendi piir

Originaalraport `selqiro-teenuste-konto-olek-20261124-raport-20261124-152403-bb0a636ba4be.json`: 1 362 856 baiti; SHA256 `3a84650999eaadaee99c280fd17ea029402b8e4542092bfa911a5db90dc8fad2`.
Väljastatud ZIP: SHA256 `1efaa8f248ef4ace8ce811b87d264931c7bc9401a5a3cdbf19897dac85945cf6`. Manifest: `72a6f6df04784348f1c91f8741df7dc5c9350bc1cf2dbd5fb7e58b35d2e22998`.
Raporti run_id/package_sha256 seostuvad manifestiga, mitte ZIP-räsiga.

569 käsukirjet sisaldavad ajad, lõpetamise olekud ning väljundite pikkused ja
räsid. Käsu tähendus on seotud kontrollitud väljastatud runner’i lähtekoodiga;
raport ei ole täielik argv-, TAP-, build’i- ega SQL-kataloogi toorlogi.
Taastatavate Git-väljundite võrdlus on review/runner all. Kolm SQL ümbrist
taastati raporti parsitud andmetest: pikkused ja SHA-256 kattusid CLI väljundi
kirjetega ning sama väljastatud parser aktsepteeris need. See lisakontroll on
review/sql all; taastatud ümbris ei ole eraldi üles laaditud toorlogi.
See kinnitab raporti ning paketi kooskõla; uusi live-päringuid siin ei tehtud.

Eelseis oli before, üks kinnitatud apply oli after ja sõltumatu verify oli
after. database_apply_count=1; database_apply_acknowledged=true. SQL kontroll
ja järelkontroll toimusid enne commit/push’i. Eelmise eduka profiilikuulutuste
käigu originaalraporti read-only lukk ja säilimine on raportis kinnitatud.

Pilt `Screenshot 2026-11-24 at 15.25.28.png`: 525 220 baiti; SHA256 `bf87cc49d5da0ecc2c641af3952db73e013fc16d5fd811d34b746a3d9341cba0`.
Pildi lühikene commit vastab raporti täispikkale commit’ile. Pilt ei tõenda
andmebaasi, mida kinnitab eraldi raport. Täisraportit ja pilti uude arhiivi ei
kopeerita; evidence/ sisaldab nende viiteid ja räsisid.

## Säiliv jõudluse piir

Ettevalmistuse 5500 kandidaadiga sünteetilises filtrita teenuseotsingus oli
vana/uue päringu mediaan 566,67 → 1105,46 ms. Konto kontrollide arv sõltub
hinnatud teenustest: selles otsingus 5500, 200 teenusega profiilil 201 ja
üksikvaates 1. Konto/Auth punktotsingud olid indekseeritud, kuid kogu otsingu
kandidaatide, täpsete koguarvude ja finality töö vajab eraldi optimeerimist.
Väikese tegeliku kasutustee vastuvõtt ei kinnita suurt mahtu, samaaegsust ega
productioni RPC ajapiiri. Allikaks on muutmata teenuste paketi proof/performance
ja docs/architecture/account-service-read-fence-v1.md.

## Üks järgmine töö

Tööpakkumiste avaliku lugemise konto kontroll: ühine jobs_private.visible_to_viewer
ning profiili tööloendi varane omaniku kontroll. Täpsed autoriteetsed allikad,
sihtfunktsioonid, kliendilepingud ja kontrolliplaan on `docs/architecture/account-job-read-next-20261124.md` ning
`docs/architecture/account-job-read-next-20261124.sources.json`. See on lähtekoodiaudit ja kavand; rakendust veel ei ole.

Sulgemine/taastamine/lõppkustutamine vajavad allesjäänud lugemiste, kirjutuste,
kontakti/sõnumite, otseõiguste ning meedia tervikut. Pärast kontoelutsüklit
järgnevad kuulutuste esiletõstmine ja reklaamid. E-posti aktiveerimise varasem
järjekord säilib. Praeguse vastuvõtu jaoks ei korratud teste, build’i ega
paigaldust; kasutajalt ei ole vaja uut käsku.
