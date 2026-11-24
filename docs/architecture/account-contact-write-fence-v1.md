> **Tootmises vastu võetud 24.11.2026.**
>
> Suhtluse konto kirjutuspiir on commit'is `8b7db90d08682b512d76e64c699af56fc8cae6a3`. Raport kinnitab ühe SQL rakendamise, eraldi järelkontrolli ja avaldamise. Kasutaja Verceli pilt näitab sama commit'i Ready / Production olekut ning kasutaja kinnitas sõnumite toimimist. Allolev ettevalmistuse kirjeldus säilib ajaloolise tõendina; selles nimetatud ootel rakendamine on tehtud.
>
> Vastuvõtt: [saatmise uuenduse kinnitus](account-contact-write-accepted-20261124.md). Praegune järgmine juhend: [HOSTED_PORTAL.md](../continuity/HOSTED_PORTAL.md).

# Konto kättesaadavus uute kontaktide ja sõnumite kirjutamisel

24.11.2026. **Ette valmistatud; kasutaja Maci rakendamine ja uue commit'i tootmiskontroll on ootel.** Viimane vastu võetud tootmise lähtealus on `e336a5b9d02845c688def778babeac0f1e3fec95`, puu `7734a70aa174b25b2ce5cc85aca3c0fa4e628624`, 2253 faili.

## Eesmärk

Uue kontakti või sõnumi andmebaasikirjutus peab kontrollima mõlema tegeliku osapoole konto kättesaadavust. Kontroll peab kehtima ka siis, kui teine tehing muudab konto olekut samal ajal. Olemasoleva eduka toimingu kordusvastus, täpse osaluse kontroll ja ajaloo lugemise reeglid peavad säilima.

See on kontoelutsükli üks piiratud ettevalmistusetapp. Kontode olekumudel jääb `active`-olekule; sulgemise, taastamise ja lõpliku kustutamise kasutajateekonda ei aktiveerita. E-posti kinnitamise ega SMTP seadeid ei muudeta.

## Millele muudatus toetub

Parandatud ainult lugemise kontroll lõppes 24.11.2026 kell 18:45:39.383 Europe/Tallinn edukalt. Raporti SHA-256 on `47e91a2cfdd8549f4e917a070ba3180436bc70e1cadb821c20b88a12a474b1e4`. Üks andmebaasipäring tagastas piiratud ulatusega kataloogi: 20 funktsiooni, 9 triggerit, 19 poliitikat ja 3 relatsiooni. Enne ja pärast kontrolli oli sama täpne e336 lähtekood ja indeks; originaalsed varasema töö kviitungid säilisid.

Tagastatud 20 funktsioonikeha sobitati vastu võetud lähtekoodiga baiditäpselt. Kontrollitud on ka funktsioonide seaded, omanikud, õigused ja allikafailide kontrollsummad. Töö kontakti funktsiooni alus pärineb sama tootmise lähtealuse varem vastu võetud töö moodulist. Kataloogi lugemine ei tähenda kogu andmebaasi või kõigi transitiivsete sõltuvuste auditit.

## Muudatuse ulatus

| Koht | Lisanduv kontroll |
| --- | --- |
| `public.contact_my_listing_seller_v1` | Tavakuulutuse uue kontakti saatja ja kuulutaja kontod. |
| `public.contact_my_horse_seller_v1` | Hobusekuulutuse uue kontakti saatja ja kuulutaja kontod. |
| `public.contact_my_service_provider_v1` | Teenuse uue kontakti saatja ja teenusepakkuja kontod. |
| `public.contact_my_job_provider_v1` | Töökuulutuse uue kontakti saatja ja avaldaja kontod. |
| `public.send_my_listing_message_v1` | Olemasolevasse kuulutuse vestlusse lisatava uue sõnumi mõlemad osapooled. |
| `public.send_my_message_v2` | Uue saatmise mõlemad osapooled, sealhulgas olemasolev manuse tee. |
| `messaging_private_v2.guard_account_block` | Vanema otse-sõnumi INSERT-i mõlemad osapooled, mis leitakse lukustatud täpsest kahe osapoolega vestlusest. |

Ühine uus abifunktsioon on `listing_contact_private.require_available_accounts_v1(uuid,uuid)`. See on privaatne `SECURITY DEFINER` funktsioon fikseeritud otsinguteega. Käivitusõigus on olemasoleval kontakti kirjutamise rollil; anonüümsele, tavakasutaja API rollile ja teenuserollile uut otsest käivitusõigust ei anta. Postgres jääb omanikuks.

Seitsme olemasoleva funktsiooni muudatus piirdub selle kontrolli lisamisega. Olemasolevad parameetrid, vaikimisi väärtused, vastusekujud, omanikud, konfiguratsioonid ja käivitusõigused säilivad. Jagatud actor-, peer-, unblocked- ja membership-abifunktsioone, ajaloo lugemise käske ning foto reserveerimist ei muudeta.

## Kordustoimingud ja olemasolevad vestlused

Kontakti ja saatmise käsud kontrollivad esmalt olemasolevat idempotentsuskviitungit ning sama toimingu sisu. Eduka varasema toimingu kordus tagastab senise vastuse. Sama võtme kasutamine teise sisu jaoks jääb veaks. Uus konto kättesaadavuse kontroll paikneb alles uue toimingu harus.

Seetõttu ei tekita korduv vajutus ega võrguvea järel sama päringu kordamine uut vestlust, sõnumit ega manuse sidumist. Selle mooduli paigaldus ei kirjuta olemasolevaid kontosid, profiile, vestlusi, sõnumeid ega failikirjeid ümber. Ajaloo lugemise senine osaluspõhine piir säilib; see ei anna mitteosalejale uut ligipääsu.

## Samaaegse olekumuutuse käsitlemine

Abifunktsioon nõuab kahte erinevat konto ID-d ning lukustab need alati UUID kasvavas järjekorras. Iga konto puhul võtab ta esmalt `auth.users` rea ja seejärel `account_lifecycle_private.account_states` rea jagatud luku. Lukud jäävad kehtima ümbritseva tehingu lõpuni.

Kontroll tehakse tegelikult lukustatud ridade väärtuste alusel pärast võimalikku ootamist. Varasema `STABLE` lugemisabifunktsiooni enne ootamist saadud tulemust ei kasutata kirjutamise lubamiseks. Nõutud on olemasolev Auth-rida, kustutamata konto, puuduv või lõppenud keeld ning korrektne loomisaeg; konto olek peab olema `active` ja revisjon positiivne. Puuduv või sobimatu rida annab üldise keelduva vastuse, mis ei avalda teise konto sisemist põhjust.

See tagab konkreetse konto paari lukkude järjekorra. Olemasolevad profiili-, pakkumise-, blokeeringu- ja vestluslukud jäävad oma senistesse kohtadesse. Kogu süsteemi ummikute puudumist sellest ei järeldata. Tulevane konto piiramise tehing peab kasutama sama Auth-/olekurea järjekorda ning lõpetama olekumuutuse enne eraldi profiili, pakkumise või vestluse puhastustehingut. Luku ajalõpp ja rangema eraldustaseme serialiseerimisviga peavad jätma kirjutuse tegemata.

Vanema INSERT-i kaitse hangib osapooled pärast vestlusluku saamist ning olemasoleva täpse kahe osapoolega vestluse kontrolli. Uus konto kontroll toimub enne kaitse enda sõnumi-ID eraldamist ja vestluse või osalejate uuendamist. PostgreSQL-i sequence võib ebaõnnestunud INSERT-i korral jätta numbrivahe; see ei ole salvestatud sõnum ega andmeridade muutus.

## Ettevalmistuse tõendid

Paketi `sql-preparation-proof.json` seob omavahel täpsete `preflight.sql`, `apply.sql` ja `verify.sql` failide kontrollsummad, eraldatud PostgreSQL 17.6 katse tegeliku tulemuse ning sõltumatu SQL ülevaatuse. Tõendid on `proof/sql/native-report.json` ja `proof/sql/sql-review.json`. Katsete arv tuleb lõpetatud tõendist, mitte kavandatud kontrollide loendist.

Tähenduslikud katsed katavad aktiivsete kontode kontakti ja saatmise, keelatud või puuduva konto tõkestamise, kordusvastuse ja konfliktide säilimise, ajaloo lugemise, ridade säilimise ning päris kahe ühenduse luku ootamise ja sellele järgneva kontrolli. Täpne ulatus ja kõik piirangud on katse raportis.

Katse kasutab olemasolevate suhtlusfunktsioonide, poliitikate ja triggerite tegelikke kehi. Mõned nende välised autentimise ja avaldamise abifunktsioonid on katses piiratud asendused; need on raporti `fixture_scope` väljal eraldi loetletud. Täielikku hostitud autentimise ja avaldamise ahelat ning foto üleslaadimise või manusega saatmise tervikteekonda selle katsega ei kinnitata.

Rakenduse 765 kompileeritava sisendi ühe värske koostamise tõend on `proof/build/`. Rakenduse lähtekoodi ei muudeta; SQL ja dokumentatsiooni lisamine ei muuda neid sisendeid. Selle mooduli jaoks ei korrata varasemaid klienditeste ega loeta SQL-koodiga samasisulist tekstikontrolli brauseri tõendiks.

Maci käivitaja teeb eraldi ühe värske portaali koostamise. Ettevalmistuse PostgreSQL katsed ei ole kasutaja Macis ega tootmisandmebaasis käivitatud katsed. Päris kontaktide ja sõnumite kasutuskontroll järgneb uue sama commit'i Verceli `Ready / Production` tulemusele.

## Paigaldamise piir

Uus pakett `selqiro-suhtluse-konto-olek-20261124` nõuab täpset e336 `main` lähtealust, puhast indeksit, sobivat remote-i, seniseid sõltuvusi ning kahte muutumatut originaalraportit. Varasema töö mooduli ja parandatud suhtluse diagnostika raportid hoitakse ainult lugemiseks; uuel käivitajal on eraldi tööpäevik ja lukk.

Lubatud lähtekoodimuudatused on ainult `docs/` ja `supabase/releases/account-contact-write-fence-v1/`. Käivitaja ei paigalda sõltuvusi, ei muuda meilisätteid ega käivita Storage toiminguid. Andmebaasis on üks kontrollitud skeemitehing; sellele peavad järgnema COMMIT-järgne kinnitus ja eraldi ainult lugemise järelkontroll. Alles seejärel võib toimuda commit ja push.

Enne rakendamist kontrollitakse värskelt ka abifunktsiooni omaniku tegelikku õigust Auth- ja kontooleku ridu lugeda ning lukustada ja sobivat RLS-konteksti. See on paigaldamise eeltingimus, mitte varasema diagnostikaga juba kinnitatud õigus. Puuduvat õigust ei lisata automaatselt.

Tundmatu eelseis või kinnitamata rakendamise tulemus peatab töö. Kinnitamata kirjutust ei korrata automaatselt. Jätkamine võib kontrollida järelseisu ainult lugemisega; sellest ei tohi sünteesida puuduvat COMMIT-kinnitust. Värske rapordi ja sama commit'i tootmiskontrolli järel saab tööetapi vastu võtta.

## Ülejäänud kontoelutsükkel ja järgmised tooted

Enne konto sulgemise aktiveerimist tuleb lõpetada muu hulgas allesjäänud otseste vestluse/osalejate kirjutuste, meedia, kehtivate sessioonide, hiljutise autentimise ning sulgemise enda tehingu kontroll. Ühe legacy-konto kaks identiteeti ei muutu uute kasutajate tootemudeliks. Uus konto valib eraisiku või ettevõtte; ettevõttesiseseid rolle ega omandi üleandmise töövooge selles etapis ei lisata.

Säiliv järjekord on **kontoelutsükkel → Uudised → kuulutuste esiletõstmine → reklaamid**. Uudiste kavand näitab ühe jälgitava avaldaja valitud perioodi kuni nelja eelvaadet ja sama perioodi „Vaata kõiki” kogu, jätab teatele eraldi koha ning ei märgi nähtamatuid kuulutusi vaadatuks. Uudiste tegelik voog, jälgimise nupu ühendus ja teadete avaldamine vajavad eraldi teostust.
