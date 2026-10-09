<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-09

## Praegune checkpoint

Muutmislehe eraldamine läbis tegelikud 198 moodulitesti, build'i ja kasutaja vaatamiskontrolli. Lõpetaja kinnitab sama 17-failise lähteetapi; tegelik commit/push selgub uuest tulemusest, mitte sellest dokumendist.

## Lähtekood ja tõendi piir

- **Lõpetamise piir:** Muudab ainult seitset sama paketi dokumenti. Kümme testitud rakendus-/testifaili säilivad. Uus räsi ja lõppseis tuleb finisheri result.txt-st; kontrolli Git enne järgmist kirjutust.
- **Tõend:** listing-edit-composition-20261009-213330-i2cqjhzn.zip; SHA256 b451ca55c86b1f241244580394d9aa2dc97294675dad3ebdb57e937533a9c768; 622 faili /621 manifestiräsi /418 allikat.
- **Viimane tegelik seis:** f8a624140b206611162dbd3f74ce33278bfab813, vanem fb5be305745cf016afdb8db293c8ac23d270ce55; 09.10 21:33:56 +03 lõpus 17 staged (9 add/8 modify), kõrvalmuudatusi polnud, remote võrdne baasile. Tööpuu ei olnud puhas.

## Tegelik kohalik katse

- 09.10 21:33 kasutajakäigus 198 Node-testi (48 uut +150 senist) ja päris npm run build PASS. Testides sünteetilised hook/JSX/API; mitte DOM/HTTP/pildikirjutused.
- Kasutaja: „kõik tundub olevat korras”; kuus desktop/narrow pilti. Vaatamiskontroll vastu võetud; üksikuid linke, uusi kirjutusi, kogu mobiili või identiteedirasse eraldi ei tõendatud.
- Lõpetaja kontrollib generaatori ja handoff'i vastavust ning teeb värske build'i. SQL-i, 198 testi ega vastuvõetud brauserikontrolli ei korrata. Varasemad hinnasisendi testid säilivad tõendina.

## Production / kasutajaliides

- Lõpetaja ei käivita DB/SQL/Docker/Supabase/install käske ega muuda andmeridu. Kõik 23 migratsiooni ja 01–16 labor säilivad; uut hinnaskeemi ei rakendata.
- 140-realine edit-page ja kaheksa moodulit säilitavad senise toorhinna, salvestuse, pildid ja rubriigid. Valuutavalik/atomaarne save pole avatud; hobusemuutmine ja uuendamine säilivad.
- Pildi reload/unsaved/rasside piir pole refaktoriga parandatud. Juurutus kontrollimata; Git hookid/CI võivad käivituda. Vajadusel kontrolli täpset uut juurutust eraldi.

## Üks järgmine töö

Kui lõpetaja tulemust pole, käivita ainult selqiro-finish-listing-edit-composition.py ja tagasta listing-edit-composition-finish-...zip. Olemasoleva tulemuse korral loe seda, ära korda. Pärast ülevaadatud PASS-i sama olemasoleva kuulutuse hinna/valuuta serveri+kliendi ühendus: omaniku snapshot, üks atomaarne save, kõik hinnavaated ja vanade kirjutajate/õiguste üleminek.

**Peatumisel:** Säilita failid, index, võimalik commit ja raport. Ära korda käivitit, reset/restore’i, SQL-i või push’i enne konkreetse vea ülevaatust.

## Loe ainult vajalikku

- src/features/listing-edit/components/ListingEditPage.tsx ja väikesed ListingEdit* moodulid; useListingEditImages säilitab lehe elutsükli.
- tests/listing-edit-composition.test.cjs; docs/architecture/listing-price-currency-v1.md algus; testipildid pole andmebaasikirjutused.
- Täpne hinnasisend ja 04–05 snapshot/save ning 10–16 lugejad on olemas. Pärast refaktorit ühenda need serveriõiguste/vanade kirjutajate üleminekuga.

## Säilivad piirid

- 154 uuteks hindadeks valitud koodi, mitte maksevaluutade või riikide loend. Ajalooline/algne hind säilib kuni teadliku muudatuseni; 0 pole tasuta.
- Summa tekstina; koma/punkt tähendab kümnendkohta, rühmituseraldajad keelatud. Üleliigseid komakohti ei ümardata. Valuutavahetus ei teisenda summat.
- Muutmata hind jäetakse kirjutusest välja. ListingPriceDraft on lokaalne väljamudel, mitte uus kohustuslik nähtav mustand. Üks Salvesta põhiväljadele ja hinnale.
- API/UI avamise eel endiselt õigused, legacy-writer üleminek, HTTP ja brauserikontroll; loendi väljavõtted pole redaktori algandmed. Uusi expiry-filtreid pole hinnatööks vaja.
- Energy/maksed pärast lisamise/muutmise, leidmise/kontakti ja nähtavate tegevuste töökorda saamist. Tasuta piiratud kategooriaabi oma kulukaitsega hiljem.
- Ei FX-i/krüptot/ühikuid, AI-kutseid ega testkuulutuste/piltide/päevikute kustutamist. Uue olulise üleandmise juures ütle: Laadi see üleandmispakett nüüd alla.

## Keskkond

- Mac $HOME/selqiro; Python 3.9+, olemasolev Git/npm. Peata dev ise Ctrl+C-ga. Dockerit pole vaja, pakette ei paigaldata. GIT_*/Node ülekirjutused puhastatakse ainult alamprotsessides.
- Ainus sisend Downloads-is: listing-edit-composition-20261009-213330-i2cqjhzn.zip. Kinnitused FINISH EDIT COMPOSITION ja COMMIT PUSH. Üks tavaline SHA→main push, mitte force.
- Ära korda refaktoripaigaldajat, hinnasisendi V1/V2/finish skripte, valuutakogujat ega SQL/apply etappe. Säilita failid, staging ja lõpetatud päevikud.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
