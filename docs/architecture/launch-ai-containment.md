# Kuulutuste AI sulgemine avamiseks

20.11.2026 · alus: vastu võetud `7c7bc11`.

Kasutaja valis lihtsama avamise ilma tasulise välise AI abita. Lisaks näitas
lähteülevaatus, et vana `enrich-listing` otspunkt võis sisendi põhjal kutsuda
OpenAI teenust ning kirjutada service-role õigusega kuulutuse välju ilma
kohaliku autentimise/omanikukontrollita. Vana `/sell` vorm kutsus seda päriselt
pärast kuulutuse loomist. Avalikku ründekatset ega tootmisvõtmete kontrolli
selle leiu kinnitamiseks ei tehtud.

## Täpne muudatus

Mõlemad `app/api/ai/enrich-listing/route.ts` ja
`app/api/ai/analyze-listing/route.ts` annavad nüüd kohe:

- HTTP `503` ja `Cache-Control: no-store`;
- `success: false`, `code: listing_ai_disabled`, `retryable: false`;
- arusaadava teate, et kuulutus tuleb käsitsi täita.

Need serverimoodulid ei impordi SDK-sid, ei loe võtmeid ega sisendkeha, ei tee
andmebaasipäringut, ei reserveeri Energyt ega saada välisele AI-teenusele teksti
või pilti. Bearer-token, lepingupäis ja keskkonnalipp ei ava vana rada uuesti.
Taasavamiseks tuleb teha eraldi üle vaadatud rakendusmuudatus.

Vana `/sell` vormist eemaldatakse AI-analüüs koos selle nupu ja kvooditekstiga,
automaatne avaldamisjärgne rikastamispäring ning tulevane AI kategooriaparanduse
kirjutus. Kuulutuse insert, fotode töötlus, poe rubriikide salvestus ja kasutaja
mustandi taastamine säilivad. Vanast mustandist taastatud ajalooline AI tulemus
võib endiselt nähtav olla, kuid see ei käivita teenust.

Praegune V2 lisamisvorm ei renderda olemasolevat AI-kaardi komponenti ega kutsu
neid otspunkte; selle vormi runtime-faile pole vaja muuta. Alles jäetud AI ja
Energy mudelite failid on tulevane vundament, mitte avamisel töötav AI-lubadus.

## Kontrollid ja piirid

`node --test tests/launch-ai-disabled.test.mjs` läbis täielikus isoleeritud
kandidaadis 12/12 kontrolli. Test käivitab mõlema tegeliku POST-handleri
sõltuvuse, võrgu, environment'i ja päringu lugemiseta keskkonnas. Kaetakse
anonüümne, Bearer-, V2 lepingupäisega, tundmatu lepinguga ja vigase JSON-iga
päring ning moodulite laadimine ilma võtmeteta.

Täielik Next.js/TypeScript build läbis; 730 sisendi räsi jäi samaks.
Tavalise kuulutuse insert ning mustandi salvestamise/taastamise plokid on
alusega bait-baidilt samad. Need on käivitatud handleritestid, lähteülevaatus
ja build, mitte tootmises tehtud avaldamiskatse või brauseri vastuvõtt.

Macis nõuab uus uuendaja sama testi ja ühe build'i läbimist enne commit/push'i.
See kontrollib täpset lähtealust, indexit, remote'i ja eelneva jooksu raportit;
tundmatut seisu ei kirjutata üle. Kohalik ettevalmistus ei kinnita veel Maci
rakendust, Git push'i ega Verceli väljastust.

## Varasemad Energy toimingud

Parandus ei alusta uusi AI reserveeringuid/debiteid ega muuda ajaloolist
pearaamatut. Vana analüüsiotspunkt taastas sama võtmega korduspäringul
lõpetatud toimingu tulemuse ning võis vabastada üle viie minuti vana
poolelioleva reserveeringu. Suletud otspunkt neid toiminguid enam ei tee.

Pole kontrollitud, kas tootmises selliseid reserveeringuid praegu on. Alumine
Energy vabastamise RPC ja serveri helper jäävad alles. Järgmine
lugemisinventuur peab võimalikke pooleliolevaid toiminguid loendama ning
vajadusel tuleb need eraldi kontrollitult lahendada. Praegune pakett ei tee
automaatseid mass-tagastusi ega väida, et ajalooline Energy on tagastatud.
Vanas väljastuses juba töötavat päringut ei katkesta selle uue kandidaadi
kohalik kontroll.

## Piiritletud turvaparandus

Selles paketis ei muudeta profiiliandmete õigusi, sõltuvuste versioone,
andmebaasi, Storage'i ega kontode kustutamist. Varasemad profiili- ja
sõltuvusleiud jäävad avamiseelseteks töödeks. Kõigi nende riskide lahendatuks
nimetamine üksnes AI sulgemise tõttu oleks vale.
