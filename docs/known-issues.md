# Teadaolevad käsilolevad vead

Seis: 07.11.2026 Europe/Tallinn. Praegune tööjärg on
`continuity/CURRENT_STATE.json`-is; see dokument ei ole teine NEXT-allikas.

## Foto valik omanikuvaate värskenduse ajal

Väljastatud foto valimise r2 komponendis on kohalikult korratud viga: native
failivalijast naasmise fookus võib alustada omanikuvaate lugemist enne faili
`change` sündmust. Valik jäetakse kõrvale ja eelmise lisamise eduteade jääb
nähtavale, kuigi uut prepare/PUT/append'i ei toimunud.

Käesolev parandus seob valiku avatud valija kontrolleriga, hoiab kohaliku faili
lugemise ajal alles ning lähtestab vana lõpetatud toimingu alles sobivas seisus.
Valiku saab ka oote ajal kõrvale jätta. Uuema teise vahekaardi kavatsuse või
identiteedi muutuse korral fail teise toimingusse ei lähe. Päris Maci ja
telefoni kasutuskatse tehakse pärast uue commit'i Verceli Ready tulemust.

## Avaldatud algfailide reserv takistas järgmist fotot

07.11 kell 13:29 Europe/Tallinn päris lugemine kinnitab 277 MiB konto reservi:
225 MiB on üheksa avaldatud SOURCE-algfaili ootel koristus ja 52 MiB on
13 kasutusel oleva WEB-objekti reserv. Piir on 300 MiB; uue foto 29 MiB ei mahu.
Avatud katseid, pooleliolevaid sessioone/osi ega nähtava metaandmeta reserve
selles vaatluses polnud. Tegemist ei ole viie foto piiriga.

Parandus ühendab olemasoleva SOURCE-koristaja foto lisamisega. Üks täpselt
kinnitatud mahu-keeldumine võib viia ühe sama kuulutuse SOURCE-objekti
koristuseni ning ühe sama sisendiga prepare-korduseni, kui värske omanikuvaade
kinnitab koristatud algfailide arvu muutust. Eduka append'i järel tehakse üks
piiratud SOURCE-samm pärast vastuse saatmist. SQL-i, 300 MiB piiri ega
aktiivse galerii faile selleks ei muudeta.

Maci rakendamist, uut deployment'i ja kasutaja uut edukat lisamist ei ole veel
kinnitatud. Täpne tõend ja piirid on
`continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md`-s.

## Üldine koristus enne avalikku avamist

Katkestatud/aegunud üleslaadimiste ja terve kuulutuse terminalse hosted
koristuse kõik juhud on eraldi lõpetamata töö. Käesolev raport näitab nende
kategooriate nulli selle konto hetktõmmises; see ei tõenda üldist valmisolekut.
Uus vastusejärgne samm ei ole püsiv taustatööde teenus ega tühjenda korraga
kogu konto järjekorda. Tehnilised testpaneelid eemaldatakse tavakasutaja
vaatest koos täieliku taustal lõpetamisega.

## V2 kasutajaliidese keelekatvus on poolik

Inglise põhikeel ja eesti teine keel on püsiv nõue. V2 sisaldab veel
eestikeelseid püsitekste. Olemasoleva `profiles.language` eelistuse ja
isoleeritud tõlkeabi abil tuleb lõpetada terviklik kuulutuse kasutustee,
kaasa arvatud foto lisamise oleku-, vea- ja ligipääsetavuse tekstid.
Selle paranduse sees ei lisata eraldi keele-eelistuse allikat.
Vt `architecture/interface-language-v1.md`.

## Diagnostika ajatemplite ühilduvus — lahendatud

Parandatud r2 koguja lõpetas 07.11 kell 13:29 Python 3.9.6 all edukalt.
Maci lähtepuu ja index säilisid enne/pärast; konto vaatlus valideeriti.
Esimene peatatud raport ja varem väljastatud paketid jäävad ajalooks.
