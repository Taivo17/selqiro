<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-13

## Praegune checkpoint

WEB-pildi 14 testitud faili on paigaldatud, 21:57 uus Maci build läbis ning täpne25-rajaline staging on üle vaadatud. Sama lähteetapi eraldi lõpetaja säilitab koodi ja tõendiinventuurid, täpsustab10 dokumenti ning kontrollib enne ühte commit/push-i tegelikku Git/remote-seisu. See ette kirjutatud leht EI kinnita lõpetaja käiku; tegelik tulemus loe private-web-image-source-finish ZIP-ist. Upload/avaldamine jääb suletuks.

## Lähtekood ja tõendi piir

- **Lähtebaas:** 33b485b717591e01d0a67751c8aff42662f3e44a, parent b3264d136871bb5126b418cc78662cfd29f9f3d5. Selle baasi varasem Ready/Production-ekraanipilt on vastu võetud; seda uuesti ei küsita.
- **Lähtepakett:** 534 täpset paigalduse järgset STAGING’U allikat; mitte täisrepo ega uus commit.14 testitud faili ja11 dokumendirada =25 rada (16 uut,9 varasemat muudatust). Lõpetaja muudab neist ainult10 dokumenti; nõuded/inventuurid,509 muud baasfaili ja23 migratsiooni säilivad.
- **Viimane Maci vaatlus:** 13.10.2026 21:57:58.255424 Tallinn: main/33b485b,25 staged rada,no unstaged extras,tööpuu EI OLE puhas; index de9816b8f8e6030fc535a2996fde8f7c0f46f7d108b5490071348abe3104a098. Kaug-main vastas samale baasile21:57:56.899940. See ei ole värske tulevase käigu vaatlus.

## Tegelik kohalik katse

- 13.10 21:10:85/85 uut ühendus/HTTP testi ja rangeTS, Node24.16.0/TS5.9.3/Sharp0.34.5/libvips8.17.3. Neli päris worker’i katset nende sees; kohalik HTTP sünteetilise Auth/REST/Storage mudeliga, mitte pilv.
- Sama käigu PG17.6 eemaldatud abis108 rollback +24 kontrolli/8 ajastust +8 isolatsioonikeeldumist=140PASS;7 tegeliku lukuootamise kokkuvõtet,1 sõltumatu konto. Ajutised rolligrandid ei ole productioni õigused; WEB intent/ready koristuskaitse läbis.
- 13.10 21:57:49–21:57:54 uus paigaldusbuild exit0, Node24.16.0/npm11.13.0/Next16.2.1/TS5.9.3 ja Sharp0.34.5 metadata. Toorstdout privaatne/lugemata. Lõpetaja ei korda build’i, native’i ega85/140/117/108/195/109/119sarju; teeb ainult muudetud jooksva üleandmise --check.

## Production / kasutajaliides

- 33b485b Ready/Production on varasem18:20 kasutaja ekraanitõend, mitte native/Storage vastuvõtt. Seda enam ei küsita. Tulevane push võib käivitada olemasoleva automaatika; uue commit’i juurutuse olekut lõpetaja ei kontrolli.
- SQL jääb labs-kausta/API-rollidele suletuks. Vorm/marsruudid/bucket/õigused/upload/publish/koristus/lõppkustutus ei aktiveeru. WEB-pilt jääb privaatseks; valmiduskviitung ei ole avaldatud kuulutus.

## Üks järgmine töö

Loe uus private-web-image-source-finish result.json,commit-proof.json,committed.patch,allikaräsid ning Git/remote-tõendid. Ainult tegelik edukas käik kinnitab commit/push/clean-seisu. STOP-il säilita osaline seis. Pärast selle sama25-rajalise lähteetapi ülevaatust jätka otse lõppavaldamise/püsiva piiratud koristuse/lõppkustutuse ja tervikteekonna ühendusega; mitte uus docs-onlyring.

**Peatumisel:** Säilita failid/index/raport/päevikud. Ära korda WEB-teste/lähtepaigaldajat/lõpetajat, varasemaid upload/attempt/image paigaldajaid/lõpetajaid/teste/Storage-lugejat/SQL-käike. Ei reset/restore’i, käsitsi SQL-i/commit/push-i ega päevikute kustutamist. Uus käsk alles tegeliku STOP-tõendi ülevaatuse järel.

## Loe ainult vajalikku

- Uus private-web-image-source-finish result.json,commit-proof.json,committed.patch,source-manifest.json,git-guards.json ja remote-observations.json. evidence/reviewed-source-install.zip on muutmata21:57paigalduse/build’i tõend koos algse85/140testi ZIP-iga.
- docs/architecture/v2-private-publication-web-v1.md; docs/verification/v2-private-web-image-tests-20261013.json; docs/architecture/v2-publication-requirements-approved-20261012.md.
- src/server/listing-publication/web/ ning supabase/labs/listing-publication-web-v1/. Olemasolev images/attempts/uploads jääb aluseks; README ajaloolisi käivitusi ei korrata.

## Säilivad piirid

- Üks Avalda kuulutus. Ready-kviitung ei ole avaldatud kuulutus ega teenusevõtme kõigi valdajate piirang. Kanooniline kirjutaja ei kirjuta üle; lubatud privilegeeritud kirjutajate piir on enne avamist vajalik.
- WEB intent/ready korral koristus blocked_write_settlement; source’i varasem piir säilib.404/timeout/expiry/ready ei tõenda kirjutuse lõppu ega vabasta mahukvooti. Vajalikud päris Storage/maht/CORS/hiline kirjutus, native-pilv ja püsiv koristus/lõppkustutus.
- Konto/identiteedi eemaldamine ja sõnumite säilimine peavad sobima. Terve lisamine→leidmine→detail/profiil→suhtlus→haldamine→kustutamine eraldi müüja/ostja/anonüümse seanssidega; vajalik kitsasV1 kaitse, mitte täisV1 ümberehitus.
- Energy/maksed/AI/otsingu lisad ootavad; üldmootorit ei ehitata. Olemasolevate kontode/kuulutuste/piltide/päevikute kustutamisluba puudub.

## Keskkond

- Lõpetaja: Python3.9+ ja olemasolevGit; peata dev ning ära muuda projekti/indexit/seadistusi. Kinnitus COMMIT PUSH; tühi katkestab enne võrku/kirjutusi. Node/npm/build/Docker/SQL/Supabase CLI puuduvad.
- Enne kirjutusi värsked main/HEAD/parent/terveindex/tööpuu/534allika/23migratsiooni/approved origin/main kaitsed. Algne paigaldus-ZIP on käivitis; uus ühekorrapäevik, vanu ei avata. STOP-il pole kordust ega reset/restore’i.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
