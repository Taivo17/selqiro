## 16.10.2026 — sama kirjutusekontrolli lähteetapi lõpetamine

**Paigaldus ja uus build on Macis tehtud ning üle vaadatud. Järgneb sama 20-rajalise
muudatuse piiratud lõpetaja. See ette kirjutatud dokument EI kinnita lõpetaja
commit'i, push'i ega uue juurutuse õnnestumist; loe UUE käigu tegelikku result.json-i.**

- Alus ea212d300f915a6f48e427336f4a695a1ea2bfea / main, parent b05c98d.
  Viimane täielik kohalik kaitse 15.10.2026 13:10:23.597051 Tallinn: täpselt 20 staged,
  staging'uväliseid muudatusi pole; 583 valitud allikat ja 23 migratsiooni. Tööpuu pole puhas.
  Kaug-main 13:10:22.151516 oli sama baas. Need on salvestatud, mitte uued live-vaatlused.
- Algne paigaldustõend: write-reconcile-source-install-20261015-131004-ytuhtxnt.zip,
  7 292 455 baiti; SHA256 3516184fff15f2072e41a27a2160fab866ab536d7f648ab28f8bb93cda54517a.
  Kõik kümme testitud faili on muutmata paigaldatud; 20 rada = 12 uut + kaheksa dokumenti.
- Päris build 15.10 13:10:14.925310–13:10:19.415527 Tallinn: exit 0. Varasemad
  Node24.16.0/npm11.13.0/Next16.2.1/TypeScript5.9.3/Sharp0.34.5 vaatlused säilivad.
  Build'i stdout 1560 baiti jäi privaatseks; selle sisu ega hoiatuste puudumist siin ei väideta.
- Muutmata Maci 48 Node/HTTP + 83 SQL tõend: ES2017/strict, PG17.6 64 rollback,
  15 kontrolli viies ajastuses ja neli isolatsioonikeeldumist. Neli lukuootamist;
  viies on sama konto teine fail. 31 SQL-exit0, kaks fixture-NOTICE'it; enda abi eemaldati.
  HTTP/baidid olid kohalikud, RPC/Storage sünteetilised; native puudus. Kaks loogilist
  piirnäidet kuuluvad 48 sisse, mitte päris Storage'i katsed. Neid ega vanu sarju ei korrata.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus; värsked tegelikud main/HEAD/parent/
koguindex/tööpuu/583 allika/23 migratsiooni ning lubatud origin/main'i kaitsed enne kirjutusi.
Täpsustatakse ainult üheksat juba samasse 20-rajalisse muudatusse kuuluvat dokumenti.
Kõik kümme testitud faili, nõuded, inventuurid ning töötavad moodulid säilivad bait-baidilt.
Jooksva üleandmise kontroll, kontrollitud eraldi commit-index, üks commit ja kuni üks
mitte-force main-push. Uus ühekordne päevik; vanu päevikuid ei avata. Osalisi muutusi ei taastata.

**Pärast käiku:** loe UUE write-reconcile-source-finish tulemus, commit-proof,
remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean järel jätka
otse sama V2 väljastatud SOURCE-loa lõplikkuse, püsiva koristuse ja terve kasutajatee
ühendamist. Eraldi dokumentide lõpetamise ringi ei lisata. STOP-il säilita failid/index/
päevik; ära korda ega tee käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Ainult suletud katse allkirjastuseni mittejõudnud SOURCE-reservatsioon või ühe WEB-kirjutuse
täpse põhikataloogiversiooni ja kogu faili baitide tingimuslik tõend võib saada koristusloa.
Väljastatud/allkirjastamisel SOURCE ja piisava tõendita WEB jäävad blokeerituks.
Täielik failikustutus EI OLE valmis. Tegelik Storage'i järjekord/skeem/versioon,
ainukirjutaja, peidetud POST-korduste puudumine ja failiversioonide kustutamise leping
vajavad vastuvõttu; labori sünteetiline tabel ei loo neid garantiisid teenusesse.
Storage/HTTP/CORS/mahud/mobiil/native-pilv, konto-identiteedi-sõnumite kooskõla,
vormid/marsruudid ja müüja–ostja–anonüümse lisamine→leidmine→detail/profiil→suhtlus→
haldamine→kustutamine vajavad endiselt kontrolli. Energy/maksed/AI/otsingu lisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
ea212d3 Ready46s/Production on vastu võetud baasitõend; seda uuesti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika, kuid lõpetaja uut juurutusolekut ei kinnita.

---

## 2026-10-15 — piiratud kirjutusekontrolli testitõend ja uus lähtepaigaldus

Praegune commit’itud baas on `ea212d300f915a6f48e427336f4a695a1ea2bfea`.
Selle WEB-kirjutuse 20-rajaline lähteetapp on lõpetatud; Ready46s/Production-ekraanipilt
on vastu võetud. Allolevad vanemad „järgmised tööd” on ajalugu.

Piiratud kirjutusekontrolli Maci tulemus: 48/48 uut Node/HTTP-testi ja ES2017/strict,
83/83 PG17.6 SQL-kontrolli (64 rollback + 15 viies ajastuses + neli isolatsioonikeeldumist).
Neli ajastust nõudsid lukuootamist; viies oli sama konto teine fail. Kaks oodatud
fixture-NOTICE’it, abi eemaldatud. RPC/Storage olid sünteetilised; kaks loogilist
piirnäidet pole teenuses tehtud katsed. Muutmata tõendi inventuur:
`docs/verification/v2-write-reconcile-tests-20261014.json`.

Uus SOURCE-paigaldaja säilitab kõik kümme testitud faili ja lisab kümme dokumenti:
20 rada (12 uut, kaheksa dokumendimuudatust), oodatud lähtevalik 583. **Uue paigalduse,
build’i ja staging’u tulemus on VEEL VAATLEMATA; selle tõend tuleb uuest result.json-ist.**
Paigaldaja teeb värsked Git/index/tööpuu/allika/migratsiooni/remote’i kaitsed, ühe build’i
ning ainult PASS-i järel täpse staging’u. Teste ega SQL-i ei korrata; commit/push’i pole.

Kümne faili leping: `docs/architecture/v2-private-write-reconcile-v1.md`.
Allkirjastuseni mittejõudnud suletud SOURCE-reservatsioon või suletud WEB-objekti täpne
põhikataloogiversioon + kontrollitud kogu faili baidid võivad laborikoostises saada eraldi
koristustõendi. See ei võltsi POST-ACK-i, pildi valmidust ega avaldamist. Väljastatud või
allkirjastamisel SOURCE ja tõendita WEB jäävad blokeerituks; täielik failikustutus pole valmis.
Päris teenuse järjekord/skeem/versioon/ainukirjutaja/peidetud korduste puudumine/versioonikustutus,
Storage/CORS/mahud/mobiil/native, konto/identiteet/sõnumid ja kogu kasutajatee jäävad avamise piiriks.

Üleslaadimine/avaldamine on suletud; SQL labs-only/API-closed. Vajalik uus nelja Storage’i
veeru lugemisõigus on ainult laborikoostises, mitte siinse lähtepaigaldusega productionis.
Pärast uue paigaldustulemuse vastuvõttu lõpeta SAMA lähteetapp kaitstud commit/push-käiguga,
siis jätka sisulist V2 ühendust. Ei lisata eraldi docs-only ringi. Kontod, kuulutused,
pildid ja vanad operatsioonipäevikud säilivad; lõpetatud skripte ei korrata.

---

## 14.10.2026 — WEB-kirjutuse sama lähteetapi lõpetamine

**Paigaldus ja build on Macis tehtud ning üle vaadatud; järgneb sama20-rajalise
muudatuse piiratud lõpetaja. See ette kirjutatud dokument EI kinnita veel lõpetaja
commit'i, push'i ega uut juurutust. Tegelik tulemus tuleb uue käigu result.json-ist.**

- Alus b05c98dca11e008e99114e85679e024403fa49e2 / main, parent9f3961d.
  Viimane täielik kohalik vaatlus 14.10.2026 19:25:47.667030 Tallinn:20staged,
  staging'uväliste muudatusteta,571valitud allikat/23migratsiooni. Tööpuu pole puhas.
  Viimane kaug-main'i vaatlus 19:25:46.179744 oli sama baasil. Need pole uued live-vaatlused.
- Algne paigaldustõend: web-write-completion-source-install-20261014-192528-aje23uvf.zip,
  7164099baiti, SHA-256 13eadffadbeb40065ae36aea1127b38acdaf7b4a493c10acc57f6dc6a58acc70.
  Kõik11testitud faili paigaldati muutmata;20rada=11uut+9muudetud.
- Päris build19:25:38.809509–19:25:43.339623 Tallinn exit0. Node24.16.0/npm11.13.0/
  Next16.2.1/TypeScript5.9.3/Sharp0.34.5 on selle varasema paigalduskäigu tõend.
  Build'i stdout1560b jäi privaatseks; selle sisu ega hoiatuste puudumist siin ei väideta.
- Varasem34Node/HTTP+58SQL tõend säilib.34=31uut+3mudeliühilduvust, mitte vana85sarja
  uusvastuvõtt. Päris kohalikHTTP, sünteetilisedAuth/REST/Storage/sanitizer;native puudus.
  PG17.6:44rollback+12neljasajastuses+2isolatsioon,24SQLexit0 ja2NOTICE ettevalmistuses.
  Neid ega muid vanu sarju või build'i lõpetajas ei korrata.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus, värsked tegelikud main/HEAD/parent/
koguindex/tööpuu/571allika/23migratsiooni ja kinnitatudoriginmain kaitsed enne kirjutusi.
Täpsustatakse ainult8samasse20radalisse muudatusse kuuluvat dokumenti; kõik11testitud
faili, nõuded ja tõendiinventuurid jäävad muutmata. Jooksva üleandmise kontroll,
kontrollitud eraldi indexi koopia, üks täpne commit ja kuni üks mitte-force main-push.
Uus eraldi ühekordne päevik; vanu päevikuid ei avata. Osalisi muutusi ei taastata.

**Järgmine tegevus pärast käiku:** loe UUE web-write-completion-source-finish tulemus,
commit-proof, remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean
järel jätka otse sama V2 SOURCE/teadmataWEB välise kirjutuse lõplikkust, püsivat koristust
ja tervet kasutajateed. Uut eraldi dokumentide lõpetamise ringi ei tehta.
STOP-il säilita failid/index/päevik; ära korda ega tee käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Kinnitatud üheWEBkirjutuse koristuskviitung ei ole täielik failikustutus. Kõik väljastatud
SOURCE ja teadmataWEB jäävad blokeerituks. Ainukirjutaja/no-proxy-retry/tegelikuStorage
vastuseleping, Storage/CORS/mahud/mobiil/native-pilv, konto-identiteedi-sõnumite kooskõla,
vorm/marsruudid ja müüja–ostja–anonüümse lisamine→leidmine→detail/profiil→suhtlus→haldamine→
kustutamine vajavad tegelikku vastuvõttu. Energy/maksed/AI/otsingulisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
Varasem b05c98d Ready/Production on baasi tõend; seda uuesti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika, kuid lõpetaja uut juurutusolekut ei kinnita.

---

# V2 single WEB-write completion — dormant source contract

2026-10-14. Base `b05c98dca11e008e99114e85679e024403fa49e2`. The 34/58 result is accepted; the SAME
11 candidate files are retained byte-for-byte. The source installer and its real
project build are NOT_YET_OBSERVED here. No SQL, route, grant, bucket or UI activation.

## Purpose and bounds

Only the one DB-authorized server WEB POST can record its fully received HTTP200
Id/Key acknowledgement. The receipt binds actor/identity, attempt/slot/job/claim,
WEB object, provider object ID, exact key, sent hash and sent bytes. It is immutable.
Image readiness is separate; a replay/readback/expiry/404/timeout is not write completion.
The receipt may arrive after cancellation or context change but cannot republish,
reopen or revive content. It releases only its own blocked WEB cleanup state.
Active and published media remain ineligible; deleted cleanup rows are not requeued.
Existing cleanupOne.ts, lease/backoff and exact-file lineage remain unchanged.

All issued SOURCE grants and unacknowledged WEB writes remain blocked. Ordinary
listing content deletion therefore does NOT yet mean full terminal file deletion.
The trusted server's receipt is not a provider-signed cryptographic attestation.
Exclusive writers, no intermediary replay and deployed-provider terminal-response
semantics must be verified before activation. Upstream references retained in the
original lab README are historical research, NOT a new deployed-version observation.

## Evidence and preservation

`docs/verification/v2-web-write-completion-tests-20261014.json` binds the original 2,248,152-byte result ZIP,
SHA256 256f35709fb725433f5d6a8ebcab02c121bba6502f0ec971eac6bdfd2f865257.
34/34 actual Mac tests:31completion+3compatibility-model cases; no replay of the old85
WEB suite. ES2017 strict, Node24.16.0/TS5.9.3; real loopbackHTTP with synthetic services
and sanitizer, no native invocation. PG17.6:44rollback+12race+2isolation=58.
Three observed lock waits and one independent-account schedule.24SQL exits0,
two fixture NOTICEs. Own helper removed. This is not real Storage deletion acceptance.

Only verifyPrivateWebImage.ts and listing-publication-web.test.cjs replace existing
files. Nine candidate paths are new. The old WEB test fixture was adapted; its85
original bodies were not rerun. The new build cannot be labeled a replacement for them.
The original lab README/test plan and all11tested bytes stay unchanged. Its historical
NOT_RUN refers to preparation; the accepted test result is recorded separately here.

## Source-only installation

11tested files plus9docs =20paths(11new/9changed);571selected sources, not the fullrepo.
Seven existing docs are amended; this contract and the evidence inventory are new.
All551other base sources, requirements, package/lock/ES2017config and23migrations remain.
Existing modified files(2code/test+7docs) are backed up outside the repo before writes.
Fresh fullGit/index/worktree/source/migration/approvedHTTPSremote guards precede writes.
One current build then exact20staging only on success. No tests/SQL/install/commit/push.
Actual install/build/state comes ONLY from the future result.json; not preclaimed.
A STOP preserves files/index/journals. No retry/reset/restore or manual commit/push.

## Continuation and launch gate

After review finish this SAME source checkpoint, then continue required SOURCE and
unknown-WEB finality/cleanup integration; no separate documentation-only cycle.
Upload/publication remains disabled, SQL labs-only/API-closed. RealStorage/CORS/mobile/
volumes/latewrites/nativecloud, account/identity/message consistency, form/routes and
seller/buyer/anonymous addition→discovery→detail/profile→messages→management→deletion
remain launch gates. Account RESTRICT refusal is not a complete account-erasure flow.
No deletion of existing accounts, listings, images or operation journals is authorized.
Energy/payments/AI/search extras wait; no generic engine or fullV1compatibility layer.
