# Kuulutuse algfoto lõppkoristus — järgmise sammu piir

> Ajalooline lähteaudit enne 04.11 teostust. Selles kirjeldatud uurimisülesanne
> ja pakutud failiroll on nüüd lahendatud kitsas kandidaadis. Kehtiv leping on
> [hosted completed-SOURCE cleanup](../architecture/hosted-completed-source-cleanup-v1.md);
> paigalduse ja kontrollide jooksev seis on [CURRENT_STATE.json](CURRENT_STATE.json).
> Allpool säilib algne audit, mitte uus käivitamisjuhis.

Seis: 04.11.2026. See on olemasoleva R3 lähtekoodi ainult lugemisel põhinev
jätkuplaan. Rakenduskoodi, SQL-i ega teenuseid selle ülevaatega ei muudeta.
Põhipildi järjekorra ja identiteedipõhise vormi parandus on kasutaja poolt
vastu võetud commit’iga `8be94cdff322bc051cd54f5143cd3ea12312493e`.
Praegune tööjärg on [CURRENT_STATE.json](CURRENT_STATE.json).

## Üks järgmine soovitus

Teostada hosted-Supabase’i jaoks ühe avaldatud kuulutuse katse kinnitatud
algfoto (`SOURCE`) lõppkoristuse leping ja väike serverimoodul. Esimene
nähtav tulemus: algfoto on tõendatult eemaldatud, tema reserv on vabastatud
ning avaldatud veebipilt (`WEB`) ja selle põhipildiks valimine töötavad edasi.

Enne teostuse avamist tuleb leida ja kontrollida teenuse toetatud tõend,
et konkreetse objekti multipart-sessioon on lõplikult suletud ning hilised
kirjutused või varjatud ajutised osad ei saa faili taastada. Praegune audit
tuvastas lepingupiiri; sobivat hosted-teenuse garantiid pole selles sammus
uuritud ega tõendatuks kuulutatud. Järgmise teostuse eel tuleb kontrollida
asjakohast ametlikku dokumentatsiooni ja konkreetset teenuselepingut.

## Olemasolevad osad ja täpne puudujääk

Kõik järgnevad teed on selle lähtepuu juure suhtes.

| Osa | Lähtefail ja käitumine |
| --- | --- |
| Hosted-ühendus | `src/server/listing-publication/multipart/multipartPublicationImages.ts`: `createHostedMultipartPublicationImages` valib `holdCleanup=true`; `settle` kasutab `readHeldSettlement` funktsiooni. |
| Praegune tulemus | Sama `readHeldSettlement` kontrollib Authi ja loeb konto kokkuvõtet, kuid tagastab alati `pending` ning `filesRemaining:null`. Ta ei tee Abort/Delete’i ega vabasta reservi. |
| Valmisoleku leping | `src/server/listing-publication/journey/hostedPreviewReadiness.ts` nõuab `cleanup_mode:"held"`. |
| Andmebaasi lõpetamistõend | `supabase/releases/listing-publication-hosted-preview-v1/30_multipart_and_journey.sql`: `protect_multipart_auxiliary` tõrjub praegu terminaltõendi veaga `publication_hosted_terminal_cleanup_unavailable`. |
| Õiguste piir | `supabase/releases/listing-publication-hosted-preview-v1/60_preview_authority.sql` hoiab koristuse RPC-d API-rollidele, ka `service_role`-ile, suletuna ja kontrollib seda. |
| Ühe objekti koristaja | `src/server/listing-publication/final/cleanupOne.ts` sisaldab kinnitatud objekti claim’i, API-kustutuse, puudumise lugemise ja tulemuse salvestamise piiri. Teadmata claim-vastus ei käivita DELETE’i. |
| Püsiv tööjärg | Sama `30_multipart_and_journey.sql` sisaldab claim’i, lease’i, piiratud korduskatsed, `retry_wait` ning `needs_attention`; avaldatud katse korral valitakse koristamiseks SOURCE, aktiivne WEB säilib. |
| Põhipildi valik | `src/features/listing-edit/components/ManagedListingImagePicker.tsx` ja selle mudel muudavad olemasolevate fotode esitust; fotode koosseisu muutmine vajab eraldi serverilepingut. |

Seega uus töö kasutab olemasolevat objektipäevikut ja piiratud koristuse
loogikat. Pelk `holdCleanup=false` ei lahenda lõpetamistõendi, valmisoleku ega
õiguste lepingut. Kohaliku peatatud Storage-protsessi ja privaatse kettaruumi
kontrolli tõendit ei saa hosted-teenusele üle kanda.

## Mahu arvestus

`20_publication_core.sql` seob `reserved_bytes` iga objektiga eraldi:

- SOURCE: 26 214 400 baiti ehk 25 MiB.
- WEB: 4 194 304 baiti ehk 4 MiB.
- Ühe pildikoha algne reserv: 29 MiB; konto senine piir: 300 MiB.

`30_multipart_and_journey.sql` kehtiv `prepare_my_listing_publication_v1`
summeerib reserve objektidest, mille `multipart_object_fully_deleted(id)`
pole tõene. Tulevane tõendatud SOURCE-lõppkoristus saab seega vabastada
selle 25 MiB; aktiivne WEB säilitab oma 4 MiB reservi. Praegune hosted-rada
seda vabastamist ei teosta. Need on reserveeritud ülempiirid, mitte tegeliku
pildifaili suurused ega arve kasutajale.

Avaldatud katse `final_receipt.files_remaining` loendab koristamist vajavaid
SOURCE-faile. Null ei tähenda kogu konto nullmahtu ega WEB-piltide kustumist.
Kasutajale nähtav olek peab säilitama selle eristuse.

## Esimese muudatuse teostuspiir

1. Määratleda üks kinnitatud, lõpetatud SOURCE-objekt ning siduda töö olemasoleva
   konto, identiteedi, kuulutuse, katse, objekti, Storage-versiooni ja multipart-
   sessiooniga. Tõend peab tulema kontrollitud serveritoimingust.
2. Tõendada teenuse toetatud viisil selle sessiooni ja objekti lõplikkus.
   Tähtaja möödumine, üksik 404 või konto nullsumma ei asenda seda tõendit.
3. Kasutada püsivat claim/result järge, lõpetada üks objekt ühe piiratud tööga
   ning jätta võrgu-, katkestuse- või vastusekao korral tulemus ootele.
4. Vabastada ainult tõendatult koristatud SOURCE-i reserv. WEB ja tema sidumine
   avaldatud kuulutusega säilivad. Korduskutse ei vabasta reservi teist korda.

Serveri kitsas uus adapter võib paikneda
`src/server/listing-publication/final/settleHostedSourceOne.ts` failis;
see on pakutud failiroll, mitte juba olemasolev teostus. Kui senine mahukas
multipart-moodul vajab ühendamiseks muutmist, eraldada vajalik vastutus esmalt
väikeseks mooduliks, säilitades senise käitumise. Uus andmebaasileping kuulub
eraldi lisavasse, täpselt kontrollitud paranduspaketti. Varem väljastatud
`release.sql` ega selle räsikaitset tagantjärele ei muudeta.

## Selle sammu kontrollitav lõpptulemus

- Sama identiteedi üks lubatud SOURCE koristatakse; vale konto, identiteet,
  katse, objekt, versioon või kinnitamata sessioon kirjutust ei ava.
- Aktiivset WEB-objekti ei valita koristusse; pilt, galerii ja põhipilt säilivad.
- Kustutuse vastuse kadumine, katkestus, hiline kirjutus ja kaks samaaegset
  töötajat ei tekita valekinnitust ega korduvat mahu vabastamist.
- Omaniku serverikviitung, SOURCE-i tegelik puudumine ning objektireservi
  muutus on omavahel kooskõlas. Pelk koristustegevuse ACK ei ole lõpptõend.
- Muudetud osa sihitud kontrollid, vajalik build ja tegelik kasutustee läbivad;
  seejärel ajakohastatakse CURRENT_STATE, genereeritud üleandmine ja päevik.

Neid kontrolle pole käesoleva vastuvõtu dokumenteerimisel uuesti käivitatud.
Tegelik pilvekatse peab tulema uue teostuse järel selle konkreetse töö osana.

## Järgnevad piirid

Avaldatud fotode lisamine, asendamine ja eemaldamine, tühistatud/aegunud
katsete täielik koristus ning püsiv ajastatud koristamine jäävad hilisemateks
sama elutsükli sammudeks. Vana `listing-images` bucket’i brauseripoolset
lisamise/kustutamise loogikat ei ühendata otse uue privaatse vooga.

Hobusekuulutused jäävad samasse kuulutuste lisamise, otsingu, detaili ja
omanikuvaate voogu. Energy ja maksete tuum jäävad senisesse avaliku avamise
eelsesse ulatusse. Selle auditiga ühtegi kasutaja faili, kontot ega sisu
ei kustutatud ning tootmisele ühtegi käsku ei saadetud.
