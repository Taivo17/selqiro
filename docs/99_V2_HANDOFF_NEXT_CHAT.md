<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-07 Europe/Tallinn

## Praegune checkpoint

Foto valiku ja algfailide reservi parandus on kasutaja poolt vastu võetud: kuulutus 201 jõudis kümne nähtava fotoni. Sama lähtecommit f1745be on Frankfurdis Production Ready; tegelik image-verify vähenes 7647,2 → 4345,2 ms ning üks lisamine võttis stopperiga 12 s. Järgmine väike kliendiparandus on valmis: kaitstud uue foto laadimine kattub kohustusliku värske galerii lugemisega. 50 kontrolleri testi, 11 brauserijuhtu, 6 paigaldaja kontrolli ja üks kogu portaali build läbisid. Uue paranduse Maci paigaldus ja päris ajamõõtmine on järgmine samm.

## Lähtekood ja tõendi piir

- **Vastuvõetud alus:** Kasutaja Verceli pilt kinnitab f1745be, Fix photo selection and release completed upload sources, ja sama koodi Frankfurdi redeploy Ready. Täispikka commit’i räsi ei oletata. Uus uuenda.py lahendab lühiviite tegelikus Maci hoidlas ja nõuab täpset lähtecommit’i, täielikku puu/indexi vastavust ning remote’i seisu.
- **Lähteräside piir:** 1084 teadaoleva faili räsi pärinevad muutumatust varem väljastatud parandusest, mitte uuest Maci lugemisraportist. Kõik need failid kontrollitakse enne paigaldaja esimest projektikirjutust. Hilisemat tundmatut commit’i või kasutaja muudatust ei kirjutata üle.
- **Uus teostus:** Ainult neli olemasolevat kliendifaili: session annab kontrollitud append-kviitungi URL-i; owner hook hoiab üht toiminguga seotud ajutist URL-i; picker laadib sama ManagedOwnerImage komponendi peidetult; leht edastab oleku. Värske galerii tõend muudab sama URL-võtmega kirje nähtavaks. Üksnes nähtavaks muutumise tõttu teist päringut ei teki.
- **Säiliv kontroll:** Värske sõltumatu galeriilugemine, actor/identity/generation kaitse ning kaitstud meedia täielik lugemine, räsi ja seose korduskontroll säilivad. Peidetud foto ei anna eduteadet, galeriikohta ega tegevusnuppe. Kohalik algpilt ei asenda kinnitatud WEB-fotot.
- **Tarne:** selqiro-foto-kuvamine-20261107.zip sisaldab nelja kliendifaili, olemasoleva sihitud testi täiendust ja dokumente. Paigaldaja teeb varukoopiad, build’i, ühe piiratud commit’i ja tavalise push’i. Serveri, SQL-i, sõltuvuste ja teenuste seadistus ei muutu. Vanad paketid ja päevikud säilivad.
- **Keelenõue:** Inglise keel on põhikeel ja puuduvate tõlgete varukeel; eesti on teine keel. profiles.language jääb ainsaks konto keele-eelistuseks. V2 täielik keelekatvus on eraldi lõpetamata töö.

## Tegelik kohalik katse

- 50/50 sihitud Node kontrolleri/modeli testi PASS. Kontrollitud kviitung enne eellaadimist, hoitud galerii lugemine, tundmatu vastus, vale seos, konteksti muutus ja vahepeal eemaldatud foto. Transpordisõltuvused on sünteetilised; see üksi ei tõenda Reacti DOM-i ega päris võrku.
- 11/11 Chromiumi juhtumit PASS tegeliku integreeritud lehe, hook’i, session’i ja ManagedOwnerImage’iga. Üks kaitstud GET algab hoitud galeriilugemise ajal; foto jääb peitu kuni värske tõendini. Sama LI, IMG ja Blob URL säilivad nähtavaks muutumisel. Ka tühi galerii, lugemistõrge, uuem eemaldamine, identiteedi vahetus, unmount ja käsitsi pildi kordus läbisid. Auth/RPC/Storage HTTP-vastused on sünteetilised; väliseid päringuid ega brauseri vigu polnud.
- Sama kohaliku viitekatse 800 ms galerii + 1000 ms meedia tingimustes append-vastusest nähtava pildini: eelmine kood 2116,5 ms, uus 1554,9 ms. Vahe 561,6 ms tõendab ajastuse kattumist selles katses; see ei ennusta tootmise sekundiarvu.
- Üks ühine npm run build -- --webpack PASS (28.77 s): Next 16.2.1, TypeScript ja 27 staatilist lehte. Sünteetilised kohalikud build-seaded; olemasolevad samade sõltuvuste failidega moodulid. Kõik neli rakendusfaili, test ja package/lock säilisid build’i jooksul.
- Paigaldaja 6/6 sihitud testi PASS, kõigi 1084 päris baseline-faili, ajutise Giti ja kohaliku bare-remote’iga. Lühiviide lahendatakse; puuduva/eksitava viite, tundmatu pakifaili, puuduva lähtekaitse ja hilisema commit’i korral töö säilib. Build ja approved remote’i identiteet on katses asendatud. Python 3.9 süntaks on kontrollitud; tegelik jooks Python 3.12.14.
- Sõltumatu lähteülevaatus ja täpsed failiräsid on paki kontrollid-kaustas. Lõpliku ZIP-i paigaldus/jätkamine kontrollitakse pärast kogu sisu pakkimist; selle hilisem tõend säilib muutumatu arhiivi kõrval. Käesolev seisukirje on enne pakkimist külmutatud hetktõmmis.

## Production / kasutajaliides

- Kasutaja kinnitas varasemad foto lisamise, põhipildi muutmise, eemaldamise ja koristuse katsed. Viis uut fotot kuulutusel 201 olid nähtavad ka avalikus vaates; kümne foto piir rakendus. Neid vastuvõetud katseid ei korrata.
- Enne piirkonnamuutust viie foto stopperiajad 22, 22, 19, 21, 18 s (keskmine 20,4 s). Frankfurdi järel üks uus lisamine 12 s. Need on erinevate katsete vaatlused, mitte kontrollitud sama faili keskmine.
- 07.11 16:41:39 UTC image-verify Server-Timing total 7647,2 ms, X-Vercel-Id arn1::iad1. 18:15:53 UTC total 4345,2 ms, arn1::fra1. Mõlemad HTTP 200; funktsiooni piirkonna muutus on kinnitatud. SOURCE-lugemine 1553,0 ms ja sanitize 867,9 ms on uue serverimõõdu suurimad üksiketapid.
- Uue foto kuvamise kliendiparanduse tootmisajavõitu pole veel mõõdetud. Assistent ei ole selles töös käivitanud Maci paigaldajat, GitHubi push’i, Verceli deploy’d ega päris andmebaasi/Storage’i toimingut.

## Üks järgmine töö

Laadi selqiro-foto-kuvamine-20261107.zip Downloads-kausta ja paki lahti. Käivita HOSTED_PORTAL.md üks uuenda.py --publish käsk, oota terminalis näidatud uue commit’i Verceli Ready tulemust ja värskenda portaali. Lisa üks uus foto testkuulutusele, kus on alla kümne foto; mõõda nupust Lisa kuulutusele kuni pildi nähtavale ilmumiseni ja kontrolli avalikku vaadet. Kuulutus 201 oli täis; olemasolevaid fotosid katse nimel ei eemaldata. Piirkonda ega varasemaid parandusi ei paigaldata uuesti.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks paigalduskäsk ja üks uus päris ajamõõtmine.
- docs/continuity/PHOTO_DISPLAY_20261107.md — enne/pärast serverimõõdud, uus teostus ja tõendi piir.
- docs/architecture/published-photo-addition-v1.md — kehtiv lisamise ja värske galeriilugemise leping.
- docs/known-issues.md — üldine koristus ja täielik V2 EN/ET katvus jäävad eraldi töödeks.
- docs/engineering-handbook.md — olemasolevate moodulite, ühe päeviku ja väikese muudatuse põhimõtted.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja kontosüsteem. Aktiivses galeriis kuni 10 fotot; üks lisamine korraga ja eemaldatud järjekorranumbreid ei taaskasutata.
- Galerii aktiivne liikmesus ja eduteade põhinevad värskel autoriseeritud lugemisel. Eellaadimine ei lisa teist galeriid, järjekorda, püsivat vahemälu ega uut automaatset kordust.
- Konto piirid, foto SOURCE/WEB reserv, pilditöötluse retsept, SOURCE-koristus ja poolelioleva lisamise jätkamispäevik säilivad. Serveri kaitseid ega hilisema vigase vastuse käsitlust ei kiirendata nende eemaldamisega.
- Üldine katkestatud/aegunud üleslaadimiste püsiv taustal lõpetamine ning tehniliste paneelide eemaldamine tavakasutaja vaatest on enne avalikku avamist eraldi lõpetamata töö.
- Keel on konto eelistus, mitte aktiivne äriidentiteet või riik. Inglise põhikeel/fallback ja eesti teine keel; kasutaja teksti ei tõlgita automaatselt.
- Varasemad kasutaja failid, fotod, päevikud ja varukoopiad säilivad. Eelnevate dokumentide ajaloolised NEXT/CURRENT juhised ei ole tänane tegevus.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega eraldi kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Uus kliendipakk ei vaja teenusevõtmeid ega andmebaasikirjutust.
- Verceli Node/Sharp funktsioonide dashboard-piirkond fra1 on kasutaja kinnitatud. Käesolev pakk ei muuda piirkonda, käitusmootorit ega sõltuvusi. Maci/Giti, Ready ja kasutuskatse tulemused kinnitatakse eraldi.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
