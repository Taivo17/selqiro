<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-03

## Praegune checkpoint

03.11.2026 kell 14:50:55 Europe/Tallinn tehtud ainult lugev koondvõrdlus on üle vaadatud: puhas main, HEAD 04d7081ce51c6da106f726b21dfbfc21e4576f2e, täielik 950 faili HEAD/index/tööpuu ja muutumatud enne/pärast vaatlused. Kõik 22 paigaldatava faili vana baasi nõuet sobivad (14 olemasolevat + 8 uut). Puudu on 15 ainult assistendi arhiivis olnud ajaloolist faili; üks ajalooline diagnostikadokument erineb ja selle tegelikud baidid säilivad. Rakenduskoodis erinevust ei leitud. Eraldi r3 on koostatud täpselt mõõdetud lähtebaasilt. Rakenduskood, testid ja paigaldaja Python-kood jäävad varasema kontrollitud parandusega samaks; muutuvad manifest ja viis jätkudokumenti. R3 Maci rakendamine, build, uus commit/push ning selle deployment on veel tegemata.

## Lähtekood ja tõendi piir

- **Üks töö:** Olemasoleva foto põhipildiks valimine on kasutaja poolt vastu võetud. Uus parandus tõstab selle foto muutmisvaates esimeseks ja eraldab lisamisvormi avatud lehe sisestuse konto ning aktiivse identiteedi järgi.
- **Identiteedi piir:** Üks kontrollitud tegutseja juhib vormi ja avaldamist. CHANGING, konto vahetus ning teise akna teade peatavad vana tegutseja käsud kohe. Kõva kontekstimuutus peidab vana vormi ka juba poolelioleva focus-kontrolli ajal. Sama identiteedi tavaline fookusekontroll säilitab foto sisendelemendi.
- **Mustandid:** Iga identiteet hoiab samal avatud lehel oma teksti, faile, tavavälju ja hobusevälju. Hobuse tegelik mustandiseanss säilib koos ID, versiooni ja liigulukuga; hiline loomise vastus jääb algsele identiteedile. Vahetus ei loo mustandist uut koopiat.
- **Järgmine kuulutus:** Lõpetatud avaldamise tulemus ja Lisa järgmine kuulutus on vormi alguses nähtavad. Nupp eemaldab ainult kinnitatud sama katse taastamisvõtme sama tegutseja lukus. Ainult sama saatmise sisestus tühjeneb; uuem tekst/fotovalik ja teised identiteedid säilivad.
- **Põhipilt:** Muutub ainult kuvamisjärjekord. Pildi algne ordinal, URL, serveri tõend ja põhipildi valimise RPC jäävad samaks. Avalik detail sortis põhipildi juba enne seda parandust esimeseks.
- **Tarne:** selqiro-pohipilt-identiteet-20261103-r3.zip sisaldab ainult senist 22 faili muudatust ning muutmata paigaldajat. selqiro-uleandmine-20261103-r3.zip source/ on rekonstrueeritud 950 tegeliku Giti faili baasil + 8 uut kavandatud faili, kokku 958. Varasemad 15 puudu olevat arhiivifaili on eraldi ajaloos ja neid ei looda ega kustutata Macis. Algne koondraport ja r1/r2 pakid säilivad muutmata.
- **Järgmine tervik:** Pärast selle paranduse tegelikku vastuvõttu lõpetada kuulutuse fotode lisamine/asendamine/eemaldamine, failide lõppkoristus ja mahu vabastamine; hobused ühises kuulutuste voos. Seejärel päris logod, Uudised ja ülejäänud V2. Energy/maksete tuumik jääb avaliku avamise eelseks.
- **R3 mõõdetud lähtebaas:** 936 olemasolevat kõrvalfaili on seotud nende tegelike räsidega, sealhulgas kõik 65 päriselt olemasolevat varem informatiivseks jäetud ajaloodokumenti. Muudetavatel failidel on 14 täpset olemasolevat baasi ja 8 kinnitatud puudumist. HOSTED_PORTAL.md varasem valikuline puudumine eemaldati: selle olemasolev täpne räsi on nüüd tõendatud. CONTACT_DIAGNOSTICS_20261029.md jääb kasutaja tegelikul kujul alles. Paigaldaja vaatleb enne kirjutusi uuesti tegelikku main/HEAD-i, kogu indexit, tööpuud ja remote-main’i; HEAD-i ei oletata aruande kuupäeva põhjal. Vana b0a04f on jätkuvalt põlvnemisankur, mitte väide praeguse HEAD-i kohta.

## Tegelik kohalik katse

- Kasutaja koondraport: 175805 baiti, SHA-256 27846b7a8c5e6c836b6ea592bc7e6989a37d34f7cb851ba1304536aed09dd1c2; 6 arhiiviliiget, CRC ja kõik 5 manifestikirjet läbisid. Kõik 973 vaadeldud rada ja täielik 950 failiga Gitipuu/index on kooskõlas; lugemata või kopeerimata vajalikke faile pole.
- Kõik 950 tegeliku baasfaili baidid on taastatavad: 949 algsest kontrollitud üleandmisest ja üks dokument uuest raportist. Iga SHA-256 ja Giti blob ID on kontrollitud. R3 kliendikood ja testid on r1/r2-ga identsed.
- Varasemad rakenduse 119+4 Node-kontrolli, 13 brauserirühma / 20 konteksti ja lõplik exit 0 build säilivad oma algse tõendina. Neid ei korratud. R1 paigaldaja 20 katset, r2 11 katset ja lugeja 13 katset säilivad samuti varasemate kontrollidena.
- R3 piiritletud uued kontrollid puudutavad ainult mõõdetud 950 faili baasiga manifesti ning täpse 22 faili muudatuse rakendamist. Tulemus ja toorlogi on üleandmispaki kontrollid/r3/verification.json ja selle kõrval; päris Maci build tuleb paigaldamisel.

## Production / kasutajaliides

- Kasutaja vastuvõtt säilib: päris pildiga kuulutuse avaldamine, ostja-müüja kontakt, kuulutusekaart, sõnumifotod arvutis/telefonis, Viofo foto ja klaviatuuri kohal kirjutusväli.
- Varasema põhipildiparandaja edukas commit 04d7081ce51c6da106f726b21dfbfc21e4576f2e ja 02.11 põhipildi valimise kasutajavastuvõtt säilivad. Vanemat paigaldajat või SQL-i ei korrata.
- R1 ja r2 peatusid enne projektikirjutusi. Koondraport säilitab nende täpsete päevikute valitud väljad ning originaalide räsid. 03.11 14:50:55 seis: puhas main, kogu index HEAD-iga kooskõlas, 950 olemasolevat faili, puuduvad varjatud indexilipud, kohalikud fetch/push sihid kinnitatud ja mirror=false.
- Koondvõrdlus ei teinud võrguühendust: remote-main’i värsket võrdsust, pilveandmebaasi ega Verceli seisu selle põhjal ei kinnitata. R3 pole veel Macis käivitatud. Selle ettevalmistuse ajal ei muudetud andmebaasi, Storage’it, kontosid ega sõnumeid.

## Üks järgmine töö

Ava selqiro-pohipilt-identiteet-20261103-r3.zip Downloads-kausta ning käivita python3 -I -B "$HOME/Downloads/selqiro-pohipilt-identiteet-20261103-r3/uuenda.py" --publish. R3 teeb oma värsked tegelikud kontrollid enne kirjutusi ja kasutab eraldi päevikut. VALMIS järel vaata uue commit’i/push’i tulemust, sama commit’i Verceli Ready ning põhipildi järjekorda ja Taivo Garaaži / Milline Vedu lisamisvormi. Koondlugejat ja r1/r2 või varasemaid paigaldajaid ei korrata.

**Peatumisel:** PEATATUD korral säilita kõik olemasolevad failid ja päevikud ning saada r3 result.json. Uus või vahepeal muutunud tegelik lähtebaas vajab ülevaatust. Ära kopeeri puuduvaid ajaloolisi SQL-faile käsitsi projekti ega muuda väljastatud räsikaitsega pakke.

## Loe ainult vajalikku

- docs/continuity/LISTING_IDENTITY_ORDER_20261103.md: r3 mõõdetud baas ja säilinud funktsionaalne ulatus.
- docs/continuity/HOSTED_PORTAL.md: üks kehtiv r3 käsk.
- Üleandmispaki kontrollid/r3/verification.json ja actual-source-report-original.zip: täielik lähtebaasi tõend.
- src/features/listing-create/README.md; pärast vastuvõttu sama kuulutuste elutsükli ja hobuste avaldamise moodulid.

## Säilivad piirid

- Üks portaal, hoidla ja olemasolev Supabase’i projekt. Kohalik arendusbaas/proovikontod ei kandu pilve. Uut pilve-testbaasi ei looda.
- Olemasolev kolme konto hosted-lubamine ja päris Auth jäävad jõusse. Üldine avalik kasutus ei tohi jääda käsitsi konto lubamise taha, kuid see tarne piirangut ei eemalda.
- Kuulutuspiltide olemasolev private bucket (25 MiB, application/octet-stream,image/webp), avalik published-binding/räsi kontroll ja serverivõtmete piir säilivad. Sõnumifotode olemasolev privaatne bucket on eraldi.
- Kuulutuste hosted settle jääb pending/filesRemaining:null; reserv 29 MiB/pildikoht ja 300 MiB/konto. Lõppkoristus, säilitustähtajad ja reservi vabastamine on eraldi lõpetamata.
- Sõnumifotod: 250 MiB konto kohta koos kinnitatud ja tombstone-kirjetega. Peitmine mahtu ei vabasta. Kasutuse järel piiratud koristus ei ole püsiv scheduler ega hilinenud kirjutuste lõplikkuse tõend.
- V1 hilisem last_read_at ei kasvata olemasolevat V2 loetud ID-d. Oma postkastist peitmine ei kustuta teise osalise sõnumeid; üksiksõnumi tagasivõtmist ei lisata.
- Energy/maksed, teenused, identiteedid, sõnumid, piiratud AI abi ja haldus jäävad kokkulepitud V2 plaani. See tarne ei nihuta neid vaikimisi avaliku käivitamise järel aega.
- 01.11 testandmete luba asendab varasema blanket-keelu ainult vanade testkuulutuste/testsõnumite ja nende tuvastatud kasutuseta seoste ulatuses. Kontod, identiteedid, logod, teenused, tootenäidised ja päevikud säilivad.
- Kohalikku sisestust hoitakse ainult avatud lehel. Täielik lehe taaslaadimine ei taasta valitud File-objekte. Poolelioleva avaldamise taastamine eeldab säilinud tegutsejapõhist brauseripäevikut; väliselt kustutatud/katkise päeviku taastamine üle seansi taasloomise on eraldi varasem elutsükli puudus.

## Keskkond

- Üks olemasolev hoidla https://github.com/Taivo17/selqiro.git ja portaal https://selqiro.vercel.app. Uue paigaldaja vaikimisi Maci töökoht on ~/selqiro, nagu viimases kasutaja käivitatud põhipildi paigaldajas.
- Supabase vyjletlmwoiwxsnsunlm / eu-central-1; paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Need on säilitatud sihid, mitte värske teenusekontroll. SERVICE_ACCESS.json vanemad 27.10 olekulipud ei tühista kasutaja hilisemat vastuvõttu.
- Viimane täielik Maci kohalik vaatlus: 03.11.2026 14:50:55 Europe/Tallinn, /Users/taivo/selqiro, puhas main / HEAD 04d7081ce51c6da106f726b21dfbfc21e4576f2e, 950 jälgitavat faili. R3 ettevalmistatud source on sellest taastatud kandidaat, mitte juba Macis rakendatud parandus ega värske tootmise vaatlus.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
