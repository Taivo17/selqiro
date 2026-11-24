# Vestluste ja pildimanuste konto-oleku kontroll

24.11.2026. **Järgmise uuenduse ettevalmistus.** Tootmise vastu võetud alus on commit `8b7db90d08682b512d76e64c699af56fc8cae6a3`, puu `6f8e9b6e7b8e3e5ab2add913247a424908f91630`, 2305 faili. Uue paketi Maci raport ja sellele vastav veebikontroll on eraldi järgmised tõendid.

## Miks see järg on vajalik

Vastu võetud eelmine uuendus kontrollib mõlema konto kättesaadavust uue kontakti või sõnumi salvestamisel. Kasutaja kinnitas sõnumite toimimist ning tema Verceli pilt näitab sama `8b7db90` commit'i Ready / Production olekut. See on lõpetatud tööetapp.

Vestluse loomine ja pildi üleslaadimine toimuvad enne sõnumi saatmist. Lähtekoodis on alles nii V2 reserveerimise/üleslaadimise teekond kui ka vanem otsene kirjutustee. Üks uus koondatud SQL-moodul lisab konto kontrolli nende tegelikele kirjutamiskohtadele. Konto olekumudel jääb selles etapis `active`-põhiseks; sulgemise kasutajatoiming tuleb pärast ülejäänud sõltuvuste lõpetamist.

## Muudatuse tervik

| Tegevus | Uue kontrolli eesmärk |
| --- | --- |
| Vanema vestluse loomine | Autenditud tegutseja peab olema tegelik osapool ning mõlemad kontod peavad lubama uut suhtlust. |
| Vanema osalise lisamine | Lukustatud vestlus määrab konto/profiili paari; suvalise osalise või kolmanda osapoole lisamine ei anna õigust. |
| Vestluse/osalise muutmine | Osapoolte ja seose välju ei saa ümber siduda. Lubatud ajaloo haldamine ja kitsas koristus jäävad oma senisesse lepingusse. |
| Uue pildikoha reserveerimine | Uus reserveering kontrollib mõlema konto seisundit; varasem täpne kviitung säilib. |
| Üleslaadimisloa andmine või jätkamine | Kontroll kehtib ka `uploading` kordusele, sest selline vastus lubab serveril pildibaite kirjutada. |
| Pildi valmisoleku kinnitamine | Pärast välist üleslaadimist kontrollitakse uut `uploading → ready` üleminekut uuesti. Lõpetatud kviitungi lugemine ja koristamine ei loo uut üleslaadimisluba. |
| Vanema `messages` salvestuskoha uus kirjutus | Kitsendav INSERT/UPDATE poliitika kontrollib autenditud kasutaja vestlust ja kontode seisundit. Teiste salvestuskohtade ning olemasoleva lugemise reegleid ei asendata. |

Olemasolevad rollipõhised `SECURITY INVOKER` triggerid säilivad: nende `current_user` tingimusi ei muudeta kaudselt uue funktsiooni omanikuga. Uued kitsad `SECURITY DEFINER` kontrollid täiendavad neid. Juba paigaldatud privaatne kahe konto kontroll jääb baiditäpselt samaks ning seda ei anta üldise kontode kontrollimise RPC-na kasutajale.

## Kordused, lukud ja pildifaili piir

Üleslaadimise õigust andev korduskatse ja lõpetatud toimingu kviitung on eri olukorrad. Reserveeringu täpne kordus ning terminalne `ready`/`attached` tulemus säilitavad oma tagastatava kviitungi. Kui server peab faili päriselt uuesti kirjutama või valmisolekut kinnitama, rakendub uus konto kontroll.

Uue foto kirjutustee lukujärjekord arvestab olemasolevat saatmist: esmalt tuvastatakse foto vestlus, lukustatakse tegelik vestlus ning seejärel loetakse/lukustatakse foto uuesti. Foto seost kontrollitakse pärast ooteaega uuesti. Konto paari kontroll kasutab juba paigaldatud kindlat Auth/kontooleku lukkude järjestust ja kontrollib lukustatud ridade tegelikke väärtusi.

Salvestusteenuse pildikirjutus ja andmebaasi tehing ei ole üks ühine tehing. Hilinenud väline kirjutus võib vajada koristamist; selle õnnestumine ei asenda uut valmisoleku ega sõnumisse kinnitamise õigust. See moodul ei luba vana avaliku faili lingi kohest kehtetuks muutumist ega käivita olemasolevate failide kustutamist.

## Andmebaasi eelseis ja tõendite päritolu

Varem tegelikult vaadeldud vestluste, osaliste ja sõnumite objektide määratlused ning eelmise paigalduse täpne järelseis on vastu võetud. Foto kolme funktsiooni ja nendega seotud privaatsete objektide täpsed eeldused tulevad vastu võetud lähtekoodist. Neid ei nimetata juba tehtud värskeks tootmisvaatluseks.

Paigaldaja kontrollib vajalikku funktsiooni-, õiguste-, triggeri- ja Storage eelseisu värskelt enne DDL-i. Sobimatu või tundmatu seis peatab rakendamise. Säilivate objektide ja õiguste kontrollsummasid võrreldakse tehingus enne ning pärast muudatust. Kontrollpäringud ei väljasta kontode, sõnumite ega piltide andmeridu.

Storage poliitika muutmiseks kontrollitakse tegelikku omandiõigust või täpselt registreeritud Supautils'i delegeeringut. [Supabase'i Supautils'i kirjeldus](https://github.com/supabase/supautils#manage-policies) dokumenteerib rolli ja tabelite kaupa antava poliitikate haldamise õiguse; [laienduse lähtekood](https://github.com/supabase/supautils/blob/master/src/supautils.c) registreerib vastava seadistuse SIGHUP kontekstiga tekstiväärtusena. Pelgalt sama nimega sessioonimuutujat õiguse tõendiks ei loeta. Paigaldaja ei muuda neid õigusi ega seadista laiendust. Kohalik standardne PostgreSQL ei tõenda hostitud laienduse tegeliku hooki toimimist. Vanema `messages` salvestuskoha avalikkus ja piirangud säilitatakse värskelt vaadeldud kujul.

Maci käivitaja säilitab viimase eduka suhtluse originaalraporti ainult lugemiseks. Selle täpne vastuvõtt seob ka varasemate originaalraportite säilimise. Uus moodul kasutab eraldi päevikut ja ühte rakendamise katset. Commit/push eeldab COMMIT-järgset andmebaasikinnitust ja sõltumatut järelkontrolli; teadmata tulemusega kirjutust automaatselt uuesti ei tehta.

## Kontrollide ulatus

SQL-i tegelikke muudatusi kontrollitakse eraldatud PostgreSQL 17.6 katses sünteetiliste kontodega. Tootmise kolme olemasolevat kontot selleks ei muudeta. Testid peavad eristama uut kirjutust, lubatud ajalootoimingut, täpset kordust, vale kordusvõtit, muutunud seost ning konto muutumist lukuootel. Katse täpsed kasutatud funktsioonid, asendatud välised abistajad ja iga tulemus on paketi tõendifailides ning SQL-mooduli README-s.

Rakenduse 765 kompileerimise sisendit ja sõltuvusfailid on samad mis vastu võetud lähtekoodis ning selle värske Maci build'i puhul. Kohalikku rakenduse build'i ja vanu klienditeste ei korrata SQL-i kontrolliks. Uus Maci paigaldus teeb ühe värske build'i; Verceli tulemus ning teise oma testkontoga proovitud tekstisõnum ja pildimanus jäävad sellele järgnevaks kasutuskontrolliks.

## Konto sulgemiseni jääv töö

Järgmine vajalik tervik on ülejäänud tegelike omaniku kirjutuste ja meedia lõppkinnituste kontroll. Seejärel saab lisada konto sulgemise ja selgesõnalise taastamise koos värske sama konto autentimise, vana sessiooni õiguste tõkestamise ning piiratud konto vaatega. Vana ligipääsutõend ei tohi konto taastamise järel automaatselt uuesti õigusi saada.

Lõppkustutamine vajab oma lõpetatavat andmete ja failide koristamise teekonda. Sulgemise nuppu ei esitata valmis kustutamisena. E-posti saatja aktiveerimine jääb varem kokku lepitud `selqiro.com` kasutuselevõtu töö juurde; seda seadistust selle mooduli rakendamine ei nõua.

Toote järjekord säilib: **kontoelutsükkel → jälgitavate poodide ja profiilide Uudised → esiletõstmine → reklaamid**. Uudiste kavandis on avaldaja ja valitud perioodi kohta kuni neli eelvaadet, sama perioodi „Vaata kõiki” ning eraldi teate nähtavus. Konto tüüp on uuel kasutajal eraisik või ettevõte; olemasoleva ühe kahe profiiliga konto säilitamine ei lisa ettevõtteliikmete ega rollide haldamist.
