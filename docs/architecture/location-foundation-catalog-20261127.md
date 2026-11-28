# ASUKOHT-1 metaandmete kontrolli piir

27.11.2026. **See on lõpetatud metaandmete kontrolli ulatuse kirjeldus.**
Raport 13:38:52 on vastu võetud 582 kooskõlakontrolliga; täpne ülevaatus on
[location-foundation-accepted-20261127/REVIEW.md](location-foundation-accepted-20261127/REVIEW.md).
Kontrolli ei ole vaja korrata. Praegune järgmine samm on
[ASUKOHT-1 kasutuselevõtt](../continuity/HOSTED_PORTAL.md).

Kontrolli eesmärk oli tuvastada praeguse profiili-, omandi-, revisjoni-
ja õiguste lepingu kuju ning andmebaasi ruumilised võimalused. V1
kirjutusfunktsiooni uuesti ei avata. Uus salvestusleping peab sobima
olemasoleva range parsingu, omaniku kontrolli ja revisjoniga ning
kontrollima ka aktiivset kontot.

## Sisend ja üks päring

Kasutaja olemasolev projekt on `/Users/taivo/selqiro`, vastu võetud
commit `7c53643012545c7dfa99ba976e6f2613e3c3a201`, puu
`98444c7d31e7afac995f195d884700b60c82b6cf`. Runtime kontrollib täpset
2443 faili inventuuri, Git-indeksit, remote'i, olemasolevat CLI-t,
projektiviidet ja algset tööotsingu raportit ning privaatset päevikut.

`catalog.sql` kasutab fikseeritud objektide loendit. See kogub skeemi,
veergude, piirangute, indeksite, rolliõiguste, RLS-i, triggerite ja
valitud funktsioonide metadata ning tuvastatud laienduste võimekuse.
Funktsioonikehad ja avaldised lähevad vajadusel räsiks; aruandes ei
avaldata nende lähtekoodi või andmeridade sisu. Rakenduse funktsioone
ei käivitata. Tegelik loetelu ja tulemuse kuju on SQL-is ja
`catalog_contract.py` parseris fikseeritud.

Tehing on `READ ONLY`, piiratud päringu- ja lukuajaga ning lõpeb
`ROLLBACK`-iga. Ühte päringut ei proovita automaatselt uuesti.
Kataloogi täielik vastus peab läbima range parseri. Puuduv või ootamatu
metadata ei muutu automaatselt kinnituseks, et teostus on valmis.

## Säilitamine ja tõrked

Lähtepuu ja indeksi kontroll toimub enne päringut ning pärast seda.
Ka päringu või parseri vea järel tehakse järelkontroll, kui alamprotsesside
lõppemine on kinnitatud. Kinnitamata lõppemise või koristusvea järel uusi
Git-käske ei käivitata; raport fikseerib, milline järelkontroll jäi tegemata.
Algne tõrge säilib ega asendu eduka järelkontrolli märgiga.

Algset raportit ja privaatset päevikut ei kirjutata ümber. Uus raport
luuakse eraldi nimega. Toorväljundit, tundmatut veateadet või saladusi
raportisse ei kopeerita. Pakett ei kasuta `.env` sisu diagnostika tõendina.

## Ettevalmistuse ja päris kontrolli eristus

Paketi kohalikud testid kasutavad isoleeritud näiteid. SQL-i sünteetiline
PostgreSQL-katse ei sisalda Selqiro kasutajate andmeid ega ühendu tootmisega.
Runneri kontrollid ei teosta kasutaja Macis olevat päringut. Nende tõendid
on paketi `evidence/` all; iseseisev review katab runtime'i ja kataloogi.

Kasutaja raport on saabunud ja kogutud lepingud on vastu võetud lähtekoodiga
võrreldud. Raport tõendab metaandmete vaatlust, mitte profiili uue asukoha,
lähedusotsingu, ajutise teenusekoha või konto kustutamise toimimist.
ASUKOHT-1 uus teostus ja selle oma tõendid on eraldi
[teostuslepingus](profile-location-v1-20261127.md).
