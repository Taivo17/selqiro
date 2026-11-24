# Uudiste rühmitamine avaldaja järgi

24.11.2026 · **Teostusettepanek.** Ükski siin kirjeldatud uudiste muudatus pole paigaldatud. Lähtub kasutaja soovist näidata suurema lisamise korral 3–4 eelvaadet ja avada ülejäänud sama avaldaja lisatud kuulutused eraldi. Nelja eelvaate, seitsme päeva ning lehesuuruste valik on kavandatav vaikimisi käitumine, mitte varasem kokkulepe.

## Kasutaja nähtav lahendus

**Üks jälgitav profiil saab valitud ajavahemikus ühe ploki.** Sada uut kuulutust ei tekita sadat eraldi uudist. Vaikimisi pakun viimast seitset päeva; pealkirja all on „Jälgitavate uued kuulutused ja teated” ja periood. Vanemaid uudiseid saab vaadata „Varasemad uudised” või ajavahemiku valiku kaudu ka pärast pikka eemalolekut. Seitse päeva on pakutav esimene vaade, mitte ajaloo kustutamise või nähtavuse kõva piir. Kuulutuste avaldamise arvule see piirangut ei sea.

Ploki päises on poe/profiili pilt ja nimi ning ajavahemik. Selle all on neli viimati esimest korda avaldatud kuulutust: arvutis neli kõrvuti, telefonis samad neli 2 × 2 paigutuses. Kaardil on pilt, lühike pealkiri ja hind. Ühe kuni nelja kuulutuse korral kuvatakse kõik olemasolevad. Suurem kogus ei muuda plokki kõrgemaks.

Kui samasse plokki kuuluvaid kuulutusi on rohkem, kuvatakse nupp **„Vaata kõiki selle perioodi kuulutusi”**. See avab sama avaldaja täpselt selle perioodi lisamised, mitte kogu poe kataloogi. Vaate pealkiri kordab profiili nime ja ajavahemikku; kuulutused laetakse lehekaupa. Profiili nimi jääb eraldi lingiks kogu avalikule profiilile. Tagasinupp toob uudistevoogu tagasi sama ploki ja kerimiskoha juurde.

Järgmine jälgitav profiil tuleb kohe järgmise plokina. Plokke järjestab värskeim sellesse rühma kuuluv esimene avaldamine; hulgalise lisamise kogus ei anna avaldajale rohkem plokke. Sama profiil võib ilmuda uuesti siis, kui kasutaja valib eraldi varasema perioodi. Tavalised ja hobusekuulutused kasutavad sama plokki ning oma tegelikku sisutüüpi.

Profiili teated on samas profiiliplokis eraldi sisutüübina nähtavad: vähemalt ühe värske teate lühike lõik ning vajadusel eraldi „Vaata selle perioodi teateid”. Teade ei konkureeri nelja kuulutuse eelvaatekohaga ega kao saja kuulutuse taha. Teated ei tekita samale avaldajale piiramatut lisaplokirida. Kuulutuste nupp avab kuulutused, teadete nupp teated; mõlemal on sama fikseeritud periood.

## Näide: sada kuulutust ja seejärel veel viis

1. Kasutaja avab uudised. Poe sada selle perioodi kuulutust moodustavad ühe ploki, kus näeb nelja eelvaadet. Teiste poodide plokid jäävad kohe kättesaadavaks.
2. Vaatamise ajal lisab pood veel viis. Pooleliolev plokk ei paisu ega hüppa üles. Lehe ülaossa ilmub rahulik **„Uusi postitusi on lisandunud”** ja nupp **„Näita uusi”**.
3. Algse ploki „Vaata kõiki” avab endiselt algse sada sisaldava perioodiseisu, ulatuses milles need kirjed on praegu avalikud. Hilisemad viis ei ilmu vana kogu keskele.
4. „Näita uusi” loob uue vooseisu. Poe üks plokk sisaldab nüüd ka neid viit, kui need kuuluvad uude valitud perioodi; neli eelvaadet on kõige uuemad. Värskendamine on teadlik tegevus.

**Nelja eelvaate nägemine ei märgi ülejäänud 96 kuulutust loetuks.** Esimeses lahenduses ei ole vaja arvulist lugemata kuulutuste loendurit: „Uusi postitusi on lisandunud” tähendab, et pärast käesoleva vaate fikseeritud algust on lisandunud praegu nähtavat avalikku sisu. See ei tähenda kõigi varasemate kirjete läbilugemist. Sisu vanus alla seitsme päeva ja kasutaja jaoks „uus / veel nägemata” on erinevad asjad: vana perioodi vaatamata kirje ei muutu nähtuks ajavahemiku vahetamise tõttu. Püsiva lugemisoleku täpne mudel on eraldi ettepanek, mitte olemasolev kokkulepe. Kui püsiv „vaadatud” märgistus lisatakse, kinnitatakse üksnes tegelikult avatud või eraldi määratletud nähtavuskriteeriumi täitnud kirjed, mitte terve plokk. Avatud kogu pealkiri või nelja kaardi laadimine ei ole kõigi kirjete lugemiskviitung.

## Andmelepingu täpsustus

- **Fikseeritud ulatus.** Server loob vaate identifikaatori, oma konto/profiili ulatuse, perioodi alguse ja lõpu ning esimeste avaldamiste kinnitatud lõpp-piiri. Kavandatav periood on vaate loomisele eelnenud 168 tundi, UTC piiridega ja kasutaja jaoks arusaadavalt kuvatud kuupäevadega. Nupu kirjeldus kannab sama avaldajat ja sama ulatust; brauser ei koosta seda poe suvalisest otsingust.
- **Stabiilne järjestus.** Ploki järjestusankur fikseeritakse vaate loomisel. Uue sisu saabumine, nelja eelvaate avanemine ega kirjete muutmine seda ei tõsta. Plokkide kursor kasutab fikseeritud ankrut ja profiili ID viigimurdjat; kogu sees kasutatav kursor esimese avaldamise järku/aja ning sisutüübi ja ID üheselt määravat järjestust. Hiljem lõppenud avaldamine peab kuuluma järgmise vaate sündmustesse; ainult `created_at <= T` filter ei tõenda püsivat snapshot’i. Konkreetne serverilahendus tuleb allikatega kontrollida enne rakendamist.
- **Piiratud päringud.** Kavandatav põhileht sisaldab kuni kümmet profiiliplokki, igaühes kuni neli eelvaadet; viies sobiv kirje annab `has_more` tunnuse. Kogu detailvaade loeb näiteks 24 kirjet ja ühe lisakirje järgmise lehe tuvastamiseks. Jälgimised liidetakse serveris, brauser ei laadi kõiki jälgitavate IDsid ega kogu sadat/tuhandet kirjet. Üks koondpäring peab asendama brauseri eraldi päringud iga poe kohta. Päringuplaan ja indeksid tuleb kontrollida; väike vastuse maht üksi ei tõenda väikest andmebaasitööd.
- **Arvud on valikulised.** Vaikimisi piisavad neljast eelvaatest ja „Vaata kõiki” nupust. Ülemaailmset või terve jälgimisloendi `COUNT(*)` päringut pole vaja. Kui arv lisatakse, peab see näitama selle konkreetse kogu hetkel avalikke kirjeid: võimalik lahendus on piiratud loendus kuni 101 sobiva reani ja „100+” üle piiri. Täpset numbrit ei näidata teadmata koguse ega enne privaatsuskontrolle loetud ridade põhjal.
- **Elav nähtavuskontroll.** Fikseeritud sündmuste piir ei külmuta ligipääsuõigusi. Aegunud, peidetud, blokeeritud või suletud konto sisu eemaldatakse eelvaatest ja detailidest; täielikult tühja plokki ei näidata. Muutmise järel näidatakse lubatud värskeid pealkirja/hinna andmeid, kuid sama kuulutus ei muutu uueks sündmuseks. Eelvaate väljalangenud koha võib täita sama fikseeritud kogu järgmise sobiva kirjega. Vana järjekorda ega detailvaate ajapiiri see ei laienda.
- **Naasmine ja muutunud ulatus.** Detailist tagasi tulles kasutatakse sama vaate identifikaatorit, laaditud plokkide seisu ja kerimisankrut. Konto/profiili vahetamine või jälgimiste muutus tühistab vana ulatuse. Blokeerimine jõustub kohe; privaatsus ei sõltu vaate säilitamisest. Aegunud vaate korral kuvatakse selge värskendamisvõimalus, mitte vaikne hüpe teise kogusse.

## Teostuse piir

Kavand täiendab olemasolevat `followed-news-plan-20261124` lähteauditi suunda. Uudistes jäävad eraldi andmemudel, API, hook ja väikesed komponendid; kanoonilisi kuulutusi ei kopeerita uude üldisesse sotsiaalvõrku. Stabiilse avaldamisaja ja vaate lõpp-piiri leping ning praeguste follow/ligipääsu objektide seis vajavad enne teostust kontrolli. Prioriteet säilib: **konto elutsükkel → Uudised → esiletõstmine → reklaamid**.
