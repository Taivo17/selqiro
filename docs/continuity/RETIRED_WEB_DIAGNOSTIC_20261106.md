# Eemaldatud WEB-foto koristus — raport ja minimaalne parandus

## 06.11.2026 — kasutaja kinnitas nähtava koristuskatse õnnestumist

Kasutaja: „nüüd peaks olema korras, koristuspaneel kadus”.
`Screenshot 2026-11-06 at 21.15.34.png` näitab kuulutuse 201 eemaldatud fotode
paneelis veel üht ootel faili. `Screenshot 2026-11-06 at 21.15.58.png` näitab
sama lehte paneelita. Identiteet on Taivo Garaaz, mõlemad alles jäetud fotod on
nähtavad ja Mercedes on endiselt põhipilt. Failinimede kellaaegu ei käsitleta
sõltumatult mõõdetud serveriajana.

See kasutuskatse on vastu võetud. Täpset paranduse commit’i, Verceli Ready-rida
või lõpetamisjärgset SQL-raportit kasutaja selle kinnitusega ei esitanud.
Seetõttu ei esitata pildilt kadunud paneeli eraldi loetud nulli, deleted-kviitungi
või 4 MiB reservivabastuse tõendina. Samuti ei kinnita see automaatset taustatööd.
Uut paigaldust, koristusvajutust ega diagnostikat vastuvõtu kordamiseks ei tehta.

Alljärgnev 18:30 raport, diagnoos ja selle koostamishetke ootel-seis säilivad
paranduseelse ajaloona. Praegune tööjärg on CURRENT_STATE-is. Käesolev
vastuvõtutäiend ei muuda väljastatud parandust ega rakenduse/SQL-i faile.

## 06.11.2026 kell 18:30 saadud tegelik raport

Kasutaja saatis `selqiro-koristuse-raport-20261106-163015-f6f3a20f.zip`.
ZIP SHA-256: `aac43a76cfa419d1ed7642cdb9a78807c0cf52f467f96a1fb7b3c75ac766ec4a`.
Kaks liiget, CRC korras. `result.json` SHA-256:
`a06d4c212d27acfd3251cd6ee09ce646f090387c5fe6c3f056c15c17af65b4b5`.

Lugemine toimus 2026-11-06T16:30:15+00:00 kuni 16:30:18+00:00
(18:30:15–18:30:18 Europe/Tallinn). SQL-i lugemishetk oli
2026-11-06T16:30:17.812519Z. Päring oli READ ONLY.

Raport seob end väljastatud kontrollpaki manifestiga
`568d46b6901c2a97480304015a6dcb93b931821e7747454ba2baee5430b294b7`.
Kõik kontrollpaki seosed ning väljastatud validaatori skeem läbisid.
Kohalik siht oli `/Users/taivo/selqiro`, haru `main`, täielik HEAD
`b482c02c675c9d6a5a575ece7edc806151df918e`. Kogu index sisaldas 1019 kirjet;
indexi ja 14 valitud lähtefaili räsid sobisid enne/pärast ning seisu muutust
lugemise ajal ei leitud. See ei ole täielik värske tööpuu inventuur ega uus
võrgupäring Git remote’i. Jagatud `webObjectHttp.ts` polnud 14 valitud faili
seas; selle käitumist hinnatakse muutmata väljastatud lähtepuu järgi.
SQL CLI lõpetas koodiga 0; stderr 27 baiti ei eksporditud. Tühja stderr’i ei väideta.

## Kuulutuse 201 täpne seis

| Kontroll | Raportis |
| --- | --- |
| Kuulutus | avaldatud, sisu eemaldamata |
| Aktiivne galerii |2 fotot, 1 põhipilt; seosed ja URL-id sobivad |
| SOURCE alles |0 |
| Eemaldatud WEB alles arvestuses |1, algne järjekorranumber1 |
| Koristuse seis |`retry_wait`, katseid 2, `last_error=response` |
| Korduse ajapiir |lease aegunud, kordus lubatud, viivitus0 |
| Storage’i objektid sellel rajal |0; täpseid/võõraid versioone0 |
| Upload’id ja osad ID/raja järgi |kõik neli loendurit 0 |
| Sessioon ja eemaldamise seos |täpne, lõpetatud, kontrollitud, räsi/baidid sobivad |
| Aktiivne pildi- või põhipildiseos |sellel eemaldatud objektil puudub |
| Püsiv lõpetamistõend |puudub; `fully_deleted=false`, settlement`pending` |
| Kõik objektid veel arvestuses |3:2 aktiivset WEB-i ning1 eemaldatud WEB |

Olemasoleva pilvevõimekuse räsi
`ead5b541a4b221105dafb96a37659f391b71930863c990cfc8df6ae0e557b15e`
ning kõik 12 õigusekirjet vastavad. Puuduvat SQL-paigaldust või uut õigust
sellest raportist ei järeldu.

## Mida see veakood piiritleb

Väljastatud `cleanupOne.ts` määrab tulemuseks `response` ainult pärast
aktsepteeritud HTTP200 DELETE-vastust, kui järgneva autentitud GET-i
`readWebObjectBytes` tagastab mittetühja sisu. Claim ja tulemuse salvestamine
seega käivitati. Vigane DELETE vastus jääks `storage`-ks; lugemise erand
läheks `network`/`timeout` harusse. `expectedType=null` tõttu ei tõenda
see kood iseseisvalt, et saadud sisu oli kehtiv WEBP.

Raport ei salvesta varasema HTTP-päringu päiseid ega sisu. Vahemälu täpset
kihti ei saa nimetada mõõdetud faktiks. Vana puudumise kontroll kasutas
sama autentitud objekti URL-i nagu piltide serveerimine. Sellele oli küll
määratud `cache:no-store` ja `Cache-Control:no-store`, kuid puudus teenuse
vahemälu värskendav päringu tunnus. Ametlik Supabase’i dokumentatsioon
kirjeldab kustutamisjärgse CDN-i uuenduse viivitust ja `cacheNonce`-i tuge.
See toetab vana vahemäluvastuse seletust.

## Valitud väike parandus

Ainult `src/server/listing-publication/final/cleanupOne.ts` tootekood muutub.
Kustutamiskäsu sobiva vastuse järel luuakse `node:crypto` abil uus juhuslik
UUID ja lisatakse see autentitud kontroll-GET-i `cacheNonce` päringuparameetriks.
Nonce ei ole kasutaja, objekti ega lease’i töövõti ning seda ei kasutata
õiguse või kustumise tõendina.

Objekti muutumatu rada, üks DELETE, bounded reader, range’i/redirect’i keeld,
Auth, claim, lease ja scoped recorder säilivad. Ka värske GET-i200 sisu jätab
töö ootele. Ainult kinnitatud puudumise vastus lubab küsida olemasolevalt
recorder’ilt lõpetamist; andmebaas kontrollib endiselt ise objekti/upload’i/
osade puudumist ja täpseid seoseid enne reservi vabastamist.

Uut SQL-i, RPC-d, tabelit, järjekorda, S3-transporti, sunnitud reservivabastust
või automaatset korduste tsüklit ei lisata. Tavaliste pildilugemiste aadresse
ja ühist `readWebObjectBytes` moodulit ei muudeta. Uuendaja rakendab ainult
lähtekoodi/teste/dokumente; päris kustutussammu algatab omanik seejärel üks kord.

## Kohalik kontroll ja selle piir

Muutmata SQL-i ühe sihitud elutsükli 6 kontrolli läbisid: sama retry_wait/try2 ja juba puuduv
objekt sai uue claim’i/try3 ning scoped recorder lõpetas töö. Loendur 1→0,
reserv vähenes 4 MiB võrra ja kaks aktiivset pilti/põhipilt säilisid.
Vana töövõti keeldus; pärast claim’i uuesti ilmunud objekti metaandmed
peatasid lõpetamise ning tulemuskirjutus pöörati tagasi. See oli PGlite /
PostgreSQL 17.5 sünteetiline katse, mitte päris Storage’i tulemus.

Build läbis 28,87 sekundiga. Uue päringuga seotud runtime’i ning brauseri
lõplikud kontrollarvud on CURRENT_STATE-is ja paketi kontrollitõendites.
Päris Maci rakendus, uus commit/push, Verceli deployment ja kuulutuse 201
lõpetamine on selle dokumendi koostamisel veel ootel.

## Varasema hüpoteesi sulgemine

Enne päris raportit kordus sünteetiliselt pending1/try_count0 siis, kui
lõpetatud WEB-i multipart-osa metaandmed säilisid. See oli võimalik eraldi
juhtum. Praeguses raportis on katseid 2 ja osade loendurid 0, seega see
hüpotees ei selgita selle kuulutuse vaadeldud peatust. SOURCE403/WEB403/
recorder409 sünteetilised näited selgitasid üksnes vaikse pending-vastuse
piiri; neid ei esitata nüüd selle tootmistõrke põhjusena.

## Kontrollitud ametlikud allikad

Loetud 06.11.2026. Need selgitavad teenuse lepingut, mitte Selqiro live
päringute päiseid või lõpptulemust.

- [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn):
  kustutamisjärgne invalidation võib viibida; värske `cacheNonce` suunab uue
  päringu lähteobjekti kontrollima.
- [Privaatse faili download](https://supabase.com/docs/reference/javascript/file-buckets-download):
  privaatne download toetab `cacheNonce` parameetrit ning eraldi fetch’i seadeid.

Avaliku avamise nõue säilib: tehniline koristus peab edenema ilma omaniku
avatud leheta ning tavakasutaja ei näe testimiseks mõeldud koristusloendureid.
