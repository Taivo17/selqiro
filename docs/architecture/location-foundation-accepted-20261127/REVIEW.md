# ASUKOHT-1 aluse raporti sõltumatu offline-vastuvõtt

## Otsus

**ACCEPTED_METADATA_OBSERVATION.** Kasutaja 27.11.2026 tagastatud raport vastab väljastatud muutmata diagnostikapaketile ning selle piiratud kataloogilepingule. Ühtegi vastuvõttu takistavat metaandmete, funktsioonikeha, lähtepuu, paketi või käsuväljundi lahknevust ei jäänud. **`implementation_ready=false` säilib.** Tegemist on asukoha aluse vaatlusraporti vastuvõtuga; asukoha kasutajaliidest, salvestust, kaugusotsingut ega kontokustutust selle tööga ei rakendatud.

Vaatluse aeg raportis: **27.11.2026 kell 11:38:42.003–11:38:52.034 UTC** (13:38:42–13:38:52 Eesti aja järgi). Projekt on `vyjletlmwoiwxsnsunlm`, sihtrepo `/Users/taivo/selqiro`, aktsepteeritud commit `7c53643012545c7dfa99ba976e6f2613e3c3a201`, tree `98444c7d31e7afac995f195d884700b60c82b6cf`.

Läbitud on **582 offline-kooskõlakontrolli**. Täielikud masinloetavad kontrollid on [review.json](review.json), käsuvoogude rekonstruktsioon [command-hash-reconciliation.json](command-hash-reconciliation.json), funktsioonide ja õiguste võrdlus [function-and-permission-reconciliation.json](function-and-permission-reconciliation.json) ning kõigi loetud sisendite räsid [input-hashes.json](input-hashes.json). [reconcile_report.py](reconcile_report.py) salvestab kontrolli täpse korratava loogika.

## Paketi ja lähteallika seos

| Kontrollitud objekt | Tulemus |
|---|---|
| Kasutaja raport | 310 390 baiti; SHA-256 `cc884c36ae31b5217b69c45e0810f28d5791572f462152225cf67d6fd11c5938` |
| Väljastatud ZIP | 723 766 baiti; SHA-256 `a84ae34c224ac72240f69bc4c703fffbabbcede55f1d1806ab27de07e3052533` |
| Paketi manifest | SHA-256 `e16ec81ccc063fc8d057750f260e0367c84f81713fddfce13dfee175e4ddc144` |
| Väljastatud käivitaja | SHA-256 `4256be1ee638226f72a878d6065e6d2741ff8bd2f3903d0c43035e212757a1a7` |
| Käivitatud kataloogi-SQL-i pin | SHA-256 `85111d2673e28db2e4524fa655f3bb1000d38980d171045c9452db3dc39e3b78` |
| Väljastatud range kataloogiparser | SHA-256 `0b3c58e0916b382ce3f147fe5f7c37410022fdfc21a3a5c2b9506595d029a2ec` |
| Aktsepteeritud lähtefailide inventuur | SHA-256 `22bbd39ef2651b4ad3d0c1cc2b0742250cb176c531dd22debcc19a87122032f2` |

Raport ja JSON-sisendid loeti parseriga, mis lükkab korduvad võtmed ning mittestandardsed arvkonstandid tagasi. Raporti baidid vastavad ka väljastatud journali JSON-vormindusele. Käivitaja AST-st loetud manifestipin ja 12 mooduli loetelu vastavad täpselt manifestile. Kõik **79 manifestis nimetatud faili**, lisaks käivitaja ja manifest ise, klapivad **81 failiga** pitseeritud paketis. ZIP-i faililoend, iga faili baidid ja CRC klapivad kataloogiga; topeltkirjeid ei ole. Kontrolliti ka kõigi 80 dokumenteeritud koostamissisendi säilimist.

Kohaliku aktsepteeritud lähtekoopia **2443 faili, kokku 40 032 703 baiti**, vastavad inventuuri SHA-256- ja Git-blob-pinnidele. Inventuurist rekonstrueeritud Git-tree objekt vastab eespool nimetatud tree-le. Kataloogipaketi 11 valitud lähtefaili kontrolliti eraldi pikkuse, SHA-256, Git-blobi ja inventuuris oleva režiimi järgi. See kontroll ei kasutanud ühtegi Git-käsku.

## Raportis kirjeldatud töö ulatus ja säilimine

Väljastatud `workflow.py`, `git_guard.py`, `catalog_access.py`, `receipts.py` ning `transport.py` alusel on raporteeritud järjestus kooskõlaline: algne lähte- ja indeksikontroll, remote'i lugemine, üks kataloogipäring ning lõplik lähte- ja indeksikontroll. Põhikäske on **29** ja kataloogipäringu käsukirjeid **täpselt üks**. Päring on eraldi loetud enne käivitust ning sellel puudub automaatne korduskatse.

SQL sisaldab ühte `READ ONLY` tehingut, kuut `SET LOCAL` seadet, ühte piiratud kataloogipäringut ning `ROLLBACK`-i. SQL-i staatiline ülevaatus ei leidnud andmeid muutvaid lauseid, rakendus-RPC käivitusi ega `FROM`/`JOIN` lugemisi rakenduse või Authi andmetabelitest. `auth.users` kohta vaadeldakse vaid nelja määratud veeru metaandmeid. Andmebaasi päringu ajapiir on 20 sekundit, lukupiir 3 sekundit ja idle transaction piir 25 sekundit; välise käsu ülempiir on 45 sekundit.

Enne- ja pärast-kokkuvõtted on täpselt võrdsed: `main`, commit, tree, 2443 lähtefaili, puhas kontrollitud tööpuu, sama indeksi räsi ning sama indeksikirjete räsi. Remote'i kirjeldus ja rekonstrueeritud `ls-remote` väljund näitavad raportis sama `main` commit'i. Viie olemasoleva Supabase CLI faili kontrolli kokkuvõte vastab väljastatud CLI 2.117.0 pinnidele ning õige projekti fikseeritud seosele.

Varasema tööotsingu raporti algfaili pikkus 1 452 209 ja SHA-256 `39a9e0d2296e360c4fe3c210b56fca291593ac5965f33368dd3f4de70a38176f` vastavad paketi viitele ja mõlemale raportis kirjeldatud säilitatud eksemplarile: privaatne journal ning Downloads-fail. Väljastatud `Lease` loeb need muutmata, hoiab olemasolevat lukku lugemiseks avatud failideskriptoriga ning kontrollib lõpus nii sisu kui faili identiteeti. Neid faile ei taastata diagnostikapaketist.

## Käsuväljundite tõendite piir

| Vood | Täpselt rekonstrueeritud | Ainult säilitatud räsi ja pikkus |
|---|---:|---:|
| 29 põhikäsu stdout | 29 | 0 |
| 29 põhikäsu stderr | 28 | 1 |
| 29 lõpetamisproovi stdout ja stderr | 58 | 0 |
| 4 runtime-proovi stdout ja stderr | 4 | 4 |
| **Kokku** | **119** | **5** |

Kõigi 29 põhikäsu stdout'i pikkused ja SHA-256-räsid taastati raportis säilitatud väärtustest ning väljastatud koodi täpsest käsujärjekorrast. See hõlmab tervet kataloogi CLI JSON-ümbrist: **269 287 baiti**, SHA-256 `8d1d9a8844c934705a317a89c92809715648a15426e5a826e70de0cf2081f203`. Täpselt rekonstrueeritud ümbris läbis uuesti **väljastatud** `catalog_contract.parse_result` parseri ja tagastas identse kataloogi.

Kataloogikäsu **27-baidise stderr'i** sisu ei ole raportis säilitatud. Selle SHA-256 on `d63ec9b582f91b009666c34b62e1182141e707f0fc265622635695ee17cbd8c7`; sellele ei omistata oletatavat tekstisisu, hoiatusvabadust ega muud tähendust. Samuti ei ole säilitatud nelja runtime-proovi protsessiloendite toorväljundeid. Need viis voogu on teadlikult liigitatud läbipaistmatuks räsi- ja pikkusetõendiks.

Kõik põhikäsud on lõpetatud kinnitatud stream sulgemise ja kontrollitud protsessigrupi lõpuga; ükski signaal ei ole raporteeritud saadetuna. `git config` väljumiskood 1 on väljastatud koodis lubatud puuduva mirror-sätte puhul. Protsessigrupi kontrollide väljumiskood 1 vastab raporteeritud tühjale tulemusele. Runtime'i kokkuvõte puudutab vaatluse hetke enda real-UID JavaScripti protsesse; see ei väida, et rakendus pole kunagi varem töötanud või et teise kasutaja protsesse kontrolliti.

## Kataloogi sisu ja võrdlus

Vaatluse roll on `postgres`, PostgreSQL versiooninumber **170006**. Kataloogi `facts_sha256` arvutati sõltumatult PostgreSQL jsonb tekstiesituse reeglite järgi uuesti: `eb0bcb241ed6d1d0f786dc06a59b91ecbef0b584d594b105b704331a3c08d2c0`. Kõigis 19 andmerühmas on tagastatud ja koguarv võrdsed; tulemuse kärpimist ei esine. Olemas on kõik kuus nõutud relatsiooni ja kõik 11 küsitud funktsioonisignatuuri ühe ülekoormusega. Kokku on 12 funktsiooni, sest kaasa tuli ka üks fikseeritud loendist erinev otsese triggeri funktsioon.

Vaadeldud on muu hulgas **75 veergu, 33 piirangut, 25 indeksit, 24 RLS-poliitikat, 18 otsest poliitikafunktsiooni sõltuvust, 2 triggerit, 181 grant-rida ja 291 efektiivsete õiguste rida**. `coverage=complete` tähendab selle fikseeritud ulatuse terviklikku hõivet, mitte kogu andmebaasi, transitiivse funktsioonigraafi või rakenduse täielikku auditit.

Kõik **8 praeguse SQL-allika täpsest dollar-tsiteeritud funktsioonikehast** tuletatud räsi ja baidipikkust klapivad värske vaatlusega. Kontrolliti ka nende owner'it, definer-olekut, keelt, volatility't, search_path konfiguratsiooni räsi ja vaikimisi argumentide puudumist. `auth.uid()`, `profile_editor_private.touch_revision()` ning lisatud `public.validate_profile_active_identity_v2()` body/definition/config/owner sõrmejäljed klapivad varasema aktsepteeritud kataloogipinniga. Mõlemad otseste triggerite kirjed klapivad varasema kaitstud triggeri kirjega.

Ka `account_is_available` ja `get_store_by_slug` praeguse public-profile lepingu samas ulatuses võrreldavad metaandmed ning täpsed grant'id klapivad. Selle varasema lepingu laiemat sõltuvusgraafi siinne päring uuesti ei hõlma.

**Kahe kontooleku CHECK-piirangu räsierinevus on täielikult lahti seletatud.** Varasem kataloog kasutas `pg_get_constraintdef(oid)`, uus kataloog kasutab `pg_get_constraintdef(oid,true)`. Näiteks `CHECK ((revision > 0))` ja `CHECK (revision > 0)` annavad eri räsid. Mõlema vana/uue täpse teksti räsi taastati; sama tehti `state = 'active'::text` piiranguga. See on vorminduse erinevus, mitte tõend piirangu sisulise muutuse kohta. Võõrvõtme ja primaarvõtme räsid on identsed.

## Õigused ja ASUKOHT-1 rakenduse jaoks kinnitatud asjaolud

1. Praegused `get_my_profile_editor_v1` ja `save_my_profile_editor_v1` on käivitatavad rolliga `authenticated`; `anon` ja `service_role` jaoks on nende execute keelatud. Private editor-helperid, account-helper ning nende skeemid on kõigi kolme rakendusrolli eest suletud.
2. Pärandkirjutajad `save_my_active_identity_profile` ning `update_my_active_identity_location` on `PUBLIC`/`anon`/`authenticated` jaoks revokitud. **`service_role` execute säilib.** Nende kehade vastavust uuele salvestuslepingule ei väideta ja kliendipääsu taastamist ei lubata.
3. Profiili asukohaveergudele puuduvad `anon`/`authenticated` otsesed INSERT/UPDATE õigused. Algsete profiili, identiteedi ja ettevõtte loomise lubatud veerugrant'id ning `profiles.language`/`active_identity_id` uuendamise grant'id vastavad allika lubatud eranditele.
4. `postgres` omaniku `public` skeemi funktsioonide vaikimisi grant'id annavad EXECUTE rollidele `anon`, `authenticated` ja `service_role`. Tulevaste RPC-de/helperite migratsioon peab oma lõplikud REVOKE/GRANT õigused selgelt kehtestama.
5. `identity_profiles` sisaldab praegu tekstilisi `country`/`city` välju, nullable `lat`/`lng` double precision välju ja mitte-null UUID `profile_revision` välja. Normaliseeritud riigi-/kohavaliku lepingut see olemasolev skeem veel ei esita.
6. Täpselt allikaga klappiv `profile_editor_private.lock_owner` kontrollib kasutajat, aktiivset identiteeti, omanikku ja ettevõtte liikmesust, **kuid ei kutsu `account_is_available` helperit**. Tulevane asukoha kirjutus peab aktiivse konto kontrolli teadlikult lisama.
7. `account_states` jääb privaatseks active-only aluseks. See raport ei tõenda konto sulgemise, taastamise, lõpliku kustutamise, sessioonide või andmepuhastuse valmidust.

## Laienduste seis ja järgmise töö piir

| Laiendus | Saadaval | Paigaldatud | Vaadeldud versioon/asukoht |
|---|---|---|---|
| PostGIS | Jah | **Ei** | Vaikeversioon 3.3.7; paigaldusskeem puudub |
| pg_trgm | Jah | Jah | 1.6, `public`, omanik `supabase_admin` |
| unaccent | Jah | Ei | Vaikeversioon 1.1 |

Selles vaatluses ei paigaldatud ühtegi laiendust. PostGIS-i saadavus ei tähenda, et lähimuseotsing või ruumiandmete uus salvestus on juba olemas. Jätkamiseks on tõendatud olemasolev alus: järgmine töö on endiselt **ASUKOHT-1 ühine riigi-/kohavalik ja profiili vaikeasukoha salvestus**, säilitades kasutaja kinnitatud riigipiiri, eraisiku ligikaudse asukoha, ettevõtte teadliku täpse avaliku asukoha ning vanade kuulutuste puutumata jätmise nõuded.

## Tõendi piirangud

Raport on kasutaja tagastatud allkirjastamata täitmisraport. Vastuvõtt kontrollib selle sisemist ja väljastatud koodiga kooskõla; see ei ole eraldi ühendusega tehtud uus live-kontroll. Maci indeksi toorbaite, viit CLI binaar-/paketifaili ega säilitatud receipt-failide inode/režiimi/ajatempleid raport ei ekspordi. Neid kinnitab väljastatud koodi kontrollitud läbimine ja raporti kokkuvõte, mitte siin sõltumatult loetud Maci failid.

Selles ülevaatuses ei käivitatud ühtegi rakendusetesti, build'i, SQL-i, Supabase CLI-d, Git-käsku ega võrgupäringut. Vanad paketid, raportid, lähtefailid ja audititulemused jäid muutmata. Uued kirjutused on ainult kataloogis `work/location-foundation-accepted-20261127/review/`.
