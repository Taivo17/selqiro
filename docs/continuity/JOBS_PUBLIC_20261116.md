# Töö, jagamine ja värvid — ettevalmistatud väljaanne 16.11.2026

## Lähtealus ja tõendipiir

Vastu võetud alus on main `447d1a46a09f7fb6b907c2526e6164f0c88f2098`,
Git-puu `7e82726f2106f16b042944a925da058513d304a4`, 1776 faili. Selle tegelik
raport on 264629 B, SHA256
`ee196c4f11c950198da71dd43c3ff0a34d9ac57b40fdc43d9027d11befc07e6a`.
Ready / Production ja eestikeelse seisupildi kasutajavastuvõtt on kinnitatud.

Uus töö tehti nende baitidega kontrollitud eraldi kandidaadis. Siin pole uut
Maci kirjutust, GitHubi push'i, hosted SQL-i ega deployment'i. Kolm täpset
baasi continuity-faili säilivad `history/jobs-public-base-447d1a4-20261116/`
all. Varasemaid väljastatud pakke, andmeid ja päevikuid ei muudeta.

## Mida väljaanne sisaldab

Töö on kohe avalikus otsingus, ettevõtte profiilis ja otseviitel. Minu ala
omanik saab pakkumist lisada, muuta, peatada, lõpetada ning ühe UTC
kalendrikuu reegliga pikendada. Avaldaja õigus tuleb ettevõtte identiteedist;
Energy ostu ega tasulist Business-taset ei nõuta. Üks Avalda tegevus kasutab
mõlema kirjutuse püsivat tunnust; teadmata tulemus vajab lugemist ja selget
jätkamist. Tavapärane muutmine ei pikenda tähtaega ega uuenda otsingukohta.

Jagamisnupp on kuulutusel, hobusepakkumisel, teenusel ja tööl. Link on puhas
kanooniline avalik detailitee. Native share, kopeerimine ja käsitsi valitav
link on ühe mooduli eri tulemused. Metaandmed loetakse ainult anonüümsest
avalikust RPC-st. Omaniku lugemist, küpsiseid ega service-role võtit ei kasutata.

Üks värviallikas seob kuulutuste merevaigukollase, teenuste türkiisrohelise
ja töö sinise lisamis-/avaldamisnupu ning pakkumiskaardiga. Värvile lisandub
tekstisilt. Sõnumimullide saatja eristus säilib. Praegune vestlusteema ja
iga sõnumi ajalooline pakkumiskaart on eraldi; teema vahetamine ei kirjuta
vanade sõnumite kaarte ümber. Kontaktinupp ise sõnumit ei saada.

## Kohalikud kontrollid

| Kontroll | Täheldatud tulemus | Piir |
| --- | --- | --- |
| Töö kliendi sihtjuhtumid | 22/22 PASS | Päris TS/TSX, sünteetiline HTTP/Auth/kviitung |
| Jagamine ja metaandmed | 10/10 PASS | Native clipboard/share/crawler tegelikult käivitamata |
| Sõnumikonteksti klient | 8/8 PASS | React SSR ja sünteetiline lõime vastus |
| SQL-i sihtkontrollid | 17 PASS | PGlite PostgreSQL/WASM, sünteetilised kasutajad/andmed |
| Tervikbuild ja TypeScript | PASS, 729 sisendit, drift 0 | Olemasolevad lukustatud sõltuvused, inertsed build-võtmed |
| Brauser | BLOCKED | CUA ei pääsenud kohalikule HTTP-serverile |
| Uuendaja jätk/raport/protsess | 14 + 8 sihtjuhtu | CLI/remote/Maci osad sünteetilised; lõpptõend kontrollid/ all |

SQL-i test töötab mitte-superkasutajast paigaldajaga, kellel pole Auth-skeemi
või auth.uid() grant-option'i. Uued õigused ei eelda hallatud Auth-õiguste
ümberjagamist. Kontrollid hõlmavad salvestuse ja avaldamise kviitungit,
muutumatu päringutunnuse kordust, konto/identiteedi piire, täpset revisjoni,
rahateksti, kuu lõppu ja liigaastat, UTC väljundit, aegumist ja peatatud
pakkumise pikendust, stabiilseid kursoreid, konto blokki ning ajutist peitmist.
Olemasolevate funktsioonide, struktuuri, õiguste ja Auth-i invariandid
säilivad. Kontekstikatsed kasutavad vana teenuse-, hobuse- ja tavakuulutuse
päris SQL-i; ajaloolised sõnumikaardid säilivad.

PGlite serialiseerib seansse: hilinenud/revisjonikonflikti katsed ei ole
native PostgreSQL-i paralleelseansside tõend. Hosted andmebaasi ei ühendatud.
Täpne jooks ja räsidega sisendid on
`supabase/repairs/20261116_jobs_public/runtime-result.json`-is. Varasemad
fixture-katsete ebaõnnestumised ja täpsed parandused säilivad sama kataloogi
`tests/test-history.json`-is. Neid ei peideta lõpliku PASS-i taha.

Kliendi lõplik ühiskäsk on kolm uut sihttesti ühe node --test käsuga. Build
lõpetas 31 staatilist lehte. Esimene build väljus 0-ga, kuid selle ajal
muutusid kolm kitsast veateate moodulit; esimese jooksu sisendid ja tulemus
säilivad ning lõplik build seostub muutumatute baitidega. Pärisbrauseri
paigutus, native share, väljalogitud jagatud link ja uus kasutustee vajavad
Maci/pilve paigalduse järel tegelikku kontrolli. Ühenduspiiri ei välditud.

## Tarne ja katkestusest jätk

Uus pakett on `selqiro-too-ja-jagamine-20261116.zip`. Ainult selle
`HOSTED_PORTAL.md` käsk on praegune jätk. Uuendaja kontrollib 447d1a4 kogu
aluspuud/indexit/tööpuud, kinnitatud remote'i ja eelmist edukat privaatset
päevikut. Kõik muudatused on lubatud failide nimekirja ja eel-/järelräsiga.

Järjekord on allikad → sihttestid/build → värske andmebaasi preflight → üks
lisav SQL-tehing → sõltumatu verify → täpne commit/push. Ebaselge SQL-vastuse
järel tehakse ainult lugemine. Varasema kirjutusjäljega absent või tundmatu
seis peatab; kviitungit ei nullita ja DDL-i automaatselt ei korrata.

Raport on selle jooksu privaatne unikaalne Downloads-koopia. Terminali
`SAADA SEE FAIL` näitab täpset faili ja Finderi avamine on piiratud viiele
sekundile. Kopeerimise nurjumisel näidatakse kontrollitud originaali;
kirjutusvea järel viimast püsivat raportit nimetatakse võimalikuks vanaks
seisuks. Kõik varasemad päevikud ja koopiad säilivad.

Lõpliku paki `kontrollid/loplik-kontroll.json` ja
`kontrollid/sealed-release-result.json` seovad payloadi, helperid, kogu
Git-puu, päris ajutise indexi/commit'i/kohaliku bare push'i ning katkestuse
järel jätkamise. Ajalooliste commit'ide identiteet, Maci kodukataloog,
remote'i esitlus ja SQL-CLI on selles tarnekatses sünteetilised. Test ei
teeskle GitHubi ega Supabase'i tegelikku kirjutust.

## Järgmine tõend

Uue updateri tegelik raport → sama uue commit'i Ready / Production → üks
uue töö avaldamise/profiili/otsingu/jagatava lingi/kontakti kasutustee.
Sotsiaalmeedia tegelik eelvaade ja välise veebikaitse mõju pole build'i
metaandmete testiga kinnitatud. Varem vastu võetud laiu katseid ei korrata.

Üks autoriteetne seis on CURRENT_STATE.json; loetav handoff on sellest
samast failist genereeritud. Püsileping on docs/architecture/jobs-public-v1.md.
