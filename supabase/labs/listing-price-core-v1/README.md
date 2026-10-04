# Struktureeritud hinna tuum — testitud, suletud labor

**04.10.2026: 154 SQL-kontrolli ja kolm päris samaaegsete ühenduste katset PASS.**
See kaust talletab testitud kandidaadi väljaspool `supabase/migrations` kausta.
See EI OLE productioni migratsioon, API-rollidele avatud teenus või uus hinnavorm.
Tegelik lähtepaigaldus/build/commit/push selgub source-checkpoint’i tulemuse-ZIP-ist.

## Testitud failid ja üks tõeallikas

| Fail | Vastutus |
|---|---|
| 01_value_contract.sql | Täpse hinna JSON, labori veerud, valuutaskaala, ühepoolne vana kuvasilt |
| 02_write_guard.sql | Hinnarevisjon ja otsekirjutuse kontroll selles SQL-rolli piiris |
| 03_owner_price_core.sql | Aktiivse identiteedi/lukkude/CAS-iga suletud koostisosa |
| currencies.v1.json | 16 valuuta laborivalim; mitte lõplik ülemaailmne register |
| tests/fixture.sql, seed.sql | Valitud skeem ja väljamõeldud andmed |
| tests/suite.sql, expected-labels.json | 154 nimetatud assertion’it ja nende järjekord |
| tests/concurrency.reference.py.txt | Täpsed täidetud v2 juhtimismeetodid viitena, mitte käivitatava skriptina |
| PROVENANCE.json | Baitide päritolu, räsid, testitulemuse identiteet ja piirid |

Kaheksa SQL/registri/testifaili on tegeliku läbitud käigu baidid, neid ei muudetud
selle lähtecheckpoint’iga. CLI ise ei kuulu siia üldkasutatava projektitestina:
see oli konkreetse Downloads ZIP-i ja Git HEAD-iga seotud väline käiviti.
Muutunud tulevase kandidaadi testikäiviti tuleb eraldi kontrollida; vanu v1/v2
käivitajaid ei käivitata selle README järgi uuesti.

## Labori hinnareegel

Üks tuple: hinnaliik, algsumma, fiat-valuuta ja revisjon listings-tabelis.
`fixed` nõuab kanoonilist kümnendarvuteksti ja toetatud koodi; `free`, `negotiable`
ning `unspecified` nõuavad summaks/valuutaks NULL-i. Arvuline null ei ole tasuta.
Summa on vähem kui 10^18 ning kuni valuuta lubatud skaala; negatiivne, NaN/Infinity,
eksponent, segased eraldajad, suvalised märgid ja liiga täpne sisend lükatakse tagasi.
Samaväärsed lubatud lõpnullid normaliseeritakse alles pärast valideerimist.
16-koodine register katab 0/2/3 komakoha laborijuhte, mitte launchi riigipiirangut.

Originaalhind on autoriteetne, `price` tekst on uue hinna ühepoolne kuvaväljund.
NULL hinnaliik tähistab üleminekus vana testkirjet, mitte viiendat kasutaja valikut.
Vana hinnateksti ei parandata riigi või keele põhjal; kustutamine on eraldi toiming.

## Testi tegelik tõend

Kasutaja 04.10.2026 10:34–10:35 +03 käik PostgreSQL 17.6 uues võrguta helperis:
154 kontrolli, välise rollback’i järel üheksa valitud kataloogi/õiguste jaotise
võrdsus ning seitse tühja tabelit; seejärel 3 eraldi päriselt kattuvat ühenduspaari.
CAS-võitja säilis ja kaotaja sai konflikti; identiteedi vahetuse ning liikmelisuse
inactive-staatuse järel keelduti vanast kontekstist. Liikmelisuse rea DELETE oli
järjestikuses sviidis, mitte samaaegne DELETE-katse. Kõigis kolmes race’is vaadeldi
päris lukku ootavat B-ühendust enne A COMMIT-i. Helper eemaldati kontrollitult.

## Suletud piir ja ausad piirangud

Core-funktsiooni EXECUTE on API-rollidele suletud, testides avati see ainult laboris.
Profile/identity/membership SHARE-lukud ja listing UPDATE-lukk annavad testitud CAS-i.
Oodatud revisjon kontrollitakse enne no-op’i; värsket tokenit vana sisu alla ei tõmmata.
Hinnamuutus ei uuenda tähtaega; põhivälja muutus ei kasvata hinnarevisjoni.

Otsekirjutuse tõke kasutab SQL-i efektiivset rolli, mitte kliendi või JWT trust-lippu.
Kõik asjakohased postgres-omaniku SECURITY DEFINER kutsujad jäävad usalduspiiri sisse.
Struktureeritud DELETE/TRUNCATE laborikaitset ei kanta live’i enne päris kustutusvoo
koordineerimist. Lai public SELECT ja vana write-RLS pole selle labiga parandatud.

Fixture on 7 valitud tabelit / 5 tegelikku funktsioonidefinitsiooni, sünteetiline
auth ja mitte kogu Supabase’i skeem. Labori postgres on superuser; productioni
vaadeldud postgres pole. See pole HTTP/JWT, brauseri, kõigi lukkude, admin-voogude,
koormuse või täieliku RLS-i test. 633 klienditesti / vana 74 renewal-testi ei korratud.

## Järgmine integratsioon, mitte käivitamiskäsk

Loomine ning põhiväljade+hinna salvestus peavad olema üks atomaarne serveritoiming.
Hinnarevisjon ei lahenda loomise duplikaate/idempotentsust. Uued lugejad peavad
edastama hinnaliigi ja täpse summateksti enne uue sisendi lubamist. Praeguse range
search v1 null-valuuta lepingut ei muudeta selle all. `/sell`, `/my-page` ja V2
kirjutajad ning usaldatud serverirajad peavad saama koordineeritud ülemineku.

Ära käivita siinset SQL-i käsitsi productionis või algses kohalikus andmebaasis.
See checkpoint ei lisa migratsiooni ega lubatud psql-käsku. Ei FX-i, krüptot,
makseid, Energyt, Details redaktorit, ühikuteisendust, hobuseavaldamist ega
päris kasutaja/testkuulutuste kustutamist. Loe `docs/99_V2_HANDOFF_NEXT_CHAT.md`.
