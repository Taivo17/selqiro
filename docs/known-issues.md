# Teadaolevad käsilolevad tööd

Seis: 07.11.2026 Europe/Tallinn. Praegune tööjärg on
`continuity/CURRENT_STATE.json`-is; see dokument ei ole teine NEXT-allikas.

## Foto valik ja viie foto takistus — kasutaja katsega lahendatud

Foto valimise ja lõpetatud SOURCE-algfailide reservi parandus on kasutuses,
Verceli lähtecommit `f1745be`. Kasutaja lisas kuulutusele 201 veel viis
fotot, jõudis lubatud kümneni ning kinnitas galerii ja avaliku vaate.
Varasem eksitav eduteade ja konto reservist tingitud viie foto takistus
ei ole enam selle kasutuskatse põhjal lahtised paigaldustööd.

07.11 kell 13:29 Europe/Tallinn r2 diagnostika tuvastatud 277 MiB reserv
jääb ajalooliseks vaatluseks, mitte tänase konto mahu väiteks.
Täpsed algandmed säilivad
`continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md`-s.

## Foto lisamise ooteaeg

Frankfurdi `fra1` funktsioonipiirkond on seadistatud ja sama koodi
redeploy on kasutaja kinnitatud. Värske vastus kinnitab tegelikku `fra1`
käivitust. Mõõdetud serverietapp 7647,2 → 4345,2 ms ning üks uus
stopperiga lisamine 12 s näitavad paranemist; üks uus katse ei kinnita
püsivat keskmist ega kõikide pildisuuruste tulemust.

Järgmine parandus võimaldab kinnitatud uue foto kaitstud laadimist ja värsket
galerii lugemist teha samal ajal. Galerii tõend, identiteedikaitse ja serveri pildikontroll
säilivad. See ei vähenda SOURCE/WEB kontrolli ennast ega võrdu kogu 12 s
eemaldamisega. Päris tulemus vajab pärast uut Ready'd üht kasutuskatset.
Vt `continuity/PHOTO_DISPLAY_20261107.md`.

## Üldine koristus enne avalikku avamist

Katkestatud/aegunud üleslaadimiste ja terve kuulutuse terminalse hosted
koristuse kõik juhud on eraldi lõpetamata töö. Eduka lisamise üks
vastusejärgne SOURCE-samm ei ole püsiv taustatööde teenus ega tühjenda
korraga kogu konto järjekorda. Tehnilised testpaneelid eemaldatakse
tavakasutaja vaatest koos täieliku taustal lõpetamisega. Paneeli peitmine
ei asenda failide lõpetamist.

## V2 kasutajaliidese keelekatvus on poolik

Inglise põhikeel ja eesti teine keel on püsiv nõue. V2 sisaldab veel
eestikeelseid püsitekste. Olemasoleva `profiles.language` eelistuse ja
isoleeritud tõlkeabi abil tuleb lõpetada terviklik kuulutuse kasutustee,
kaasa arvatud foto lisamise oleku-, vea- ja ligipääsetavuse tekstid.
Foto kuvamise parandus ei lisa uut keelesüsteemi.
Vt `architecture/interface-language-v1.md`.

## Diagnostika ajatemplite ühilduvus — lahendatud

Parandatud r2 koguja lõpetas 07.11 kell 13:29 Python 3.9.6 all edukalt.
Maci lähtepuu ja index säilisid enne/pärast; konto vaatlus valideeriti.
Esimene peatatud raport ja varem väljastatud paketid jäävad ajalooks.
