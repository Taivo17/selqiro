<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-06

## Praegune checkpoint

Testitud 04–09 hinna salvestus- ja loomisintegratsiooni talletamine suletud laborina. Kasutajale uut sisendit ega API õigust ei avata.

## Lähtekood ja tõendi piir

- **Autoriteet:** See JSON genereerib jooksva 99-lehe. Tegelik Git ja käiguraport määravad tehtud lähtepaigalduse; production ja deployment vajavad eraldi kuupäevaga tõendit.
- **Selle etapi tegelik tulemus:** Loe listing-price-integration-source-*.zip: BUILD, COMMIT, NEW_COMMIT, PUSH, WORKTREE ja REMOTE. See dokument ei saa sisaldada oma tulevast commit-räsi ega tõenda paigaldamist.
- **Viimane kinnitatud baas:** 38d260af982bd41784ce4d5cb5fca6db31535a88; 06.10.2026 09:24:49–50 +03 puhas main ja GitHubiga võrdne. See ei ole tänane automaatne live-kontroll.

## Tegelik kohalik katse

- Hinnatuum 01–03: 04.10.2026 154 SQL-kontrolli + 3 kattuvat seansipaari PASS; talletatud 38d260a all.
- Põhiväljad 04–05: 05.10.2026 10:25–10:26 +03, 110 SQL-kontrolli + 5 kattuvat seansipaari PASS.
- Loomine 06–09: 06.10.2026 09:24 +03, 170 SQL + 5 regressiooni + 2 isolatsioonikeeldumist + 7 kattuvat seansipaari PASS; tõend listing-creation-local-v3-20261006-092421-ozo7ic85.zip.
- Mõlemad integratsioonikatsed: valitud rollback ja ainult oma võrguta helperi eemaldamine PASS. Need ei kordu lähtecheckpoint’is. Täpsed räsid: integratsioonilabori PROVENANCE.json.
- Valitud 7 tabelit, sünteetiline auth, laboris superuser; mitte kogu Supabase/JWT/HTTP, kõik lukujärjestused või koormustest. Sequence-lüngad on lubatud.

## Production / kasutajaliides

- Hinnatuum ning 04–09 EI OLE productionis ega algses kohalikus andmebaasis rakendatud. 23 olemasolevat migratsiooni säilivad muutmata.
- 03.10.2026 13:22–13:23 +03 kaks kattuvat kataloogilugemist, 23/23 ajalugu; varasem tõend, mitte selle talletamise uus päring.
- 6df0af9 UI hinnakuvamise production-kinnitus 02.10.2026. 38d260a oli labor/dokumendid; uue lähtecommit’i deployment pole automaatselt tõendatud. Rakenduse runtime ei muutu.

## Üks järgmine töö

Pärast selle täpse lähtecheckpoint’i tulemuse ülevaatust koosta ja testi versioonitud hinnalugemise leping (hinnaliik ja täpne summatekst), kooskõlas search-v1 ning omaniku loendi ja detaili lugejatega. Täielik valuutaregister ja vanade kirjutajate üleminek peavad olema enne API/UI avamist koordineeritud. Kui talletamine peatus, vaata ainult seda tulemust; ära alusta uut funktsiooni.

**Peatumisel:** Säilita failid, index, võimalik commit ja raport. Ära korda käivitit, reset/restore’i, SQL-i või push’i enne konkreetse vea ülevaatust.

## Loe ainult vajalikku

- `supabase/labs/listing-price-integration-v1/README.md`, PROVENANCE.json ja tests/DEPENDENCIES.json; tuum on ainult ../listing-price-core-v1/ all.
- `docs/architecture/listing-price-currency-v1.md` algus ning labori CREATION_CONTRACT.md: salvestus-, taastumis- ja avamispiir.
- `docs/continuity/README.md`: failikaart, keskkond ja lõpetatud toimingud. Väline viimane tulemus annab tegeliku uue commit’i.

## Säilivad piirid

- Originaalsumma ja fiat-valuuta eraldi kuvavaluutast; 16 valuutat on testivalim. Ei oletatud eurot, testkuulutuste taastäitmist ega kustutamist.
- Uued ridadega töötavad read/save/create funktsioonid on suletud; puhtad väärtushelperid eraldi. Testitud SQL ei ole live-õiguste ja kõigi usaldatud kirjutajate audit.
- Basics CAS on väärtuste, hind revisjoni järgi; loomine nõuab READ COMMITTED, sama võti taastab sama objekti. Kviitungi säilitamine ja konto/kirje kustutamine vajavad eraldi lepingut.
- Pildid, geokodeerimine, AI ja poe-rubriigid pole SQL-tehingu osa. Taastuv publish-first kasutajaliides on veel ühendamata; FX/krüpto/Energy/maksed/hobuseavaldamine eraldi.
- Mõõtühikud ainult toetatud Detailide mõõduväljadele, mitte pealkirjast/kirjeldusest ega vabateksti oletusest. Detailiredaktor eraldi.
- Lai listings SELECT, vana konto-põhine write-RLS ja AI enrich’i ligipääs/kulu jäävad eraldi käivitamiseelseteks töödeks.
- Uue olulise välise paketi juures ütle: „Laadi see üleandmispakett nüüd alla.” See pole automaatne salvestus ega nõue vestlust vahetada.

## Keskkond

- Mac: $HOME/selqiro, main, GitHub Taivo17/selqiro; Python 3.9+ ja olemasolev npm. Enne lähtebuild’i peata dev ise Ctrl+C abil.
- Selles talletamises ei ole SQL-i, Dockerit, Supabase CLI-d, pakettide installi ega vanade operatsioonipäevikute muutmist. Tavalised Git hook’id/CI võivad käivituda.
- Mitte korrata: completed core source, core v1/v2, basics, creation v1/v2/v3, auditid/diagnostika ja rakendatud migratsioonid. STOP: säilita failid/index/commit ja saada raport.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
