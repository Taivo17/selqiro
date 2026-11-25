# Pakkumise teadlik lisamine vestluse järgmisele sõnumile

## Kasutaja otsus — 24.11.2026

Kõigi pakkumiste kontaktinupp kasutab sama loogikat: tavakuulutus,
hobusekuulutus, teenus ja tööpakkumine lisatakse järgmisele sõnumile siis,
kui kasutaja avab vastava pakkumise ja valib sealt kontakti võtmise.
Sama pakkumise kontaktinupu teadlik korduskasutus lisab kaardi uuesti.
Selleks ei lisata vestlusse eraldi „Lisa link uuesti” toimingut.

Enne saatmist näeb kasutaja kaarti ning saab selle eemaldada. Edukalt
saadetud sõnum tarbib ainult enda pakkumise lisamise kavatsuse. Järgmised
tekstid, pildid ja teise osapoole vastused ei saa automaatselt sama kaarti.
Saadetava pakkumise seos kuulub sõnumi mustandile, mitte vestluse praegusele
üldisele teemale. Kahe akna või kahe osapoole samaaegne tegevus ei tohi seda
seost muuta.

Vestluse päises näidatakse viimati tegelikult sõnumiga jagatud pakkumise
nime ja klõpsatavat linki. Pakkumise avamine, kaardi eelvaade või eemaldamine
ei asenda päise viimati jagatud pakkumist. Uue vestluse päises pole enne
esimest pakkumisega sõnumit jagatud pakkumist.

## Rakenduse leping

Lisatakse tüübiga viide `listing | horse_offer | service | job` koos ID-ga.
Tavakuulutuse ID jääb positiivseks täisarvuks tekstina; ülejäänud domeenid
kasutavad UUID-d. Tüüp ja ID on koos kas olemas või puuduvad. Uut lepingut
ei mahutata vanasse ainult numbrilise `listingId` väljaga protokolli.

Uus lugeja annab mustandi eelvaate ja viimati jagatud päise eraldi. Uus
saatja võtab vastu konkreetse tüübiga viite, kontrollib päris pakkumist,
vestluse osalisi ja avaldamise kättesaadavust ning säilitab sõnumi juurde
selle pakkumise hetkepildi. Pakkumise automaatne lisamine iga uue sõnumi
juurde lõpetatakse. Olemasolevad ajaloolised kaardid säilivad.

Saatmise konto-, identiteedi-, osaluse-, blokeerimise ja fotomanuse
kontrollid lähtuvad vastu võetud `908a457` lepingust. Pakkumise tüüp ja ID
kuuluvad saatmise kordusvõtmega seotud muutumatusse sisendisse. Kadunud
vastuse kordus ei saada teist sõnumit ega vaheta pakkumist. Ebaõnnestunud
saatmine ei tarbi kasutaja mustandit enne kinnitatud tulemust.

## Ülevaatuse ja avaldamise piir

See on olemasoleva sõnumivoo ühtlustamine. Siia ei lisata konto sulgemist,
uusi sõnumite jagamise nuppe, vestluste jagamist pakkumise kaupa ega
uudisvoo funktsioone. Kasutaja kolm kontot ja olemasolev sisu säilivad.
Varem saadetud korduvate kaartide andmeid ei kustutata.

Ettevalmistuse katsed, Maci paigaldus, Verceli Ready / Production ning
kasutaja tegelik veebikatse on eraldi tõendid. Käivitaja kasutab viimase
eduka uuenduse täpset raportit ja lähtepuud ning peatub tundmatu eelseisu
korral. Ühe kaitstud andmebaasimuudatuse kinnitamata tulemus ei luba uut
kirjutuskatset ega lähtekoodi avaldamist.

Pärast selle sõnumikäitumise vastuvõttu jätkub varasem tööjärg:
kontoelutsükli tervik, jälgitavate poodide/profiilide Uudised,
esiletõstmine ja reklaamid.
