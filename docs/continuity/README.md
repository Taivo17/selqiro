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

## Failikaart järgmise hinnaintegratsiooni jaoks

| Vajadus | Täpne lähtekoht |
|---|---|
| Testitud suletud hinnatuum | supabase/labs/listing-price-core-v1/README.md |
| SQL, muutmata testid ja päritolu | sama kausta PROVENANCE.json ning tests/ |
| Uue hinnalepingu piirid | docs/architecture/listing-price-currency-v1.md algus |
| Tavakuulutuse loomine | app/sell/page.tsx |
| Vana muutmistee | app/my-page/page.tsx |
| V2 põhiväljade salvestus | src/entities/listing/api/updateListingBasics.ts |
| Muutmisvormi algväärtused | src/features/listing-edit/model/listingBasicsForm.ts |
| V2 vormi olek | src/features/listing-edit/model/useListingBasicsForm.ts |
| Range avaliku otsingu vastus | src/entities/listing/model/publicSearchResponse.ts |
| Ühine praegune hinnakuva | src/entities/listing/model/priceDisplay.ts |
| Omaniku ühine loend | src/entities/marketplace-item/api/getMyMarketplaceItems.ts |

Kõik 313 valitud allikat ei ole kogu repo. Puuduvat konteksti kogu ainult konkreetse
sõltuvuse jaoks; ära alusta uut üldist skeemiauditit, kui varasem tõend katab vajaduse.

## Kontrollitud keskkond (ajalooline, mitte automaatselt värske)

Kasutaja Mac: `$HOME/selqiro`, main, GitHub `Taivo17/selqiro`. Python 3.9+ standardteegid,
olemasolev Node/npm. Source-checkpoint: Git + olemasolev `npm run build`; peata dev
oma terminalis Ctrl+C abil. Ära tapa kasutaja protsesse, kustuta .next ega paigalda pakette.
Runner ei loe või ekspordi .env faile; tavapärane projekti build kasutab olemasolevat
keskkonnaseadistust. Git keskkonnaülekirjutused eemaldatakse ainult alamprotsessidest.

04.10 lab kasutas uut network-none helperit ja juba olemasolevat image’it
`sha256:5deba92e50cd17bfacf8603834d317cdf3bfc1c016ec8293991997fa3b55fa3d`.
Unix-socket oli `$HOME/.docker/run/docker.sock`, binaaritee `/usr/lib/postgresql/bin`,
PG17.6. Lõplik helper eemaldati. Algset `supabase_db_selqiro` ei kasutatud.
Binaar `pg_ctl` ja logisilt `version-pg-ctl` on eri nimed; silte ei lõdvendata.

03.10 productioni lugemise projekt: `vyjletlmwoiwxsnsunlm`, olemasolev hash-pinned
Supabase CLI 2.117.0 arm64. `db query --file` töötas; `--`-ga algavat SQL-teksti ei
anta positsioonilise argumendina. Ei npm/npx/latest, relink’i, config.toml oletamist
või vanade privaatlogide eksporti. CLI ei ole selle lähtecheckpoint’i tööriist.

## Lõpetatud toimingud — mitte praegused juhised

Lõpetatud on hinnatuuma v1 STOP ja v2 PASS, hinnalepingu audit v1 STOP/veadiagnostika/v2
PASS ning hinna kaitse/kuvamise, listing-renewal’i, search’i ja varasemad horse/wanted
rollout’id. Ära korda neid, muuda rakendatud migratsioone või kustuta COMPLETE päevikuid.
Uus checkpoint’i väline ainult oma attempt-marker on eraldi varasematest DB päevikutest.
Peatumisel tagasta uus raport; ära paranda staging’ut, reset/restore’i ega push’i käsitsi.

## Lahendamata launch-piirid

Hinnalabor ei paranda kogu portaali turvalisust. Avaliku listings SELECT-poliitika
`true`, vana konto-põhine write-RLS ja AI enrich’i ligipääsu/kulu ülevaatus jäävad eraldi.
Samuti puuduvad veel uus loomise idempotentsus, atomaarne põhiväljade+hinna endpoint,
versioonitud lugejate üleminek ning labori kustutuspiiri live-kustutusvooga sobitamine.
16 laborivaluutat on katsevalim; lõplik register vajab enne kasutajasisendit kontrolli.

## Väline üleandmispakk

Üks ALUSTA_SIIT + CURRENT_STATE, otsene source-context, vajalik test/skeemitõend ja
kontrollräsid. Ei ZIP-i sees ZIP-i ahelat. Ajaloolise jooksu failid on evidence all,
kandidaat ja committed source eri tähendusega kaustades. Ära kopeeri private-kausta,
.env-faile, võtmeid, konto- või sõnumiandmeid. Algseid kasutaja tõendeid ei kustutata.
