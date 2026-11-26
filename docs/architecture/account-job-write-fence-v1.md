# Töökuulutuste omaniku toimingute konto kontroll

25.11.2026 Europe/Tallinn. **Ette valmistatud ja lokaalselt kontrollitud;
kasutaja Maci rakendamine ning uus tootmise tulemus on ootel.**

## Muudatus

Töökuulutuse loomine/salvestamine, esmane avaldamine, staatuse muutmine ja
kehtivusaja pikendamine läbivad sama `jobs_private.mutate` funktsiooni.
Uus privaatne kontroll lubab uue toimingu ainult sobiva Auth konto ning
olemasoleva aktiivse konto-oleku rea korral. Kontroll puudutab toimingu tegijat
ja pakkumise tegelikku kontoomanikku. Eraisiku puhul tuletatakse omanik
identiteedi `user_id` seosest, ettevõtte puhul `business_accounts.owner_user_id`
seosest. Ühine konto kontrollitakse üks kord; ettevõtte looja või liikme
identifikaatorit ei kasutata omaniku asendusena.

| Toiming | Avalik leping | Konto kontroll |
| --- | --- | --- |
| Loomine ja muudatuste salvestamine | `save_my_job_v1` | Enne uue sisu või kviitungi kirjutamist |
| Esmane avaldamine | `publish_my_job_v1` | Enne tingimuste aktsepteerimist ja avaldamist |
| Peatamine, sulgemine, uuesti näitamine | `set_my_job_status_v1` | Enne staatuse või kviitungi muutmist |
| Kehtivusaja pikendamine | `renew_my_job_activity_v1` | Enne tähtaja või kviitungi muutmist |

Täpse juba lõpetatud päringu kordus tagastab sama tulemuse seniste
tegija-, identiteedi- ja päringukontrollide piires. Uus päringuvõti tähendab
uut toimingut ka siis, kui salvestatav väärtus ei muutuks. Uut konto piirangut
ei lisata ühisele `require_actor` abifunktsioonile ega omaniku lugemisteedele.
Kliendi olemasolev SQLSTATE 42501 käsitlus kuvab õiguse muutumise teate;
rakenduse, sõnumite ja piltide lähtefailid jäävad täpselt samaks.

## Lukud ja tehingupiir

Senine tegijakontroll lukustab õiguse ja omaniku lahendamiseks vajalikud
profiili, identiteedi ning ettevõtte seosed. Seejärel kontrollitakse ühte või
kahte erinevat kontot UUID järgi järjestatult: iga konto Auth rida ja siis
privaatne konto-oleku rida võetakse jagatud lukuga tehingu lõpuni.
Puuduv olekurida ei tähenda aktiivset kontot. Lubamatu või puuduv Auth konto,
kehtiv keeld, sobimatu olek või vigane revisjon keelab uue toimingu.

Tulevane konto sulgemine peab salvestama Auth/konto-oleku ülemineku ja tegema
COMMIT-i enne profiili või sisu muutmist eraldi tehingus. Auth/oleku lukkudele
profiililuku lisamine samas sulgemistehingus pööraks praeguse järjekorra ümber.
See eeldus on sama, mis juba vastu võetud kontaktide ja sõnumite kirjutuskaitsel.

## Eelseis ja piiratud paigaldus

Alus on `c66a39b96c8d204382413a7ab652e66898782f18`, puu `c6e2726a6d97d12731dc2d505a734164523b90e0`, 2367 faili.
Mutatsiooni ja nelja avaliku ümbrise kehad on võrreldud täpsete varem vastu
võetud job-owner-read kataloogipin'idega. Nende kõrval on kontrollitud ühised
õiguse- ja sisusõltuvused ning konto-oleku praegune alus.
Värske ainult lugemisega eelseis peab kinnitama kõik pakis määratud
kehad, seadistused, õigused ja tabelite piirangud. Sama kontroll korratakse
rakendustehingu sees enne muudatust; kõrvalekalle peatab kirjutuse.

Lisatakse ainult privaatne abifunktsioon ja asendatakse üks teadaolev
`jobs_private.mutate` keha. Avalikud signatuurid, tabelid, olemasolevad read,
tingimused, tähtajad ning konto active-only olekuleping säilivad.
Paigaldus kasutab üht andmebaasitehingut, COMMIT-järgset kinnitust ja eraldi
ainult lugemisega järelkontrolli enne commit/push-i. Kinnitamata tulemust
automaatselt ei korrata. Täpsed objektid ja räsid on release'i lepingus.

## Kohalikud tõendid

- Eraldatud PostgreSQL 17.6: 39 sihitud kontrolli läbisid.
- Käivitaja: 27 sihitud kontrolli läbisid.
- Sõltumatu SQL-i ülevaatus: PASS; blokeerivaid lahendamata leide pole.
- Täpne 2367-faililine alus taastati ning iga faili SHA-256 ja Git blob
  võrreldi vastu võetud inventuuriga; kogu puu OID vastab alusele.
- SQL-i ja dokumentatsiooni muudatus ei muuda rakenduse koostamise sisendeid.
  Uut Next build'i ega klienditestide ringi ei käivitatud ega märgita läbituks.

Katsete detailid ja piirid on pakis `proof/sql/` ja `proof/runner/` all.
Need on eraldatud katsed sünteetiliste Authi ja õiguse ääretingimustega;
need ei kinnita veel uut Maci, tootmise andmebaasi või brauseri kasutuskäiku.
Varasemat `c66a39b` tootmise tõendit ei esitata selle uue muudatuse tõendina.

## Järgnev konto töö

See moodul katab töökuulutuse neli kirjutustoimingut. Konto sulgemise nuppu
veel ei aktiveerita. Edasi tuleb katta muud kuulutuste, teenuste, hobuste ja
profiili tegelikud muutmisteed ning meedia lõppkinnitused; kontrollida üle
jälgimine, pakkuja valikud ja vana avastamisvoog; seejärel ühendada värske
autentimine, vana sessiooni tõkestamine, teadlik sulgemine ja taastamine.
Kolm olemasolevat testkontot ja nende sisu säilivad.

Uudised jääb järgmiseks põhifunktsiooniks pärast konto tervikut. Jälgitava
avaldaja paljud uued kuulutused koondatakse plokiks 3–4 eelvaate ja sama valimi
„Vaata kõiki” lingiga. Perioodi, täpse lehesuuruse ja lugemise märgistuse
detailid on varasemad teostusettepanekud, mitte kasutaja uus otsus.
