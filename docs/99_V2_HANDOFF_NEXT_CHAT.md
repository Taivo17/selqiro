<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-06

## Praegune checkpoint

Testitud 10–14 avaliku hinnalugemise ja nelja parseri talletamine suletud laborina. See ei ühenda kasutajaliidest ega rakenda skeemi.

## Lähtekood ja tõendi piir

- **Autoriteet:** CURRENT_STATE genereerib jooksva 99-lehe. Tegelik Git ja käiguraport eristavad paigaldatud/stage’itud/commit’itud/push’itud seisu; production vajab eraldi tõendit.
- **Selle etapi tegelik tulemus:** Loe listing-public-read-source-*.zip: BUILD, COMMIT, NEW_COMMIT, PUSH, WORKTREE ja REMOTE. Dokument ei saa teada oma tulevast commit-räsi ega tõenda käivitamist.
- **Viimane kinnitatud baas:** e4b41436a88048ce828ff520ac6ce39d5ce372ef; 06.10.2026 22:12:30 +03 puhas main ja GitHubiga võrdne. Uus käiviti peab enne kirjutusi tegeliku seisu uuesti kontrollima.

## Tegelik kohalik katse

- Repos olev alus: core 154 SQL +3 paari (04.10), basics 110 +5 (05.10), creation 170 +5 regressiooni +2 isolatsioonikeeldumist +7 paari (06.10 09:24) PASS; selles lähteetapis ei kordu.
- Search/hind 06.10 12:08–12:09 +03: 154 SQL, 156 Node (5 päris SQL-capture’iga), 2 mitteblokeerivat paari ning tüübid/valitud rollback/helper-cleanup PASS.
- Detail/profiil 06.10 22:11–22:12 +03: 320 SQL (172 registripariteeti nende sees), 154 Node (7 päris SQL-capture’iga), 2 paari ning tüübid/rollback/cleanup PASS.
- Täpsed failid ja tõendi päritolu: listing-public-read-v1/PROVENANCE.json. Valitud PG17.6 üheksa tabelit ja sünteetiline auth pole HTTP/JWT/kogu Supabase, brauser või koormustest.

## Production / kasutajaliides

- 01–14 hinnalabori skeemi pole productionis ega algses kohalikus andmebaasis rakendatud. 23 olemasolevat migratsiooni ja töötav UI säilivad.
- 03.10 13:22–13:23 +03 varasem kataloog: 23/23 ajalugu. Viimane runtime-hinnakuva kasutajakinnitus 02.10 /6df0af9; hilisem source-push ei tõenda deployment’i.
- Uued avalikud lugejad jäävad suletuks; vana search-v1, runtime’i kirjutajad/lugejad ning omaniku olemasolevad võimalused ei muutu.

## Üks järgmine töö

Kõigepealt vaata selle avaliku lugemiskihi lähtecheckpoint’i tulemus üle. Edu järel koosta eraldi owner ordinary/horse/wanted lugemisleping õige aktiivse identiteedi õiguse ja täpse hinnaseisuga, säilitades hobuse müügihinna ja otsija eelarve tähenduse. STOP korral vaata ainult raportit; ära alusta uut funktsiooni.

**Peatumisel:** Säilita failid, index, võimalik commit ja raport. Ära korda käivitit, reset/restore’i, SQL-i või push’i enne konkreetse vea ülevaatust.

## Loe ainult vajalikku

- `supabase/labs/listing-public-read-v1/README.md`, PROVENANCE.json ning tests/TEST_LAYOUTS.json; tests/DEPENDENCIES.json seob ühe korra talletatud aluse.
- `src/entities/marketplace-item/api/getMyMarketplaceItems.ts`, api/mappers.ts, model/types.ts ning asjakohane vana get_my_marketplace_items_v2 serverileping.
- `docs/architecture/listing-price-currency-v1.md` algus; `docs/continuity/README.md` annab keskkonna ja failikaardi.

## Säilivad piirid

- Täpsed algsummad/valuuta eraldi kuvamisest; 16 valuutat on laborivalim, mitte lõplik register. Ei euro oletust, testandmete taastäitmist ega kustutamist.
- Avalik hind ei kanna hinnarevisjoni, loomise võtit ega kviitungit. Omaniku mitteavaliku sisu tee jääb eraldi; horse/wanted pole ordinary hinnavälja erandid.
- Detail/search lubavad NULL-tähtaega; profiil mitte. Truncation/images_has_more ja vana []→NULL filtripiir tuleb kliendiga teadlikult ühendada.
- Lai SELECT/RLS, vana konto-põhine write, usaldatud kirjutajad, receipt/konto kustutus ja taastuv lisamisvoog jäävad eraldi avamise piirideks.
- Basics väärtus-CAS pole üldine revisjon; loomine READ COMMITTED ja sequence-lüngad lubatud. Eraldi HTTP-kutsed pole üks snapshot.
- FX/krüpto/Energy/hobuseavaldamine ja Detailide redaktor/ühikud eraldi. Ühikuid ei otsita pealkirjast ega kirjeldusest.
- Uue olulise paketi juures ütle: „Laadi see üleandmispakett nüüd alla.” See pole automaatne salvestus ega nõue vestlust vahetada.

## Keskkond

- Mac $HOME/selqiro, main, GitHub Taivo17/selqiro. Python 3.9+ ja olemasolev npm. Enne build’i peata oma dev-server Ctrl+C abil.
- Selles lähteetapis pole SQL-i, Dockerit, Supabase CLI-d, pakettide paigaldust ega vanade päevikute muutmist. Tavalised hook’id/CI võivad käivituda.
- Mitte korrata: lõpetatud source/test/audit/apply käiviteid, sh hinnalugeja ning public-surfaces test. STOP: säilita failid/index/commit ja tagasta uus raport.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
