<!-- SELQIRO_PRICE_INPUT_LOCAL_ACCEPTED_SOURCE_FINISH_20261009 -->
## 09.10.2026 — Hinnasisendi tegelik PASS ja sama lähteetapi lõpetamine

See algus asendab allpool ajalooliste V1/V2 käivituste järgmise tegevuse.
Jooksev tõeallikas on endiselt CURRENT_STATE.json ja sellest genereeritud 99-leht.
19:00 kasutajakäik läbis SQL/Node/build'i ning jättis 18 faili staging'usse samal
fb5be30 baasil. Ainult selle käigu täpne PASS-ZIP on uuele lõpetajale vajalik:
`listing-price-input-local-v2-20261009-190007-eepibvc8.zip`.
Ära korda V1/V2 paigaldajat, valuutakogujat ega SQL-i. Andmebaasi pole paigaldatud.

Uus `selqiro-finish-listing-price-input.py` säilitab testitud 11 faili ja muudab
ainult seitset juba stage'itud dokumenti. Generator --check ja handoff --check
on failide kontrollid; SQL/Node-sviite ei korrata. Värske build ning eraldi
COMMIT PUSH kinnitavad ainult selle 18-faililise lähteetapi. Tegelik commit/push/
puhas tööpuu loetakse lõpetaja result.json-ist, mitte ei ennustata dokumenti.
Ka pärast edu ei suuna repo leht lõpetajat uuesti käivitama: kontrolli tulemust.

Valitud eksport jääb 409 failiks; 398 algallika ja 11 uue faili vahe on dokumenteeritud.
5573-realise arhiivi ja renderdaja baidid jäävad samaks. Tõendi vanad failid võivad
sisaldada NEXT-käske, kuid need pole tänased juhised. Allpool vana 16-koodi laborivalim
on ajalugu: uus 154-koodi sisendiregister on lokaalselt testitud, UI-ga veel ühendamata.

Uue lõpetaja enda attempt-marker blokeerib topeltkirjutuse/commit'i; vanade paigaldus-
ja production-päevikute poole ta ei pöördu. Katkestus säilitab failid/indexi/võimaliku
commit'i ning nõuab raporti ülevaatust, mitte reset/restore/force-push või automaatset kordust.
Tulemusraport eristab ettevalmistust, päris kasutajakäiku, lähtekoodi ja productionit.

Järgneb hinna/valuuta nähtav muutmis- ja kuvamisvoog olemasolevate lepingutega.
Energy/maksed alles pärast põhivoogude ja nähtavate linkide lõpetamist. Iga uue
olulise üleandmispaketi juures tuleta kasutajale eraldi meelde selle allalaadimist.

---
<!-- SELQIRO_PRICE_INPUT_JSON_BOUNDARY_REPAIR_20261009 -->
## 09.10.2026 — hinnasisendi testi JSON-piiri ja generaatori eraldusparandus

16:58–16:59 V1 katse peatus enne esimest hinnakontrolli: input-suite 22P05
(235. rida), sest kogu maatriksi jsonb-laadimine kohtas bad_amount_26 U+0000 märki.
See on testi sisendipiiri viga, mitte 845 hinnareegli ebaõnnestumine. Kolm TS-moodulit
kompileerusid; Node, lähtekirjutus, build ja staging ei alanud. Valitud public-kataloog
taastus tühjaks ja ainult selle käigu abikonteiner eemaldati. Git oli alguses puhas
fb5be30 / remote-equal; katkestuse järel uut lõppkontrolli ei tehtud.
Tõend: listing-price-input-local-20261009-165859-z3on24xa.zip,
SHA256 7df7d18315cc4161e79b22d719de3d594763edfe080765bb14a67ea184808df7.

V2 säilitab kõik 845 algset sisendit/ootust ja 178 täpsuskaarti muutmata baitidega.
Test laadib JSON-i tekstina ja teisendab iga juhtumi eraldi jsonb-ks. Ainult täpne
algne nullmärgijuhtum võib keelduda dekodeerimisel 22P05-ga; ülejäänud 844 peavad
jõudma normaliseerijani. Veaallikas salvestatakse eraldi, seda ei nimetata hinnavalideerija
läbimiseks. Muud veakoodid ega vale juhtumi dekodeerimisviga ei lähe edukaks keeldumiseks.
Kaheksa lisaregressiooni eristavad algset bulk-viga, nullmärki/literaalset kaldkriipsu/
JSON nulli, fixed-nullhinda, täpset piirhinda ja täpselt kahte suletud väärtusfunktsiooni.
1058 algset Node'i kontrolli säilivad; päris SQL-vastuse võrdlus on nõutud enne paigaldust.

Generaator leidis varem lõputagi ainult rea algusest ning kaasas soovimatu
listing_price_legacy_label_v1 funktsiooni. Nüüd eraldab ta täpselt sama algse
normalize_listing_price_v1 lause (SHA256 1a703a5757cbdc7648d881db2a3af2234b891db855d4789bd44b5f1d36b33d45).
Hinnavalideerija keha ei muutu; kõrvaline abifunktsioon jäetakse uuest suletud fragmendist välja.
154 valuuta valik, skaalaandmed, klient/vormimudel, Node-test ja algmaatriks ei muutu.
Kohalik test nõuab nüüd päriselt täpselt kahte public-funktsiooni ning kummalgi puuduvat
PUBLIC käivitusõigust; varasem tühi järelkataloog üksi ei tõendanud funktsioonide arvu.

See on uus ettevalmistatud V2, mitte väide Maci SQL/build PASS-ist. Uus ainus sisend
on ülalnimetatud STOP ZIP, mitte uus XML-laadimine ega vana koguja kordus. Käivita ainult
selqiro-install-listing-price-input-corrected.py; kinnitus PRICE INPUT LOCAL V2.
Pärast kõiki teste, rollback'i ja oma abikonteineri eemaldamist kirjutab käiviti sama
18-failise paketi, teeb build'i ja staging'u. Commit/push puuduvad. STOP korral ära korda.
01–16 laborid, 23 migratsiooni, kasutajaliides, olemasolevad hinnad ja Energy säilivad.
Energy võetakse endiselt ette alles pärast põhivoogude ja nähtavate linkide valmimist.

---

## 09.10.2026 — valuutaregistri sisendietapp

Jooksev seis on CURRENT_STATE.json-is. Energy arendus algab alles pärast põhivoogude
ja nähtavate linkide kontrolli. Uus registry/input pakett ei lülita UI-d ümber.
Registri allikas: `data/currency/listing-currency-registry.v1.json`; `scripts/currency/generate_listing_price_registry.py --check` kontrollib tuletisi.

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
