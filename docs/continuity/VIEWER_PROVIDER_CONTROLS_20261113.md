# Pakkuja peitmine 24 tunniks ja eraldi kasutaja blokeerimine

13.11.2026 Europe/Tallinn. Kasutaja kinnitatud tooteotsuse teostus.
Üks praeguse töö, kontrollide ja Maci/pilve tõendi seis on `CURRENT_STATE.json`.
Allpool kirjeldatud lähtekood ei ole iseenesest tõend tootmises rakendamisest.
Teenuse aastase kehtivuse vastuvõetud commit `955c935` jääb selle sammu aluseks.

## Kasutajale nähtav tulemus

Tava- ja hobusekuulutuse ning teenuse kaardil on eraldi pakkuja menüü.
Menüü avamine ei ava kuulutust. **Peida pakkuja 24 tunniks** eemaldab selle
identiteedi pakkumised vaataja otsingust ja avastamisest. **Blokeeri kasutaja**
rakendab senise kontodevahelise püsiva blokeeringu. Mõlemad on tasuta.

Pärast kinnitatud peitmist saab valida **Võta tagasi**. Minu ala jaotises
**Peidetud ja blokeeritud** on eraldi peidetud pakkujad ning blokeeritud
kasutajad koos nime ja avatariga/logoga. Loendid on serveris lehekülgedeks
jaotatud, 25 kirjet korraga. **Näita uuesti** eemaldab ainult ajutise
peitmise; **Eemalda blokeering** eemaldab ainult enda seatud blokeeringu.

Peitmine kuulub vaataja kontole ja sihib üht pakkuja identiteeti. Vaataja
enda identiteedivahetus seda ei tühista. Tähtaeg on 24 möödunud tundi serveri
kella järgi. Lehe avamine, värskendamine või sama peitmise kordus ei pikenda
juba käivat perioodi. Aegumine ei vaja koristustöö käivitumist.

Püsiv blokeering ei aegu automaatselt. See kasutab olemasolevat `user_blocks`
registrit. Sõnumi saatmise keeld jääb mõlemasuunaliseks; olemasolev vestlus ja
selle ajalugu säilivad. Teise konto seatud blokeeringut ei saa eemaldada.
Server lahendab konto sisu liigile vastava lepingu järgi: tavakuulutuse
kasutajakonto, hobusekuulutuse looja või teenuse ja profiili eraisiku kasutaja
või ärikonto praegune omanik. Vestluse puhul kasutatakse tegelikku salvestatud
osapoolt, kes võib erineda ärikonto omanikust. Klient kontot nähtava nime
põhjal ei oleta.

## Teostuse piir

Uus privaatne peitmise tabel hoiab konto, pakkuja identiteedi, täpse revision'i
ja tähtaja. Tabeli otseõigusi brauserile ei anta. Väikesed entity/API-, hook- ja
komponendimoodulid kasutavad ühist serveri lepingut. GET vastus on seotud
kutsuva konto ja sihiga; SET kontrollib sama sihti uuesti lukustuse all.

Koguarv, nähtavad tulemused ja lehekülg lähtuvad ühest serveripäringust.
Filter on ühendatud kombineeritud tava/hobuseotsingusse, teenuseotsingusse,
vanadesse tavaotsingutesse, vana avalehe kahte RPC-sse ning jälgitavate voogu.
Kliendis pärast lehekülje laadimist peidetud ridade äralõikamist ei kasutata.
Vana avalehe/feed'i lugemine on eraldatud väikestesse moodulitesse ning seotud
võetud kontoseansi, päringu ja eelistuste revision'iga.

Ajutine peitmine ei ole üldise avaliku nähtavuse kontrolli osa: otse avatud
profiil, detail, meedia ja olemasolev vestlus säilitavad tavalised õigused.
Püsiv blokeering jääb nende senistesse õiguskontrollidesse; avaliku profiili
lahendaja kontrollib mõlema suuna blokki pärast sama profiili valimist.
Blokeeritud profiili asemel ei valita mõnd teist sama nimega profiili.

Mõlema toimingu oma võrdlusväljad on eraldi. Peitmise UUID revision ja
blokeeringu rea ID/täpne loomisaeg ei asenda teineteist. Vana Undo ei eemalda
hiljem uuesti peidetud pakkujat. Katkenud võrguvastus ei käivita uut kirjutust:
kasutaja loeb salvestatud seisu ja vajadusel kinnitab uue toimingu teadlikult.

## Kontrollid ja tõendi eristus

Kontrollide täpsed lõpptulemused ning paki failiräsid on seisukirjes ja paki
`kontrollid/` kaustas. SQL-i käitumist katsetatakse PostgreSQL/WASM-i sünteetiliste
andmetega; liidese ja transpordi katsetes on Auth/HTTP/Next-i teenusepiirid
märgitud. Fixture’i rakendusfailid on seotud lõpetatud build'i räsidega. Päris
brauserikatse peatus siinse keskkonna ligipääsu-/turvareeglil; brauseri PASS-i
ega visuaalset vastuvõttu ei väideta.
Need tõendid ei asenda Maci lõppraportit ega Verceli Ready / Production pilti.

Uus SQL kontrollib säilitatud funktsioone, õigusi, indekseid ja olemasolevat
hosted-konteksti enne aktiveerimist. Olemasolevaid teenusekuulutusi, kehtivusi,
rubriike, fotosid, sõnumeid ega kontosid selle mooduli paigaldus ei muuda.
Väljastatud vanade pakettide SQL-i ega paigaldajaid ei kirjutata ümber.

Päringuplaani kontroll saab kinnitada peitmise indekseeritud ja ühe päringu
sees piiratud lugemist. See ei kinnita miljonite samaaegsete otsingute
koormusvõimekust. Päris reklaami- ja soovituslugejad peavad tulevikus kasutama
sama peitmiseelistust; sellesse sammu uut reklaamisüsteemi ei lisata.

## 13.11 kontrollitud jätk pärast esimest katset

Maci esimene apply-katse jäi 50s välise CLI piiri järel kinnitamata.
Teine edukas preflight kinnitas toe puudumist ning kõigi 16 kaitse vastavust;
algne updater peatus õigesti uut apply'd kordamata. Esimese katse ajalooline
unknown jääb alles; üks puudumise lugemine ei tõenda selle täpset serverikäiku.

Eraldi jätkupakk hoiab vana päeviku muutmata ja lukustatuna ning kasutab
oma päevikut. See võib täpse värske absent-seisu korral teha ühe uue katse
sama SQL-iga. Värske applied vajab eraldi verify'd; uus unknown ei käivita
kordust. Runtime'i ja tootelepingut ei muudeta. Täpne uus käsk on
`HOSTED_PORTAL.md`-s, täitmise piir `CURRENT_STATE.json`-s.

## Üks järgmine kasutuskäik pärast Maci sammu

1. Käivita `HOSTED_PORTAL.md` täpne käsk ja saada selle jooksu täpne raport.
2. Kontrolli raporti uut commit'i Vercelis olekus **Ready / Production**.
3. Teise olemasoleva kontoga peida otsingukaardilt pakkuja. Tema pakkumised
   kaovad selle konto otsingust; otse avatud profiil ja sõnumiajalugu säilivad.
4. Vali **Võta tagasi** või Minu alas **Näita uuesti**. Pakkumised taastuvad.
5. Blokeeri sama kasutaja. Kontrolli nähtavust ning sõnumite saatmise keeldu
   mõlemal kontol; olemasolev ajalugu peab alles olema.
6. Eemalda enda blokeering Minu alas. Eraldi peitmine või teise poole seatud
   blokeering peab alles jääma. Kontosid, kuulutusi, pilte ega sõnumeid ei kustutata.

Vana avalehe ja jälgitavate voo päris PostgREST-päring ning pildid/tõlked
kontrollitakse samas kasutuskäigus. Testi jaoks ei muudeta tootmise kellaaega
või andmebaasiridu käsitsi. Täpne 24 tunni piir on kaetud kohaliku SQL-katsega;
päris aegumise tõend tekib hilisema tavapärase kasutuse ajal.

Arhitektuuri täpne leping: `../architecture/provider-controls-v1.md`.
Otsusepaki algsed dokumendid on säilitatud
`history/provider-controls-decision-20261113/` all. Vanad 7 päeva ettepanekud
on ajalugu; kehtiv kasutaja otsus on 24 tundi.


<!-- SELQIRO_PROVIDER_CONTROLS_OPTIMIZED_PREPARED_20261113 -->
## 13.11 kell 15:26 kinnitatud lugemistulemus ja uus optimeeritud väljaanne

See sissekanne on selle dokumendi praegune jätk. Eespool olev esimese katse
järgne jätkupaki ettevalmistus säilib ajaloolisena; selle käsku ei korrata.
Praegune üks käsk on `HOSTED_PORTAL.md`-s. Tooteleping ja rakenduse runtime on
endiselt samad: 24 möödunud tundi, ühe identiteedi peitmine vaataja kontol ning
eraldi püsiv kontodevaheline blokeering. Muudatus pole veel tootmises vastu võetud.

### Kolm muutmata tõendit

| Jooks | Täpne raportifail | SHA256 | Baiti |
| --- | --- | --- | ---: |
| Algne viimane peatus | `selqiro-pakkuja-peitmine-20261113-raport-20261113-133309-36fd7fe42b49.json` | `4df69e2947e853371aaed548c70571c254e28b226552d9eb2d49e80139ad4a5a` | 252737 |
| Recovery peatus | `selqiro-pakkuja-peitmine-jatk-20261113-raport-20261113-141635-a0e63561af29.json` | `fe924a9733477e40a93c7a0d2f8a5a9eb93b237248eaab29ace51881a9d67d53` | 256279 |
| Lõpetatud lugemiskontroll | `selqiro-pakkuja-peitmine-kontroll-20261113-raport-20261113-152639-0954d1c751c3.json` | `3415a99e13217300291e09bce19cdcc583f92f4f373601b8decc8e0bc8857f0f` | 29868 |

Nende väljaannete manifestid on järjekorras
`9bc2351ad92c7acf848b1d4180f17597eb9ade9075e22f0e0e5348808adc1802`,
`e0b7550f2a46a9db7d1bc2d67c6da07947e4c1b4662812c832bd75536f4d7a75` ja
`c931ee7a0b2ece80a555cf2aff03f0d650d0490f168dd07dea7eb7086e2aad83`.
Probe’i täpne nonce on `d96503f7d5314ed1bc5945f2a9ded183`.

Recovery tegi ühe apply, mis lõppes 80,614 s järel exit 1-ga. Selle 180 s
välist ajapiiri ei ületatud. Järgnev 18,934 s verify kinnitas absent-seisu,
kõik 16 kaitset ning samad invariandid. Source/build/commit/push ei alanud.
Varasem 50 s timeout ja vana intent säilivad ajaloolise teadmata tulemusega;
hilisem puudumise lugemine ei kirjuta selle tehingu ajalugu ümber.

`supabase_logs.json` (251119 B, SHA256
`51ada5cd565387c6ea73cd50366ee0cc70fd39a93da1d152b8075af4e6c9bbed`) sisaldab
11 sündmust. 57014 `canceling statement due to user request` on
14:16:15.901 Tallinn, 0,143 s enne recovery CLI lõpu ajatemplit. Kirje ei anna
katkestaja päritolu, PID/session/request seost ega tõenda inimese tegevust.
Kolm pikka välja on 80003 märgi juures kärbitud; nähtav SQL-algus vastab
algsele apply’le, tegelik plaan ja JIT/seansi info puuduvad. Põhjust ei nimetata
selle ekspordi põhjal lõplikult tuvastatuks.

### Mida värske ainult lugemise kontroll tõendab

15:26:04–15:26:39 Tallinn tehtud jooks lõppes `complete_readonly` olekus.
Kolm kohalikku Git-lugemist ja kolm SQL READ ONLY kutset õnnestusid.
Metaandmete CLI kestus oli 7,257 s, plaani oma 14,471 s ning sama kontrolli
lugemine 13,363 s. Need on väliskutsete kestused, mitte SQL-i täitmisajad.
SQL-i 20 s ja CLI 90 s piirid säilisid. Andmebaasi, portaali lähtefaile,
Storage’it ega Giti ei kirjutatud; buildi ega paigaldusjätku ei käivitatud.

Vastuseks oli absent ja kõik 16 kaitset olid tõesed. Vastus võrdus täpselt
algse ja recovery-jooksu kontrolltulemustega. Hosted-kontekst ja kolm invarianti
säilisid. Metadata hetkel puudusid selle installeriluku hoidjad ja ootajad;
see on üks hetkeseis, mitte garantii tulevase päringu või varasema tehingu kohta.

Maci main/HEAD oli `955c935fa4e901a8b81885e2dcd18d966d651810` ja git status puhas.
Kohalik origin-konfiguratsioon vastas kinnitatud GitHubi aadressile.
Probe ei arvutanud värskelt kogu 1607 lähtefaili/indexi räsi ega võrrelnud
GitHubi remote-main’i. Recovery varasem täielik lähte/indexi tõend on ajalooline;
uus paigaldaja peab selle värskelt kordama enne kirjutusi.

Probe’i lõppkontroll kinnitas päris Maci jooksus mõlema vana päeviku täielike
baitide, räsi, inode’i ja metaandmete säilimist. Olemasolevad lukud olid
hoitud ainult lugemiseks. Raporti `prior_journals_preserved=true` on nüüd
saadud tulemus, mitte tulevase skripti kavatsus. See ei tõenda peitmise paigaldust.
Terminali 15:31:27 pilt kinnitab lugemiskontrolli lõppu ja sama täpset
`SAADA SEE FAIL` rada; eraldi Finderi akna pilti pole vaja sellest tuletada.

### Päringuplaan ja JIT-i tõendi piir

JIT oli metadata järgi juba konfiguratsioonis `off`, ilma probe’i ülekirjutuseta.
Ka vaikeplaanis oli `jit=off` ja JIT-objekt puudus. Seetõttu ei tõenda viimase
lugemise `SET LOCAL jit=off` edu sisse-/väljalülitamise mõju ega varasema
katkestuse JIT-põhjust.

Tootmise `EXPLAIN ANALYZE FALSE` kokkuvõte: 4355 sõlme, 733 initplan’i,
457 subplan’i, 145 CTE scan’i, maksimaalne sügavus 10 ja planeerimisaeg
445,744 ms. See ei täitnud kontrollpäringut. Raport ekspordib plaani kokkuvõtte
ning 2992414-baidise väljundi räsi; kogu toorplaani pole raportis. Plaani
korduv struktuur on mõõdetud paranduskoht, kuid ei tõenda üksinda vana
katkestuse põhjust ega tootmise täitmisaja võitu.

Kõigi 63 listings-veeru nimed, järjekord, tüübid ja not-null kuju vastasid
kohalikule fixture’ile. Veergudel `price_amount`, `price_kind`, `currency`
oli tootmises ACL-i väärtus olemas ning fixture’is puudus. Täpseid ACL-kirjeid
probe ei eksportinud. Kogu skeemi või kõigi õiguste võrdsust ei väideta ega
tootmise veeruõigusi selle parandusega kopeerita või muudeta.

### Ettevalmistatud kontrollpäringu parandus

Uus eraldi `selqiro-pakkuja-peitmine-parandus-20261113` säilitab täpselt samad
122 payload-teed, algsed preimage’id, kõik 12 SQL-runtime-moodulit ja
rakenduse käitumise. Kontrolli koostaja materialiseerib 11 struktuurselt
valitud CTE-d, et sama kataloogiseisu ei planeeritaks paljudes harudes uuesti.
SQL-i literaalides olevaid funktsioonide definitsioone ei asendata tekstina.
Kontrollraporti väljad, 16 kaitset, räsivalemid, õiguse/sõltuvuse pinid ja
säilitatavad invariandid jäävad samaks.

Kolm tehinguväravat nõuavad täpselt ühte tulemust ja sõnaselget true-vastust;
NULL, puuduv väli, false või vale ridade arv peatab tehingu. Sama advisory-lukk,
luku all värske kontroll, täpse applied-seisu korral DDL-i vahelejätmine ja
eraldi verify säilivad. Algset väljaantud SQL-i ega vana pakki ei muudeta.

Uued sihitud SQL-kontrollid on 11/11 PASS, sealhulgas 14 range värava alajuhtu.
Sama disposable PostgreSQL/WASM-i ANALYZE FALSE võrdluses vähenes plaan
4623 sõlmelt 1075-le, initplan’ide arv 733-lt 187-le ja subplan’ide arv
457-lt 97-le. See võrdlus ei ole tootmise 4355-sõlmelise plaani uus mõõtmine
ega päringu täitmisaja või pilve jõudluse tõend. Täpsed sisendräsid ja piirid
on paki kontrollid/ kaustas.

Uus väljaanne hoiab kõiki kolme ülal nimetatud täpset päevikut O_RDONLY
lukuga kogu workflow vältel ja kontrollib nende täielikke baite/metaandmeid
uuesti. Probe’i nonce on pinitud; suvalist viimast raportit ei otsita.
Oma uus privaatpäevik seob intendi uue release’i, uue SQL-i ja kolme läbi
vaadatud raportiga. Vana intent’i ei kloonita ega nullita. Värske absent lubab
ühe katse ainult selle uue väljaande varasema kirjutuseta seisus. Unknown või
oma varasem katse ei anna automaatse korduse luba. Värske applied nõuab eraldi
verify’d ega omista selle paigaldajat oletuslikult mõnele vanale jooksule.

Alles verified-tulemuse järel toimuvad source/build/commit/push. Uuendaja
kontrollib uuesti tegelikku haru/HEAD-i, kõiki algseid faile, tervet indexit
ning kinnitatud remote’i. Kohaliku kontrolli ja tarnevoo tõendid on paki
`kontrollid/` kaustas. Need eristavad sünteetilist SQL/CLI/buildi piiri päris
kohalikest lukkudest ja Gitist. Päris brauseri, uue Maci paigalduse, Verceli
või kasutajavastuvõtu edu nendest ei järeldata.

Üks järgmine kasutuskäik jääb eespool kirjeldatuks, kuid algab nüüd ainult
uue `parandus`-paki käsuga. Kõik eelmised päevikud, raportid ja pakid säilivad.
Vanad peatumised ning lõpetatud diagnostika on ajalugu; neid ei käivitata
automaatselt uuesti. Üks praegune seis on `CURRENT_STATE.json`.
