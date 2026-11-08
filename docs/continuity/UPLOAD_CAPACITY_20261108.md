# 08.11.2026 — ajutise üleslaadimisruumi paranduse r2

See on praeguse hobuse kahe fotoga avaldamise tõend ja paranduse ulatus.
Üks tööjärg on [CURRENT_STATE.json](CURRENT_STATE.json); praegune paigalduskäsk
ja kasutaja jätkamissammud on [HOSTED_PORTAL.md](HOSTED_PORTAL.md).

## Esimese ruumipaketi peatus ja täpne põhjus

Kasutaja tagastas `selqiro-uleslaadimise-ruum-20261108-result.json` faili.
Faili SHA-256 on
`bd8a76d4e3c3d73763ef8acd669dec2ee9d13af89726962c371baba93e3588da`;
peatunud release on
`24c41b2440d0dec3f2fd2708b2b44afd843271f024d4419554834b47c451eb5d`.
08.11.2026 kell 12:58:09 UTC / 14:58:09 Eesti aja järgi alanud käik peatus
`baseline_verified` etapis veaga `DATABASE_PRECONDITIONS_NOT_MATCHED`.
`database=not_started`, `build=not_run`, `commit=null` ja `push=not_run`;
lähtefailide uuendamine ega SQL-i rakendamise kavatsus ei alanud.

Tagastatud tõendis kontrolliti täpset väljastatud paketti, 1165 alusfaili ja
Giti objekti, 41 esialgset failiseisu, 1151 kaitset ning eduka hobuse r2 päeviku
seost. Vana peatus ei näita katkist hobusepaigaldust ega kasutaja valesti tehtud
sammu. Ainus väär eeltingimus oli `functions` nimega koondkontroll, mis hõlmab
lisaks funktsioonidele ka seotud struktuure, õigusi ja vaateid.

Ruumiparanduse uus kontroll kaasab kõik funktsioonid neljas privaatses skeemis.
Meie kohalikust kontrollalusest puudusid 17 varasemast väljalaskest säilivat
privaatset funktsiooni. Nende määratlused, algsed omanikud ning õigused taastati
täpselt hoidla säilitatud `listing-publication-hosted-preview-v1` SQL-ist.
See taastootis mõlemad tegeliku raporti räsid:

| Võrdlus | Tegelik ja taastatud tulemus |
| --- | --- |
| Olemasolevad funktsioonid | `93b95bd4c438853375365a1480e4fd08dbdddb759d16995f9bbdff15dc240b0e` |
| Kontrollitavad sõltuvused | `bd0d02ea9d228af46cf3f6a016bc985a4b7edffffa7c157e94c389440194fa38` |
| Veel paigaldamata võime lähtekuju | `d043db1cd2e5ab796ad82e82c1281f04670adf36f0861be198befe9012f7b7d1` |

Viimane räsi oli juba esimeses paketis õige ja jäi muutmata. R2 ei õpi lubatud
määratlusi pimesi tootmise räsist: taastatud funktsioonide allikas ja õiguste
järjekord on varasemas lähtekoodis. Kontrolli ulatust ei kitsendata, tundmatut
kõrvalekallet ei lubata ning tootmise õigusi ei muudeta eelkontrolli läbimiseks.

Praegune pakett on `selqiro-uleslaadimise-ruum-20261108-r2.zip`. Viis rakenduse
runtime-faili ning kolm SQL-i tööloogika moodulit on esimese kandidaadiga
bait-baidilt samad. Muutuvad kohalik kontrollalus, genereeritud paigalduskaitsed,
nende testitõendid ja üleandmine. Varasem pakett ning peatunud päevik säilivad;
parandatud pakett lähtub endiselt edukast hobuse r2 paigaldusest. Täiendavat
kasutaja diagnostikakäiku pole selle põhjuse tuvastamiseks vaja.

## Kinnitatud lähtealus

Esimene hobusepakett peatus enne muutmist; selle vana peatuse raport ja päevik
säilivad. Hilisema r2 eduka paigalduse privaatne tulemus kinnitab `complete`,
andmebaasi kontrolli, läbinud build'i ning kontrollitud push'i. Uue ainult
lugemise raporti lähtealus on puhas `main` commit
`6bb438519570faa0e42f56e0670e32965cfd62fb`, vanem
`92408b6ceb7a9fec3119d35a86c9bb47628acf22`, kokku 1165 lähtefaili.
R2 paigaldust ei käsitleta enam ootel tööna ega käivitata uuesti.

Tagastatud raport:
`selqiro-hobuste-ruumi-raport-20261108-134928-0b3594e6.zip`.
ZIP-i SHA-256:
`2e50d5516d25c4f73bc77163d0cb03bce55489989e096c45c514312c1f0200d7`.
Kontrolliti viit ohutut unikaalset kirjet, CRC-sid, nelja manifestikirje räsi,
täpset väljastatud kogujat ja päringu ulatust. Koguja manifesti räsi on
`c27d5898afa2743af1ca7c9e3fdc85c127c4a698c49f1e7854f5a2e20ff645b1`.
Eduka r2 tulemuse räsi raportis on
`750ce3699c24c43d779c10016a5a5715143f832a0b3be550feb4ea2d2678daec`.

Andmebaasi vaatlus on 08.11.2026 kell 13:49:29.773089 Eesti aja järgi.
Raporti enne/pärast lähtepuu, indeks ja paigalduspäevik kattuvad; kõik 43
registreeritud käsku lõppesid koodiga 0. Kontroll ei muutnud projekti,
andmebaasi ega pilte. Säilitatud eduka paigalduse tõend ei ole uus remote'i või
aktiivse Verceli deployment'i kontroll.

## Miks kaks fotot ei mahtunud

Kasutaja ütles, et valis kaks uut fotot. Tagasi lükatud hobusetoimingut raportis
salvestatud käsuna ei olnud; fotode arv on kasutaja kinnitus, mitte SQL-ist
järeldatud sisend.

| Arvestuse osa | Reserv |
| --- | ---: |
| 7 avaldatud pildi koristamist ootavat SOURCE-algfaili, igaüks 25 MiB | 175 MiB |
| 21 juba avaldatud WEB-galeriipilti, igaüks 4 MiB | 84 MiB |
| Senine kokku | 259 MiB |
| 2 uut fotot, igaüks 25 + 4 MiB | 58 MiB |
| Vana kontrolli tulemus | 317 MiB |
| Vana tehniline lävi | 300 MiB |

Vana arvestus ületas läve 17 MiB võrra. See ei tõenda konto tegelikku
andmemahtu, teenusepakkuja mahu täitumist ega kokkulepitud ärilist kontopiiri.
Raport hõlmas sama kasutaja kahte identiteeti ning näitas 18 varasemat toimingut,
44 objekti, 28 arvestuses objekti ja 16 täielikult kustutatuks kinnitatud objekti.
Kõik arvestuses objektid kuulusid avaldatud tavakuulutustele või fotolisamistele.
Avatud toiminguid, arvestuses terminalseid objekte, aktiivseid koristuslease'e
ja kustutatuks märgitud kuid endiselt arvestuses objekte oli null.

Seitse SOURCE-objekti vastasid ainult lugemise rea-põhisele sobivuskontrollile.
See polnud koristusluba ega tõend nende füüsilisest puudumisest; arendustöö neid
objekte ei kustutanud.

## Paranduse otsus

Kasutaja soov on lubada kontol mitusada kuulutust; täpne piir pole kokku lepitud.
300 MiB jääb poolelioleva üleslaadimistöö ajutiseks kaitseks. Avaldatud galerii
WEB-objektid ei kasvata seda arvestust. SOURCE-reserv vabaneb alles pärast
olemasoleva Storage'i puudumiskontrolli ja seotud püsiva tulemuse kinnitamist.

Sama vaatluse parandatud kontroll on `175 + 58 = 233 MiB`: kaks uut fotot
mahuvad juba enne varasemate SOURCE-failide koristamist. See arvutus ei peida
koristusjärjekorda ega kirjuta reserviridu ümber. Senised vastuvõetud
kustutustõendid, sealhulgas vanema/abitoimingu tõendid, säilivad: optimeerimine
ei lisa juba lõpetatud objekte uuesti arvestusse. Ilma uute fotodeta toiming
jätab vahele ainult selle baitide kontrolli; ülejäänud tingimused säilivad.
Kolme avatud toimingu ja 20 uue toimingu/24 h eraldi kasutuselevõtukaitsed
jäävad praegu alles. Need ei määra tulevast avaldatud kuulutuste arvu ning
vajavad enne laiemat kasutust eraldi tooteotsust.

Piiratud taustatöö saab lõpetada sama algse kasutaja avaldatud SOURCE-objekte
ka tema teise lubatud identiteedi alt, kontrollides iga kord praegust aktiivset
identiteeti ning ligipääsu sihtidentiteedile. Aktiivset identiteeti ei vahetata.
Üks käik on kuni 20 kinnitatud objekti ja 25 sekundit; WEB-fotosid see võime
kustutada ei saa. Täpse ruumikeelu järel lubatakse vaid üks muutmata
ettevalmistuskäsu kordus, kui vähemalt üks SOURCE-koristus on kinnitatud.
Teadmata tulemusi ei korrata edu oletades.

Täielik leping: [upload-capacity-v1.md](../architecture/upload-capacity-v1.md).

## Kontrollid ja tõendi piir

Esimese kandidaadi säilitatud tõend: 31 koristustöö ja 36 HTTP-käsitleja
sünteetilist katset läbisid, samuti
198 asjakohast senist runtime-regressiooni ja TypeScripti kontroll. Viie
muudetud runtime-faili ESLint läbis hoiatusteta. `npm run build -- --webpack`
lõppes koodiga 0 ja kestis 28,29 sekundit; kasutati sünteetilisi kooste seadeid,
mitte tootmise saladusi. Need katsed ei teinud päris Authi, Storage'i ega
andmebaasi toiminguid. SQL-kaitsete genereerimine, 10 paigaldusseisu/õiguste
kõrvalekalde ja rollback'i juhtu ning uuendaja 20 ajutise Giti juhtu läbisid.
Kõik kaheksa SQL-i käitumiskatset läbisid eraldi PostgreSQL/WASM-i keskkonnas,
sealhulgas 300 varasema kuulutusega juht ja vana SOURCE-kustutustõendi säilimine.
See tõendab nende näidisandmete käitumist, mitte tootmise kiirust ega päris
samaaegsete tehingute ajastust. Täpse koostatud paigalduspaki ja ZIP-i lõpptõendid
koondatakse paki tarnearuandesse. R2 kontrollaluse taastamise ja parandatud
paigalduskaitsete värsked kontrollid on eristatud nendest varasematest
runtime/build-tulemustest.
Ükski kohalik kontroll ei tähenda uue paranduse paigaldust Macis, uut
Verceli Ready tulemust ega kasutaja avaldamiskatse õnnestumist.

## Kasutaja vastuvõtt ja järg

Pärast parandatud r2 paigaldust ja selle commit'i Ready / Production tulemust
värskenda senist hobusevormi. Vajuta **Kontrolli salvestatud tulemust**.
Kui küsitakse algfaile, vali **Vali algfotod** kaudu need samad kaks fotot ning
vajuta **Jätka**. Olemasolev jätkamiskood kontrollib esmalt salvestatud tulemust;
`not_found` korral valmistab see ette sama säilitatud käsu ja võtme. Päevikut
pole vaja käsitsi kustutada ega uut dubleerivat kuulutust alustada.

Vastuvõtu tulemus on sama hobusekuulutuse nähtav avalik detail mõlema fotoga.
Teenused järgnevad kanoonilise `services` UUID ning sama Avalda ja Minu ala
Muuda/Salvesta loogikaga. Eraldi kohustuslikku mustandisalvestust ei lisata.
Töökuulutused tulevad hiljem. EN/ET ja varem vastu võetud üks 9-sekundiline
fotolisamine säilivad; neid katseid ei korrata ilma uue regressioonita.
