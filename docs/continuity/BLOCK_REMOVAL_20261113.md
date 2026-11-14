# Blokeeringu täpne eemaldamine — 13.11.2026

## Vastu võetud alus ja selle piir

Viimane Maci raport seob main'i commit'iga
`371f4f4cc1ff62ecadb14d19bf5c8004cff256ea`, parent
`40ceac78deb255d8006244ae232652956b92bea0`, Git-puu
`57dd09fecd9258c05bebc985394532f203449e99` ja 1701 lähtefailiga.
Raport `selqiro-peitmine-profiilile-20261113-raport-20261113-190730-1171fbb45e7c.json`
on 253706 baiti, SHA256
`668d0f1f7c59ae4e684045fce6905df8acbefe7b6b34bbcbe16886d58457de8f`.
Selle sammu build/push on kontrollitud, database/Storage `not_performed`.
371f4f4 Vercel Ready pole eraldi commit'iga seotud kviitungina üle antud.

Kasutaja kinnitas peitmise/tagasivõtmise ning 20:02–20:03 kahe seadme käigu:
telefon oli vestluses enne blokeerimist, teade ilmus ja mõlemal poolel muutus
kirjutamine mitteaktiivseks; pärast eemaldamist kirjutamine taastus.
Seda kasutuskäiku ei korrata käesoleva muudatuse tõendiks. Varasema 19:17–19:21
käigu põhjus ja ajutiste postkasti/profiili lugemistõrgete põhjus jäävad teadmata.

## Miks uus samm on vajalik

Allikaaudit leidis eraldi puuduse: profiili/Minu ala uus setter kontrollis juba
blokeeringu täpset versiooni, kuid vana vestluse boolean-false RPC ning kolm
legacy lehte võisid eemaldada konto paari hetkel kehtiva bloki. Hilinenud vana
kinnitus võis seetõttu puudutada uut blokeeringut. See on allikast tuvastatud
kirjutuspiiri puudus, mitte varasema kasutusjuhtumi tagantjärele diagnoos.

Lisaks lubasid vana tabeli INSERT/UPDATE ja sequence UPDATE õigused anda või
muuta bloki identifikaatorit/loomise aega. Täpse rea võrdlus peab toetuma
serveri määratud ja kasutaja jaoks muutumatule versioonile.

## Kliendi ühtne leping

| Tee | Uus käitumine |
| --- | --- |
| Avalik profiil ja Minu ala | Olemasolev ühine provider-controls dialoog/CAS säilib. Haldus seob eemaldamise nähtud rea ID ja ajaga. |
| V2 vestlus | GET conversation tagastab tegeliku salvestatud osapoole oma bloki. Kinnitus kasutab täpselt selle rea blocked_account sihti. |
| Vana vestlus | Väike adapter kasutab sama eemaldamismoodulit; loomine läheb olemasolevasse true-only RPC-sse. |
| Vana poeprofiil | Loomine ja eemaldamine lahendavad sama profiili serveripoolse omaniku; identity UUID-d ei käsitleta konto UUID-na. |
| Vana Minu leht | Koostatakse olemasolevast pagineeritud blokeeritute komponendist. |
| Vana sõnumi-API false käsk | Uus klient ja server keelduvad enne vana RPC-d; true käsk säilib. |

`ProviderControlSession.openBlockRemoval` salvestab nähtud `blockId` ja täpse
`blockCreatedAt` teksti. Järgnev GET küsib ainult sama `blocked_account` rea
sihti. Muutunud aeg või kadunud rida ei käivita uuema bloki otsimist. Kinnitus
teeb ühe CAS-katse. Teadmata vastuse järel on lubatud selgesõnaline lugemine;
käsu automaatset uuestisaatmist ega uuele blokile suunamist pole.

Konto/vestluse vahetus lõpetab vana kinnituse kasutatavuse. Äriprofiili omanikku
ei asendata vestluse tegeliku osapoolega ega vastupidi. Mustand, foto eelvaade,
sõnumite ajalugu ja saatmise senised õigused säilivad. Peitmise eemaldamine,
oma bloki eemaldamine ja teise poole blokk on endiselt eraldi seisud.

## Serveri autoriteet ja üleminek

Uus repair asub `supabase/repairs/20261113_block_removal/` all. Varasemaid
räsitud repair-faile ei muudeta. Vana boolean-false eemaldamine suletakse,
blokeeringu versiooniveergude otsesed kirjutusõigused eemaldatakse ning vana
versioonita kustutus ei tohi läbida uut tabelikaitset. Kontrollitud CAS-kustutus
kasutab väikest privaatset kirjutajat; avaliku provider RPC signatuur säilib.
Paigaldus ise ei kirjuta ühtegi eelistuse või kasutajasisu rida.

Pelgalt vana funktsiooni asendamine ei tõendaks, et enne paigaldust juba
käivitatud funktsioon kasutab uut keha. Seetõttu käsitletakse eraldi vana
juba käivitatud kustutaja ja uue CAS-kustutaja õigust. Täpsed rolli-, triggeri-,
funktsiooni- ja RLS-piirid ning nende lokaalne tõend on uue repair'i README-s.

Uus metadata eel-/järelkontroll seob ainult skeemi/õigused ja olemasoleva
hosted-konteksti. See ei ekspordi kasutajate plokke, vestlusi ega sõnumeid.
Tundmatu või poolik kataloogiseis peatab uuenduse. JIT lülitatakse välja ainult
selle kontrolltehingu jaoks, mitte kogu serveris.

Raporti `cleanup_mode: held` on säilitatud protokolli silt, mitte selle sammu
uus Storage/cleanup tööjärje vaatlus. Värskelt kontrollitakse hosted projekti,
instance'i, release'i, enabled/ready väärtusi ja Storage-autoriteedi versiooni.
Koristamise varasem tõend jääb eelmise raporti piirile.

Vana `20261113_provider_controls/verify.sql` võrdleb muu hulgas nüüd muutuvat
set_block keha ja user_blocks õigusi. Pärast käesolevat sulgemist võib selle
ajalooline kontroll anda unknown'i. See ei ole vana paigaldaja uuestikäivitamise
põhjus. Uue seisulepingu autoriteet on käesoleva repair'i verify; eelnevad
raportid säilivad oma ajaloolise sammu tõendina.

## Tarne järjekord

1. Täpne 1701-failine alus, tegelik haru/HEAD, kogu index/tööpuu ja remote.
2. Viimase eduka private profile-päeviku hoitud lugemislukk ja metadata preflight.
3. Uus klient, üks build, täpne commit/push.
4. Fikseeritud HTTPS-aadressil uue kliendimärgi täpsed baidid, kuni 55 sekundit.
5. Värske lähte-, remote'i-, märgi- ja andmebaasikontroll.
6. Üks püsiv SQL-intent, üks tehingukatse ning sõltumatu tulemuse lugemine.

Ooteolek ei korda lõpetatud build'i, commit'i ega push'i. Juba kinnitatud push'i
järel muutunud remote'i ei taastata automaatselt. Kadunud SQL-vastuse korral
saab uus täpne lugemine kinnitada rakendatud seisu; absent-tulemus ei anna luba
sama teadmata tulemusega kirjutuse kordamiseks.

Avalik marker seob 682 runtime-allika räsi, ei sisalda kontoandmeid ega võtmeid
ning pole Verceli Ready või deployment-ID tõend. Juba avatud vana vaheleht
vajab värskendamist. Vana versioonita uus kutse peab pärast sulgemist keelduma.

## Kohalikud tõendid

Kliendi 10 sihtkatset ja 5 ReactDOM-kasutusjuhtu läbisid; TypeScript 5.9.3
läbis. Lõplik Next 16.2.1 webpack build läbis 24.062 sekundiga, 683 sisendit ja
sisendimuutusi 0. Build kasutas olemasolevaid lukustatud sõltuvusi ja sünteetilisi
konfiguratsiooniväärtusi; see ei ole Maci ega Verceli buildi tõend.

Tõendifailid asuvad väljastatud paki `kontrollid/` all: `ui-result.json`,
`block-removal-unit-result.json`, `block-removal-dom-result.json`,
`block-removal-typescript-result.json`, `build-result.json`,
`public-client-marker.json`, `profile-receipt-helpers-result.json` ja
`deployment-marker-result.json`. Uue SQL-i 12 runtime-katset ja 7 paigalduse/
tamper-katset läbisid, sisendimuutusi 0. Täpne vana keha jõudis uue triggerini
ja keeldus; NOSUPERUSER postgres CAS töötas ning SET ROLE writer oli keelatud.
Säilitatud creator ADMIN-only kirje ei anna SET/INHERIT õigust. Tõendid on
uue repair'i runtime-result.json ja installation-result.json.

Lõpliku manifestiga seotud ajutise Giti tarnevoo ja sõltumatu ülevaatuse tõendid
on paki kontrollid/client-first-flow-final.json, delivery-review-final.json ja
sql-independent-review.json. Pakett väljastatakse ainult nende PASS-tulemusega.
Tarnevoos on täielik index/source/Git/receipt-lock tee tegelik, teenused,
build ja ajaloolise commit'i mapping sünteetilised. See ei käivita Maci ega pilve.

Päris brauseri/native-dialoogi/CSS-i katset siin ei väideta. Olemasolev
keskkonnapiir ei muutunud ning sama blokeerunud browser-jooksu ei korratud.
ReactDOM kontrollib päris komponente sünteetiliste HTTP/Auth/Next piiridega.
Lokaalne SQL-fixture ei asenda hosted ACL-i, Maci CLI-d ega päris paralleelseid
PostgreSQL-sessioone. Uus Maci rakendamine, SQL, commit/push, Ready ja sihitud
hilinenud kinnituse kasutuskäik on eraldi järgnevad tõendid.
