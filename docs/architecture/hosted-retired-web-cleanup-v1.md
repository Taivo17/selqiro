# Eemaldatud kuulutuse veebifoto lõppkoristus

Leping: 06.11.2026. Tegelik paigaldus- ja vastuvõtuseis on
[`CURRENT_STATE.json`](../continuity/CURRENT_STATE.json).

## Eesmärk

Viia lõpuni ühe juba kuulutuse galeriist eemaldatud foto koristus. Varasem
omaniku kinnitus eemaldas foto aktiivsest galeriist ja sulges selle veebiaadressid.
Käesolev samm eemaldab vastava privaatse WEB-objekti teenusest ning vabastab
selle loogilise ruumireservi alles kinnitatud puudumise järel.

Lubatud on ainult olemasoleva `published_image_removed` päevikukirjega objekt.
Aktiivsed fotod, praegune põhipilt, sõnumifotod, avaldamata üleslaadimised ja
muud koristuspõhjused ei kuulu sellesse uude WEB-lepingusse.

## Üks andmeallikas ja olemasolevate osade kasutamine

Aktiivne galerii jääb `public.listing_images` tabelisse. Eemaldamise püsiv seos,
töövõti, korduskatsete arv ja tulemus jäävad olemasolevasse privaatsesse
koristuspäevikusse. Reserv arvutatakse senistest objektidest ja lõpetamistõendist.
Uut tabelit, järjekorda, rolli, mahubilanssi ega töövoomootorit ei lisata.

Sama `cleanupOne.ts` teeb ühe Storage API eemaldamise ja sellele järgneva
puudumise lugemise. Ühine hosted-adapter kontrollib Authi ja seob päringu
konto, aktiivse identiteedi, katse ning request-võtmega. SOURCE-i claim proovitakse
esimesena. Ainult selle sõnasõnaline `null` lubab proovida kitsast eemaldatud-WEB
claim'i. Vigane vastus või tõrge ei käivita teist koristusteed.

Üks päring teeb kuni ühe objekti eemaldamise. Valitud claim ja tulemuse
salvestamine kuuluvad samasse kitsasse lepingusse. SOURCE-objekti ei saa
salvestada WEB-i tõendina ega vastupidi. Olemasolev SOURCE-only väljund säilib.

## Serveri tingimused

Enne töö võtmist peavad vastama kõik järgmised seosed.

1. Sama kasutaja ja aktiivne identiteet on andmebaasis endiselt lubatud;
   ettevõtte puhul kehtib aktiivne liikmelisus.
2. Katse, avaldamistõend, algne pildikoht ning eemaldamise päevikukirje
   osutavad täpselt samale WEB-objektile ja muutumatule rajale.
3. Foto pole enam aktiivses galeriis. Kontroll ei tohi järeldada puudumist
   päringust, mille ridu praeguse rolli RLS varjab.
4. WEB-i multipart-sessioon on lõpetatud ja kontrollitud. Objekti ID,
   versioon, baitide arv ja räsi vastavad senisele muutumatule kviitungile.
5. Rajal ja sessioonil puuduvad lõpetamata upload'id ning multipart-osad.
6. Sama objekti koristus saab olemasoleva piiratud lease'i ja töövõtme.

Avaldatud kuulutuse puhul kontrollitakse galeriid sama kinnitatud tegutseja
kontekstis. Kui kogu kuulutus on hiljem eemaldatud, peab säilima selle täpne
lõpetamisseos; vana foto eemaldamise kirje ei muutu üldiseks kustutusloaks.

## Eemaldamine ja arvestus

Fail eemaldatakse Storage API kaudu. Storage'i metainfo ridu ei kustutata
rakenduse SQL-iga. API vastusele järgneb sama raja puudumise lugemine ning
serveri andmebaasikontroll. Üksik 404, tühi claim, ajalimiit või katkenud vastus
ei vabasta reservi.

`deleted` kinnitus nõuab sama katse, objekti ja töövõtme sobivust, kehtivat
lease'i ning objekti, upload'i ja osade puudumist. Tundmatu tulemus säilib
päevikus; seda ei esitata valmis koristusena. Korduskatsed kasutavad senist
piiratud töövõtu ja ooteaja lepingut.

Privaatne `hosted_retired_web_deleted_v1` lisab senisele
`multipart_object_fully_deleted` otsusele ainult selle täpse WEB-haru.
Varem kinnitatud SOURCE-haru ja kohaliku keskkonna tõendid säilivad.
Korduv lugemine ei anna uut krediiti; tõendatud ühe WEB-i reserv on 4 MiB võrra
väiksem. Hilisem kuulutuse eemaldamine või aktiivse identiteedi muutus ei tohi
juba vabastatud reservi uuesti arvestusse tuua.

See on Selqiro teenuseobjekti ja loogilise mahu leping. See ei kinnita
teenusepakkuja kõigi varjatud ketaste baitide arvu ega arve kohest muutust.

## Piiratud serveri liidesed

| RPC | Ligipääs ja ülesanne |
| --- | --- |
| `claim_listing_retired_web_cleanup_v1` | Ainult `service_role`; võtab ühe täpselt sobiva eemaldatud WEB-objekti. |
| `record_listing_retired_web_cleanup_v1` | Ainult `service_role`; seob sama töö tulemuse ning kontrollib puudumist. |
| `get_my_listing_retired_web_cleanup_v1` | Autenditud kasutaja; kontrollib sama tegutseja ja katse õigust ning arvutab selle eemaldatud WEB-ide seisu. |

Üldised koristus-RPC-d jäävad suletuks ja `cleanup_mode: held` ei muutu.
Vana `owner-status` vastuse kuju ning avaldatud SOURCE-kviitungi
`files_remaining` tähendus säilivad. Uus seis on eraldi lugem olemasolevatest
andmetest, mitte teine tööjärg.

## Kasutajaliides ja tõrgete eraldamine

Testimisel saab omanik näha eemaldatud fotode ootel arvu ning käivitada ühe
piiratud koristussammu. Lugemisleping kontrollib ka sama seisu loogilist reservi. Nupp kasutab sama omaniku
toimingulukku nagu põhipildi muutmine ja foto eemaldamine.

Lehe avamine, fookus ja seisu värskendamine on lugemistoimingud. Need ei kustuta
faili varjatult. Foto edukale eemaldamisele võib järgneda uue koristusseisu
lugemine; lugemise tõrge ei muuda juba kinnitatud fotoeemaldust ebaõnnestunuks.
Koristusseisu lugemise probleem ei tohi blokeerida kuulutuse põhihaldust.

Pärast koristuskäsku loetakse seis uuesti serverist. Ühe API vastuse põhjal
pole lubatud kuvada nulli ega vabastatud ruumi. Konto või identiteedi vahetuse
järel ei tohi vana vastus uue tegutseja vaadet muuta. Salvestamata tekst säilib.

## Avaliku avamise piir

Käesolev kitsas töötaja on automaatse lõpuni viimise alus. Püsivat ajastajat
see samm ei lisa. Enne avalikku avamist peab koristus edenema avatud
omanikuvaatest ja nupuvajutustest sõltumata; tehnilised loendurid ja koristusnupud
kaovad tavakasutaja vaatest. Testimisel on need kasutaja otsuse järgi nähtavad.

Fotode lisamine/asendamine, katkiste upload'ide lõpetamine ning kogu kuulutuse
kustutamisel tekkivate teiste WEB-objektide koristus vajavad oma täpseid piire.
Neid ei avata käesoleva eemaldatud-foto põhjuse kaudu.

## Paigaldus ja kontroll

Guarditud SQL paigaldatakse enne uut rakenduskoodi. See lisab toe; paigaldaja
ise ei käivita koristuse RPC-d ega tee Storage DELETE-i. Tegelikku uut Maci
haru, HEAD-i, indexit/tööpuud, lähtefaile ja remote'i kontrollitakse värskelt.

Kontrollid katavad aktiivse foto keelu, täpse objekti seosed, lease'i,
tundmatu tulemuse, tõendatud mahu vabastamise ja selle püsimise. Serveri/HTTP
ning brauseri katsed eristavad sünteetilist teenust päris Storage'ist. Pärast
sama uue commit'i Ready/Production tulemust sobib üks olemasolev eemaldatud foto
(nt kasutaja juba katsetatud kuulutusel 201); uut fotoeemaldust pole vaja korrata.
