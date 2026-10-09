# Selqiro — kiire ja kontrollitav vestlusevahetus

## Sisenemistee

Alusta `docs/99_V2_HANDOFF_NEXT_CHAT.md` failist. See on genereeritud kokkuvõte,
mitte teine käsitsi toimetatav tööseis. Muuda `docs/continuity/CURRENT_STATE.json`,
seejärel uuenda genereeritud lehte kontrollitud muudatuse sees. Kontrolliks:

```bash
python3 scripts/continuity/render_current_handoff.py --check
```

`--check` ei muuda faile. Ainult teadlik `--write` muudab genereeritud 99-faili;
seda pole vaja käivitada, kui check läbib. Järgmine lähtepakett peab mõlemad failid
koos uuendama. Jooksev leht jääb alla 100 rea; detailid vii viidatud lepingusse.
AI_BOOT/AI_INDEX pole käesolevas kontrollitud ekspordis: neid ei kirjutata oletatud
sisu järgi üle. Vana BOOT/sprint ei asenda tegelikku Git-seisu ja jooksva 99 algust.

## Tõeallikad ja ajad

- Tegelik Git/õiged failibaidid määravad lähtekoodi, index’i ja tööpuu.
- Käigu result.json ja logid määravad tehtud build’i, commit/push’i ning kontrollide ajad.
- Productioni skeemi määrab kuupäevaga serveritõend, mitte migratsioonifaili olemasolu.
- Deployment’i määrab täpse commit’i juurutuse tõend, mitte push üksi.
- Valmis kandidaat, läbi katsetatud kandidaat, paigaldatud lähtekood ja rakendatud
  andmebaas tuleb alati eraldi nimetada. Faili kuupäev ei tõenda toimingu tegemist.

Ära kirjuta enne commit’i selle tulevast räsi dokumenti. Selle checkpoint’i uus
räsi ja build/remote seis tulevad välistest tulemustest. Hilisem tavapärane
checkpoint võib selle kinnitatud räsi uue kirje alusena talletada.

## Failikaart hinnatöö sidumiseks pärast omaniku lugeja talletamist

| Vajadus | Täpne lähtekoht |
|---|---|
| Testitud suletud hinnatuum | supabase/labs/listing-price-core-v1/README.md |
| Testitud salvestus/loomine 04–09 | supabase/labs/listing-price-integration-v1/README.md |
| Testitud avalikud lugejad 10–14 ja neli parserit | supabase/labs/listing-public-read-v1/README.md |
| Omaniku lugeja 15–16 ja kaks parserit | supabase/labs/listing-owner-read-v1/README.md |
| Nende täpsed sõltuvused/testide ajutine asetus | listing-public-read-v1/PROVENANCE.json ja tests/TEST_LAYOUTS.json |
| Mõlema labori päritolu | nende PROVENANCE.json; integratsioonilabori tests/DEPENDENCIES.json |
| Ainult failiräside kontroll | supabase/labs/listing-price-integration-v1/verify_sources.py (ei SQL-i) |
| Uue hinnalepingu piirid | docs/architecture/listing-price-currency-v1.md algus |
| Tavakuulutuse loomine | app/sell/page.tsx |
| Vana muutmistee | app/my-page/page.tsx |
| V2 põhiväljade salvestus | src/entities/listing/api/updateListingBasics.ts |
| Muutmisvormi algväärtused | src/features/listing-edit/model/listingBasicsForm.ts |
| V2 vormi olek | src/features/listing-edit/model/useListingBasicsForm.ts |
| Range avaliku otsingu vastus | src/entities/listing/model/publicSearchResponse.ts |
| Ühine praegune hinnakuva | src/entities/listing/model/priceDisplay.ts |
| Omaniku ühine loend | src/entities/marketplace-item/api/getMyMarketplaceItems.ts |

379-failine kontrollitud baas ja selle checkpoint’i uued failid ei ole kogu repo. Puuduvat konteksti kogu ainult konkreetse
sõltuvuse jaoks; ära alusta uut üldist skeemiauditit, kui varasem tõend katab vajaduse.

Avalike lugejate kaks sviiti on eraldi. Node-testi `__dirname` sõltub ajaloolisest
ajutisest asetusest; seetõttu on täpsed testibaidid `*.reference.cjs.txt` failidena,
mitte ekslikult käivitatavate repo testidena. Neli parserit on päris `.ts` moodulid.
Järgmine harness võib asetuskaardi järgi taastada välise töökausta, ilma testisisu
muutmata. Vanad ühekorra käivitid ei ole üldised projektitestid.

## Kontrollitud keskkond (ajalooline, mitte automaatselt värske)

Kasutaja Mac: `$HOME/selqiro`, main, GitHub `Taivo17/selqiro`. Python 3.9+ standardteegid,
olemasolev Node/npm. Source-checkpoint: Git + olemasolev `npm run build`; peata dev
oma terminalis Ctrl+C abil. Ära tapa kasutaja protsesse, kustuta .next ega paigalda pakette.
Runner ei loe või ekspordi .env faile; tavapärane projekti build kasutab olemasolevat
keskkonnaseadistust. Git keskkonnaülekirjutused eemaldatakse ainult alamprotsessidest.

04.–09.10 laborikatsed kasutasid igaüks uut network-none helperit ja juba olemasolevat image’it
`sha256:5deba92e50cd17bfacf8603834d317cdf3bfc1c016ec8293991997fa3b55fa3d`.
Unix-socket oli `$HOME/.docker/run/docker.sock`, binaaritee `/usr/lib/postgresql/bin`,
PG17.6. Iga eduka käigu helper eemaldati. Algset `supabase_db_selqiro` ei kasutatud.
Binaar `pg_ctl` ja logisilt `version-pg-ctl` on eri nimed; silte ei lõdvendata.

03.10 productioni lugemise projekt: `vyjletlmwoiwxsnsunlm`, olemasolev hash-pinned
Supabase CLI 2.117.0 arm64. `db query --file` töötas; `--`-ga algavat SQL-teksti ei
anta positsioonilise argumendina. Ei npm/npx/latest, relink’i, config.toml oletamist
või vanade privaatlogide eksporti. CLI ei ole selle lähtecheckpoint’i tööriist.

## Lõpetatud toimingud — mitte praegused juhised

Lõpetatud on hinnatuuma v1 STOP ja v2 PASS, hinnalepingu audit v1 STOP/veadiagnostika/v2
PASS, 04.10 hinnatuuma lähtecheckpoint, 05.10 atomic-basics PASS, 06.10 loomise V1/V2 STOP ning V3 PASS. Lõpetatud on ka hinna kaitse/kuvamise, listing-renewal’i, search’i ja varasemad horse/wanted
rollout’id. Ära korda neid, muuda rakendatud migratsioone või kustuta COMPLETE päevikuid.
Uus checkpoint’i väline ainult oma attempt-marker on eraldi varasematest DB päevikutest.
Peatumisel tagasta uus raport; ära paranda staging’ut, reset/restore’i ega push’i käsitsi.

## Lahendamata launch-piirid

Hinnalabor ei paranda kogu portaali turvalisust. Avaliku listings SELECT-poliitika
`true`, vana konto-põhine write-RLS ja AI enrich’i ligipääsu/kulu ülevaatus jäävad eraldi.
Loomine/kordus ja atomaarne põhiväljade+hinna endpoint on lokaalselt testitud, mitte
productionis avatud. Veel on vajalikud versioonitud lugejad, tegelike kirjutajate ja
usaldatud rollide üleminek, kviitungi/kontoandmete säilitamine ning kustutusvooga sobitamine.
16 laborivaluutat on katsevalim; lõplik register vajab enne kasutajasisendit kontrolli.

## Väline üleandmispakk

Üks ALUSTA_SIIT + CURRENT_STATE, otsene source-context, vajalik test/skeemitõend ja
kontrollräsid. Ei ZIP-i sees ZIP-i ahelat. Ajaloolise jooksu failid on evidence all,
kandidaat ja committed source eri tähendusega kaustades. Ära kopeeri private-kausta,
.env-faile, võtmeid, konto- või sõnumiandmeid. Algseid kasutaja tõendeid ei kustutata.

## Uue paketi allalaadimise meeldetuletus

Kasutaja on 38d260a seisu eraldi alla laadinud. Iga uue olulise valmis üleandmise
juures tuleb vestluses eraldi öelda **Laadi see üleandmispakett nüüd alla** ja anda
täpselt uue faili link. Ära väida, et see salvestus automaatselt Maci. Vestlust ei
pea ennetavalt vahetama; fail on katkestuse puhuks. Vana pakett jääb alles.

Tõendifailide ümberpaigutuse kaardid seovad iga algse ZIP-kirje baitide ja räsiga.
Failiviide ei ole sandbox-tee ega terviklik rakendusandmete varukoopia. Käivitatava
Downloads-skripti nimi/sisend/kinnitus peavad kattuma selle skripti konstantidega.

## Omaniku lugemise lähtecheckpoint 09.10.2026

07.10 public-read source lõpetas commit’i 2e5a376; 09.10 owner-read katse lõpus oli
sama puhas main ja remote-võrdsus. Uue `listing-owner-read-source-*.zip` tegelik
tulemus määrab omaniku talletuse build’i/staging’u/commit’i/push’i. Uus commit pole
ette teada. Olemasolev 99 arhiiv ja renderdaja säilivad bait-baidilt.

Omaniku kaks algset parserit säilivad päris `.ts` failidena. Nende `./priceRead`
import läbib selgelt dokumenteeritud kahe realise re-export-faili, mis suunab ühe
juba talletatud public-read parseri juurde. See pole kopeeritud teostus ega uus UI
import. Failipäritolu kontroll seob nii algsed parserid, silla kui ka sõltuvuse.

Omaniku snapshoti retained allikas on tegelik saadetud READ ONLY/UTC tehing, mitte
varasemas payload'is olnud lühem paljas SELECT. TEST_LAYOUTS ütleb selle vahe ära.
Node/driver viited ei ole uus valmis testiraamistik ega luba vana testi korrata.

Pärast lähteetapi tulemuse ülevaatust koosta üks kitsas hinnatöö sidumisplaan,
mitte uus üldaudit ega lõputu laborite lisamine. Täisvormi algandmed, valuutaregister,
serveri expiry-filter, vanade kirjutajate ja RLS üleminek tuleb prioriseerida üheks
kasutajale nähtava tulemuse järjekorraks. Loendi väljavõtted ei ole salvestusandmed.

Tasuta lihtne AI kategooriaabi ning serveri kulukaitse on kasutajaga kinnitatud
hilisem suund. Algul pilt+pealkiri+lühikirjeldus, vajadusel üks piiratud mudelikõne,
alati käsitsi jätkamine. Piloodi arvulisi limiite ega praegust Energy hinda see
lähteetapp ei määra/muuda. Ei AI arendust käesoleva hinnatöö vahele.
