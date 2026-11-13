# Pakkuja peitmine 24 tunniks ja kasutaja püsiv blokeerimine

13.11.2026 Europe/Tallinn. Kasutaja kinnitatud tooteotsus.
See asendab 11.11 esialgse 7 päeva soovituse. Uus kestus on 24 tundi.
Mooduli runtime-koodi, SQL-i ega paigaldajat selles dokumendipakis ei ole.
Teenuse aastase kehtivuse paigaldus ja vastuvõtt commit'il 955c935 säilivad.

## Kaks eraldi toimingut

| Toiming | Mõju | Lõpp |
| --- | --- | --- |
| Peida pakkuja 24 tunniks / Hide provider for 24 hours | Pakkuja pakkumised jäetakse selle vaataja otsingu- ja avastamistulemustest välja. | Serveri kella järgi 24 tunni järel või kasutaja käsuga Näita uuesti. |
| Blokeeri kasutaja / Block user | Rakendub senine kontodevaheline nähtavuse ja mõlemasuunalise sõnumikeelu leping. | Blokeerija eemaldab enda blokeeringu; automaatset aegumist ei ole. |

## Ajutise peitmise leping

Eelistus kuulub sisselogitud vaataja kontole ja sihib pakkuja identiteeti.
Vaataja enda identiteedivahetus seda ei tühista. Ühe pakkuja identiteedi
peitmine ei peida automaatselt tema teisi identiteete.

Tähtaeg on 24 tundi serveris kinnitatud peitmistoimingust; lehe vaatamine
ega värskendamine seda ei pikenda. Lõpp sõltub serveri ajast, mitte seadme
kellast ega taustakoristuse õigeaegsest käivitumisest. Pärast toimingut on
kohene Võta tagasi / Undo. Minu ala peidetud pakkujate loendis on nimi,
avatar/logo, tähtaja selgitus ja Näita uuesti / Show again.

Peitmine mõjutab ainult vaataja otsingut ja avastamist. Sõnumid ning
teadlikult avatud profiil ja kuulutuse/teenuse otseviide säilivad tavapäraste
õigustega. Pakkuja ei saa peitmisteadet ega karistust. Teiste vaatajate
tulemused ei muutu. Tavaline peitmine ja blokeerimine ei nõua Energy ostu.

## Püsiva blokeerimise varasem leping

Kasutaja palus säilitada varasema blokeerimise käitumise. 02.–03.06.2026
vestlusest taastatud kasutajakokkulepe nõuab mõlemapoolset sõnumite saatmise
keeldu, olemasoleva vestluse nähtavust ja ajaloo säilimist. Blokeeritud pool
ei pääse blokeerija poe/profiili juurde. Ainult blokeerija saab enda
blokeeringu eemaldada; teine pool näeb blokeeritud olekut. Minu ala vajab
blokeeritud kasutajate loendit nime ning avatariga/logoga.

11.11 allikaaudiit kirjeldab olemasolevat user_blocks-i kontodevahelise
blokeeringuna, mis mõjutab mõlemapoolset nähtavust ja sõnumeid. Käesolev
ülevaatus leiab kohaliku SQL-i mõlemasuunalise konto-ID kontrolli avalike
rubriikide nähtavuses. See ei tõenda kõigi praeguste sõnumi-, profiili- ja
otsinguteede täielikku kaitset. Varasem vestluse kustutamisvõimalus ei anna
selles töös luba ajaloo või muu kasutajasisu kustutamiseks.

Blokeerimise runtime ja haldusvaade tuleb enne ühendamist kontrollida
955c935 täpsete lähtefailide ning serveri/RLS lepinguga. Inventuuris leiduvad
BlockedUsersCard.tsx ja useBlockedUsers.ts on tühjad; failinimi ei tõenda
valmis haldust. Olemasolevat autoriteetset user_blocks-i ei dubleerita uue
paralleelse blokeeringute registriga. Kaardil nähtava identiteedi seos
blokeeritava kontoga vajab senise õiguselepingu täpset kontrolli.

Peitmine ja blokeerimine on sõltumatud. Peitmise lõpp või tagasivõtmine ei
eemalda püsivat blokeeringut. Blokeeringu eemaldamine ei kustuta eraldi
aktiivset peitmiseelistust ega teise konto seatud blokeeringut. Püsiva
toimingu kinnituses selgitatakse nähtavuse ja sõnumite mõju.

## Järgmise teostuse piir

Üks järgmine samm on olemasolevate otsingulugejate, kaardimenüüde, koguarvude,
lehekülgede ja user_blocks-i kasutuskohtade kitsas lähteülevaatus ning selle
alusel 24 tunni eelistuse ja eraldi blokeerimise ühendamine väikeste moodulitena.
Ära järelda valmis runtime'i ainult dokumentidest, teeloendist või räsidest.

Kõik asjakohased tava-, hobuse- ja teenuseotsingu lugejad filtreerivad
serveris enne koguarvu ja lehekülge. Kasuta indekseeritavat, vaataja kontoga
piiratud välistust; ära lisa päringut iga tulemuse kohta ega laadi üldist
tulemusloendit kliendis peitmiseks alla. Rakendatud esiletõstmine ja reklaam
austavad sama eelistust. Kontrolli muudetud päringuplaane; sünteetiline katse
ei tõenda miljonite samaaegsete otsingute võimekust.

Ajutist eelistust ei lisata üldisesse is_public abifunktsiooni, mida kasutab
ka profiili või detaili otseavamine. Püsiva blokeerimise õigused säilivad
nende tavapärastes serveri kontrollpunktides.

Kontrollid peavad katma täpse 24 tunni piiri, kohese taastamise, konto- ja
identiteedivahetuse, koguarvude/lehekülgede kooskõla ning sõnumite ja
vestlusajaloo varasema blokeerimislepingu. Muudatuse järel vajalik build,
brauserikäik ja dokumentatsioon; siis värskelt kontrollitud Maci alus,
commit/push, Verceli Ready ja tegelik kasutustee.

Duplikaatide juhendamine, järjestuse üldine mitmekesistamine ja töökuulutused
jäävad eraldi sammudeks. Energy/maksete, piiratud AI ning avaliku avamise
kokkulepped säilivad. Lõpetatud teenuste paigaldust ei korrata.
