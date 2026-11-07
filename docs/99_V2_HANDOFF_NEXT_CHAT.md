<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-07 Europe/Tallinn

## Praegune checkpoint

Kasutaja võttis foto kuvamise paranduse vastu: commit 785c359 on Ready / Production, üks foto lisandus 9 sekundiga ja on avalikus vaates nähtav. V2 inglise/eesti kasutajaliidese uuendus on nüüd lokaalselt teostatud ja kontrollitud. Ühine kooste, sihitud testid, 23 brauserijuhtumit ning paigaldaja kuus kontrolli läbisid. Järgmine sõltuv samm on uue keelepaketi paigaldus olemasolevasse portaali. Seejärel ühendatakse hobuste täielik kuulutustee ja siis teenuste tegelik avalik kataloog sama toimimise alusega.

## Lähtekood ja tõendi piir

- **Vastuvõetud alus:** Kasutaja Verceli pilt kinnitab 785c359, Load the added photo while confirming gallery membership. Täispikka commit’i räsi ei oletata. 1085 lähtefaili baidid ja räsid säilivad varasemast väljastatud paketist. Uus paigaldaja lahendab lühiviite tegelikus hoidlas ning võrdleb kogu tööpuud, indexit ja remote’i enne kirjutust.
- **Keele teostus:** Üks püsiv V2LanguageProvider kasutab olemasolevat profiles.language välja. Inglise keel on vaikimisi ja puuduvate tõlgete varukeel; et valib eesti. Aktiivse äriidentiteedi vahetamine keelt ei muuda. Kataloogid katavad olemasolevad V2 vormid, navigeerimise, avalikud vaated, sõnumid ja tagasiside. Kasutajasisu jääb muutmata.
- **Pooleliolev töö:** Keelevahetus tõlgib kuvatava oleku ilma vormi, faili, toiminguvõtme või päeviku taasloomiseta. Konto vahetus tühistab vanad keelepäringud; lugemise/salvestuse 12-sekundiline lõpptähtaeg ja kinnitatud seisu taastamine välistavad lõpmatu ootamise.
- **Sisu ja nõusolek:** Liidese keel ei kirjuta ümber kuulutuse sisu. Tavalise avaldamise olemasolev language: et ning marketplace-general locale: et-EE leping ja tingimuste originaaltekst/räsi säilivad. Ingliskeelne liides märgib eestikeelse kinnitatava dokumendi. Ingliskeelsete õigusdokumentide avaldamine on eraldi tegemata töö.
- **Hobused ja teenused:** Lähtekoodi audit on docs/architecture/shared-marketplace-foundation.md failis. Tavalised kuulutused, hobused ja teenused kasutavad ühist töökindluse alust, säilitades oma kanoonilised kirjed ja eri väljad. Selle keelepaketiga ei ühendata veel hobuste avaldamist ega teenuste demo päris otsinguga.
- **Tarne:** selqiro-v2-keeled-20261107.zip sisaldab täpselt lubatud liidese/testide muudatusi ja dokumente. Paigaldaja varundab, teeb build’i, piiratud commit’i ja tavalise push’i. Kõik src/server, app/api ja supabase failid ning sõltuvused säilivad.

## Tegelik kohalik katse

- 1687 tavalise kuulutuse loomise, muutmise, hinna, foto ja avaldamise sihitud testi läbisid. Lisaks 174 hobuse/vormi/keele testi, 99 avaliku otsingu/keele testi ning 62 ühise keeleabi ja algse hinna testi. Testid kontrollivad olemasolevaid lepinguid sünteetilise transpordiga; need ei ole tootmise kasutuskatsed.
- Chromium 153: keelepakkuja 10 juhtu (profiilieelistus, hiline vana konto vastus, salvestusviga ja 12 s timeout); tegeliku integreeritud fototöövoo üks EN/ET katse; tegeliku päise ja demoekraanide 12 juhtu. Kokku 23 läbisid. 320/390/768/1280/1440 px laiusel päis ja valija ei ületa ekraani.
- Fototöövoo brauserikatses säilisid sama foto, Blob URL, LI/IMG-sõlmed, salvestamata pealkiri, jätkamispäevik ja toiming. Keele muutmine hoitud galeriilugemise ajal tekitas ühe PUT-i, ühe append’i ja ühe kaitstud meediapäringu. Foto jäi peitu kuni värske autoriseeritud liikmesuseni.
- Ühine npm run build -- --webpack läbis 27,96 sekundiga; Next 16.2.1, TypeScript ja 27 staatilist lehte. Sünteetilised kohalikud build-seaded; source_sha256 räsid kinnitavad kogu vaadatud runtime’i muutumatust kooste ajal.
- Paigaldaja 6/6 kontrolli läbisid 1085 tegeliku baasfaili, ajutise Giti ja kohaliku bare-remote’iga. Kontrollitud täpne lähtepiir, lubatud delta, taastamine/kordus ja non-force push; tegelik build ja väline remote on tarnekatses asendatud. Python 3.9 süntaks läbis; käitus Python 3.12.14.
- Kaks lähteülevaatust ei leidnud oma ulatuses blokeerivat viga. Kõik 195 SQL-faili, 12 app/api faili ja 55 src/server faili on algbaasiga identsed. Lõplik ZIP-i tõend koostatakse pärast kogu sisu pakkimist ning säilib arhiivi kõrval; see seisukirje on pakkimiseelne külmutatud hetktõmmis.

## Production / kasutajaliides

- Kasutaja kinnitas foto valimise, lisamise, põhipildi, eemaldamise ja koristuse varasemad katsed. Kuulutus 201 jõudis kümne nähtava fotoni. Vastuvõetud kasutuskatseid ei korrata.
- Enne piirkonnamuutust viie foto stopperiajad 22, 22, 19, 21, 18 s (keskmine 20,4 s); Frankfurdi järel üks 12 s katse. Serveri image-verify total 7647,2 → 4345,2 ms ja arn1::iad1 → arn1::fra1 on kasutaja ekraanipiltidel.
- Viimase foto kuvamise paranduse 785c359 Ready / Production on kasutaja pildil. Kasutaja teatas ühest 9 s lisamisest ja avalikust nähtavusest. See on ühe katse tulemus, mitte lubadus püsivast keskmisest.
- Uut EN/ET paketti ei ole assistent kasutaja Macis, GitHubis ega Vercelis käivitanud. Konto keele tegelik kirjutus, uue commit’i Ready ja päris liidese vastuvõtt jäävad pärast paigaldamist kinnitada.

## Üks järgmine töö

Paki selqiro-v2-keeled-20261107.zip Downloads-kausta ja käivita HOSTED_PORTAL.md üks uuenda.py --publish käsk. Pärast uue commit’i Ready / Production tulemust värskenda portaali, vali English, ava kuulutuse muutmine ja avalik vaade ning veendu pärast lehe värskendamist, et keele-eelistus säilis. Seejärel saab valida Eesti. Foto kiiruse, kümne foto piiri ja Frankfurdi korduskatset pole vaja. Järgmine arendusetapp on kanoonilise horse_offers kirje täielik fotode/avalduse/avaliku detaili/kontakti tee; pärast seda päris teenused ühisel toimimise alusel.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks keelepaketi paigalduskäsk ja kasutuskatse.
- docs/architecture/interface-language-v1.md — üks keele-eelistus, oleku säilimine ning sisu/poliitika piir.
- docs/architecture/shared-marketplace-foundation.md — tegelik lähtekoodi audit, ühine alus ning hobused enne teenuseid.
- docs/known-issues.md — allesjäänud õigusdokumendid, domeenide ühendamine ja üldine koristus.
- docs/engineering-handbook.md — olemasolevad moodulid, üks päevik ja tõendatud salvestus.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt ja kontosüsteem. Kasuta sama konto keele-eelistust. Sisu, riigi, rahaühiku ja aktiivse äriidentiteedi tähendusi ei seota keelevalikuga.
- Galerii aktiivne liikmesus ja eduteade põhinevad värskel autoriseeritud lugemisel. Kümne foto piir, üks lisamine korraga, identiteedikaitse, SOURCE/WEB kontroll ja jätkamispäevik säilivad.
- Hobune jääb horse_offers ja teenus services kanooniliseks kirjeks. Ühine otsinguprojektsioon kasutab tüüpi koos ID-ga; varikoopiaid listings tabelisse ei tehta. Olemasolevat arvulise kuulutuse RPC-d ei kutsuta hobuse/teenuse UUID-ga.
- Hobuse müük, tasuta üleandmine, rent, kaassõitja ja ostusoov säilitavad oma tähenduse. Teenuse hind, hinnastusviis, teeninduspiirkond ja saadavus jäävad oma väljadeks. Avaliku koha kuvamisel säilib privaatsus.
- Üldine katkestatud/aegunud üleslaadimiste püsiv taustal lõpetamine ja tehniliste koristuspaneelide eemaldamine on enne avalikku avamist eraldi töö.
- Vanad failid, fotod, päevikud ja varukoopiad säilivad. Ajalooliste dokumentide NEXT/CURRENT juhised ei ole tänane tegevus.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega eraldi kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Paigaldaja ei käivita SQL-i ega Storage’i toiminguid; liidese keelevalik salvestab olemasoleva kasutaja profiles.language eelistuse tavapärase kontoõigusega.
- Verceli Node/Sharp funktsioonide piirkond fra1 on kinnitatud. See pakett ei muuda piirkonda, käitusmootorit ega sõltuvusi. Maci build/push, uus Ready ja konto keele kasutuskatse kinnitatakse eraldi.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
