<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 22.11.2026 Europe/Tallinn — 034211d alus säilib; konto elutsükli audit ja eelvaate serverileping valmis

## Praegune checkpoint

Konto sulgemise ja taastamise lähtekoodiaudit on valmis vastu võetud 034211d alusel. Eristatud on konto, eraisiku identiteedid, ettevõtteõigused, pakkumised, vestlused, meedia ja Energy/kviitungid. Valmis on kõrvaltoimeteta konto mõju eelvaate kavand: esimene osa loeb konto/identiteedi/ettevõtte seoseid; teised valdkonnad jäävad nähtavalt hindamata. Sulgemist, taastamist või kustutamist pole rakendatud.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 034211d2ee3dfadd4ba791977c98e310754e4d94, parent 78aea6f6d7c57aee47a29cd0e8b29c9c4e862561. Raporti ja väljastatud täpse 21-faililise delta järgi tuletatud puu 03768a7e12d1aeb4ff7402d3102800071920df0e, 2047 jälgitavat faili. Kõik kohalikult taastatud failid vastavad inventarile.
- **Maci tõend:** selqiro-too-lugemisluku-parandus-20261122-raport-20261122-191313-bbadc41bced5.json, 333025 baiti, SHA256 90c85b1426d40e96537af482e802b2cc49c18c618ef568ae9114b20728da8920. Käik 22.11.2026 19:12:07–19:13:13 Europe/Tallinn. stage complete, database verified, build passed, push verified; eelmine originaalraport säilis.
- **Andmebaas:** Üks acknowledged apply, seejärel eraldi read-only verify. Enne 683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848; pärast 0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef. Viis käsku on järjekorras eelkontroll → build → eelkontroll → üks rakendus → järelkontroll; kõik lõpetasid nullkoodiga ja kinnitatud protsessikoristusega.
- **Git ja tõendi piir:** Väljastatud räsiga seotud uuendaja kontrollis sama käigu ajal main-haru, täielikku lähtepuud, indeksit, puhast lõppseisu ja kinnitatud remote’i võrdsust. Siin hinnati raportit ning lähtefaile; uut Maci/GitHubi päringut ei tehtud. Algseid Git- ja build’i logikehasid ega indeksi toorfaile pole manuses.
- **Brauseri tõend:** Ready / Production on kasutaja kuvatõmmise, mitte Verceli API järgi. Taivo Garaaz vaates on Otsin lume lükkajat täna olekuga Suletud; Milline Vedu vaates Muruniiduki operaator olekuga Aktiivne. Eraisiku/ettevõtte eristus põhineb kasutaja kinnitusel. Uut sõnumite, telefoni ega koormuse läbimängimist ei väideta.
- **Piiratud parandus:** Muudetud on ainult get_my_jobs_v1 keha ja STABLE omadus. Tööloendi õiguste kontroll ja sisu kasutavad päringu alguse ühtset andmeseisu. Jagatud kirjutamiskontrollid, nende lukud, kliendi üks lisakatse, vastuse leping ja kasutajaandmed säilivad.
- **Dokumentide seis:** Varasem 034211d vastuvõtudelta ja uus audit/serverileping, seisukirje, genereeritud üleandmine ning päeviku lisa on eraldi ette valmistatud kumulatiivne dokumentide delta. Maci/Giti lisakommiti ega uut deployment’i pole. Kanda järgmise sisulise muudatusega kaasa pärast värsket lähtekontrolli; väljastatud pakid ja algsed raportid säilivad.
- **Konto elutsükli audit:** 100 lähteviidet / 83 erinevat lähtefaili vastavad vastu võetud inventari SHA-256 ja Git blob’ile. Ajaloolised migratsioonid ei tõenda värsket pilve skeemi. Järeldused ja failiviited on account-lifecycle-audit-20261122.md ning evidence/source-references.json all.
- **Olulised leiud:** Ettevõtte omaniku lähte-FK võib kaskaadida; Energy autori SET NULL võib kohtuda muutmiskaitsega; vestlus vajab mõlema osapoole täpseid seoseid; profiilipildi eemaldamine on pöördumatu; osa lugemisradu loob rahakoti või käivitab koristuse. Need on allikast leitud sõltuvused, mitte pärisandmete kustutamise katsed.

## Tegelik kohalik katse

- Audit kontrollis 83 kasutatud lähtefaili räsi ja Git blob’i vastu võetud 2047-faililise inventariga. Kolm sihitud erialaülevaatust kinnitasid kavandi; hilisema Energy adapteri kontroll eristati esimesest etapist.
- Uut rakenduse build’i, runtime-testi, SQL-i ega brauserikäiku ei tehtud. Dokumentide viited, räsid ja genereeritud üleandmine kontrolliti.
- 034211d varem kinnitatud Maci build, üks SQL-rakendus/järelkontroll ning ettevalmistuse testitõendid säilivad; neid ei korratud.

## Production / kasutajaliides

- Viimane vastu võetud Production on main 034211d. Varasem sama commit’i Ready / Production pilt ja kasutaja mõlema profiili tööloendi kinnitus säilivad.
- Selles etapis ei muudetud rakenduse runtime’i, andmebaasi, Auth seadeid, DNS-i, Storage’it ega kontode/sisu olekut. Eelvaate, sulgemise, taastamise või kustutamise uusi päriskasutuse tulemusi ei väideta.

## Üks järgmine töö

Koosta konto/identiteedi/ettevõtte eelvaate jaoks üks piiratud ainult kataloogi lugev diagnostikapakk olemasolevale projektile. Kontrolli selle lugeja tegelikke FK/trigger/RLS/ACL/funktsioonisõltuvusi ning auditis leitud kaskaadi ja muutumatuskaitse vastuolu. Ära loe kasutajaridu, sõnumeid, pilte ega saldosid. Säilita Maci/Giti ning täpse SAADA SEE FAIL raporti reeglid. Käesolev auditipakk ei sisalda käivitamiskäsku ega uut paigaldajat.

**Peatumisel:** 034211d valmis parandust ei korrata. Enne uusi Maci kirjutusi vaadatakse värskelt haru, HEAD, tööpuu/index, lähtefailid ja remote. Tundmatu skeem või piiratud katvus on selgesõnaline teadmata tulemus, mitte null ega kustutusluba. Olemasolevate kontode, sisu, piltide, vestluste või päevikute kustutamisluba puudub.

## Loe ainult vajalikku

- docs/architecture/account-lifecycle-audit-20261122.md — lähteandmeseosed, olulised leiud ja tõendi piir.
- docs/architecture/account-lifecycle-server-contract-v1.md — esimene kõrvaltoimeteta kontopõhine eelvaade ja hilisemate toimingute invariandid.
- docs/architecture/account-lifecycle-verification-plan-v1.md — järgmise kataloogilugemise ulatus ja hilisemad sihitud kontrollid.
- docs/continuity/HOSTED_PORTAL.md — praegune pakk on auditi dokumentatsioon, paigaldajat pole.

## Säilivad piirid

- Kolm kontot on kasutaja enda omad; väliseid testijaid ei ole. E-posti aktiveerimine lükati edasi domeeni kasutuselevõtuni. Enne väliseid testijaid või avalikku registreerimist tuleb kinnitamine, kirjade saatmine ja parooli taastamine lõpuni kontrollida ka juhul, kui avalik aadress on veel vercel.app.
- Põhidomeeniks valiti selqiro.com. Kasutajale kuuluvad ka selqiro.app, selqiro.io ning selkiro.com/.app/.io. Domeenide ja DNS-i seadistust selles paketis ei tehta.
- Ülesannete ja töökohtade eristus ei otsusta lepingu õiguslikku liiki. Konto tüübi laiendus ei laienda riikide poliitikaid ega möödu senisest country-scoped policy peatumisest.
- Olemasolevaid kasutajaid, profiile, töid, vestlusi, pilte, tingimusi ja kviitungeid ei kustutata ega kirjutata ringi. Üks kalendrikuu kehtivus, tasu täpsed kümnendsummad, poliitika nõusolek, revisjonid ja konto/identiteedi seos säilivad.
- Vanasse avatud brauserilehte jäänud range parser ei pruugi uusi task väärtusi ega avaldaja identity_type välja tunda. Pärast sama versiooni Ready / Production tulemust tuleb leht värskendada. See ei ole nullkatkestusega eri kliendiversioonide leping; senised muutumatud päringusisendid ja kviitungid säilivad.
- AI päringuteed jäävad suletuks. Konto sulgemine/kustutamine, reklaami ja esiletõstmise iseteenindus ning laiem avamiseelne ülevaatus on järgnevad tööd.

## Keskkond

- Olemasolev /Users/taivo/selqiro ning Taivo17/selqiro remote. Viimane vastu võetud commit on 034211d2ee3dfadd4ba791977c98e310754e4d94. Raport kinnitab selle käigu puhta ja push’itud lõppseisu; hilisemat värsket Maci vaatlust pole tehtud.
- Next 16.4.6, Sharp 0.35.5 ning package.json/package-lock.json on samad. Olemasolev kinnitatud Supabase CLI kasutati ühe piiratud SQL-paranduse jaoks; uut ühendamist ega paigaldamist pole vaja.
- Lõpetatud originaalpäevik: /Users/taivo/Library/Application Support/Selqiro/job-owner-read-lock-20261122/e723754747c36cef7a62f4d1c7145e3f254a33ae48609f0f192bbd98139127aa/result.json. Hoida muutmata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
