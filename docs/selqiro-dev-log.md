# Selqiro development log

## 2026-10-30 — Tegeliku DB-eelkontrolli raport ja Supabase’i poliitikaõiguse parandus

- Üles laaditud `result.json` kinnitab jätku 599… baasi `cbd475757690db7bd1faf8784cd43359f45d5be9`, kõiki 75 lähteväärtust ning ainult lugemisega DB-eelkontrolli. Ainus väär guard on `storage_policy_authority`; kuus ülejäänut läbisid. DB/Storage/lähtepaigaldus/build/commit/push ei alanud.
- Omaniku rolli `USAGE` ei ole Supabase’i ainus poliikahalduse tee. Registreeritud Supautils `policy_grants` lubab täpsele rollile täpse tabeli poliitikate haldamist. Parandus kontrollib `pg_settings` registreeritud `sighup`/`string` seadet, rolli ja tabeli OID-d; suvaline custom-GUC ei piisa.
- Piirava Storage’i poliitika tegelik DDL, privaatsuse piirid ja tehinguline järelkontroll säilivad. Rolle, tabeliomanikke ega teenuse konfiguratsiooni ei muudeta.
- PostgreSQL 17/18 dubleeriv NOT NULL kataloogiesitus ühtlustatakse, säilitades veeru not-null nõude ja kontrollides PG18 kinnitamist, jõustamist, pärandumise puudumist ning üks-ühele katvust. Muud piirangud jäävad täpselt pinnituks.
- Eraldi uus jätk säilitab ja lukustab mõlemad vanad päevikud. Enne ühtki pilvekirjutust võrreldakse kõiki 11 varasemat invarianti ja kolme puuduvate objektide sõrmejälge. Vana `unknown` seis ei muutu vaikimisi usaldatud baasiks.
- Sihitud SQLi- ja jätkajatestide täpne tõend on uue paketi `review/verification.json`-is. Rakenduse ja sõltuvuste muutmata baite võrreldakse eelmise kandidaadiga, varasemaid UI/build-kontrolle ei esitata uuesti tehtuna.
- Praegune käsk on `selqiro-sonumid-oigused-20261030/uuenda.py --publish`. Selle Maci lõpp, Verceli Ready ja füüsilise telefoni kasutuskinnitus on ootel. Allolevad parandused on varasem ajalugu.


## 2026-10-30 — Sõnumipaketi lähteviite parandus ja kirjutuseelse peatuse jätk

- Kasutaja terminal kinnitab kaardijätku VALMIS ning commit’i `cbd475757690db7bd1faf8784cd43359f45d5be9` edukat push’i. Vana kaardipakett jääb lõpetatuks.
- Algne sõnumipakett `49bb16da858a518d478846868bd26133fd967c018a9818935e5d0c453baec1a5` peatus `SOURCE_GUARD_CHANGED` juures enne DB-d, Storage’it ja lähtefaile. Üldine veateade ei sisaldanud failinime.
- Tarnitud manifestide võrdlus leidis ühe vea 103 kaitse hulgas: cloud-only kontaktiparanduse `changes.sql` oli assistendi snapshotis, kuid selle `source_delta` ei paigaldunud Git-i. Kõik ülejäänud kaitsed ning 75 payload-faili lähtevariandid sobivad tarnitud ahelaga.
- Kohalik koostaja ja räsi kontroll kasutavad nüüd kaardijätkuga paigaldatud `tests/fixtures/accepted-contact-fix.sql` faili. Mõlema faili SHA on `aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b`; valitud deklaratsioon ja koond-SQL ei muutu. Kaitset ei jäeta vahele.
- Eraldi jätkupakk loeb ja lukustab vana sõnumipäeviku, lubab ainult selle täpset kirjutuseelset peatust ning seob uue päeviku vana raporti räsiga. Vana raportit, lukufaili ega varasemaid paigaldajaid ei muudeta ega käivitata. Lähtevea raport lisab nüüd failitee, kontrolli liigi ja räsid.
- Kitsad jätkaja ja tarnitud baasist taastatud Git-regressioonid on paketi review-tõendis. Rakenduskood, sõltuvused ja sõnumite SQL jäävad eelmise kandidaadiga samaks; nende varasemaid katseid ei esitata uuesti tehtutena.
- Praegune käsk on `selqiro-sonumid-jatk-20261030/uuenda.py --publish`. Maci lõpptulemus, uus Verceli Ready ja päris telefoni kasutuskinnitus jäävad ootele.

## 2026-10-30 — V1 sõnumite kasutusloogika V2-s ja telefoni kirjutusriba

- Kasutaja viimased pildid kinnitavad toimivat kuulutusekaarti mõlema osalise vestluses. Varasem kaardipaigalduse peatuse töö on vastu võetud; vana paketti ei korrata.
- Uus kinnitatud teostus: Enter/Shift+Enter arvutis, telefonis kasvav koostaja ja üks saatmisnool, fotod koos kaardi või tekstiga, oma nimi/logo kirjutusriba juures, nähtav partner ja kuulutuse link.
- Sama vestluste ja sõnumite andmestik; pagineeritud ajalugu, nähtud ID järgi lugemata seis, tegevusjärjestus, oma postkastist peitmine ning konto blokeerimine ka V1 otsese INSERT-tee kaudu.
- Saatmine ja foto sidumine kasutavad muutumatuid kinnitusi. Privaatne fotohoidla on eraldi; piiratud koristus säilitab hilinenud kirjutuse tõkestamiseks tombstone-kirjed. Peitmine ei kustuta mõlema osalise sõnumeid ega vabasta fotode eelarvet.
- Tõendatud focus/token/storage identiteedivahetuse race on parandatud; aktiivse identiteedi RPC kasutab algse konto kinnitatud tokenit. Vana konto hiline tulemus ei muuda uue konto saatjat.
- Node 31/31, eraldi identiteedi brauserikatsed 12/12 ning telefoni/lauaarvuti komponentide katsed PASS. SQLi, updatri katkestuste, buildi ja kohaliku skeemi täpsed tõendid on tarne review/verification.json-is. Testides päris sõnumeid ega pilvekirjutusi ei tehtud.
- Üks uus Maci käsk: selqiro-sonumid-20261030/uuenda.py --publish. Selle kandidaadi Maci käivitamine, Verceli Ready ja füüsilise telefoni kasutuskinnitus on veel ootel. Üldine käivitamine ja kuulutuste varasem lõppkoristus ei muutu tehtuks.


## 2026-10-30 — Kuulutusekaardi SQL-paigalduse õigus ja kontrollitud jätk

- Kasutaja terminalipilt kinnitab `DATABASE_OUTCOME_NOT_VERIFIED` peatust enne lähtekoodi, buildi ja commit/push’i. Pilt ei näita `database_after` sisu; seda ei asendata oletusega.
- Täpne algne SQL kordab piiratud postgres-õigustega katses `42501 permission denied for schema public` viga: uuel funktsiooniomanikul puudus ALTER OWNER jaoks CREATE õigus. Varasem superkasutajaga fixture seda ei tuvastanud.
- Parandus kasutab olemasoleva V1 lähtekoodi grant/owner/revoke järjestust ühes tehingus ning kontrollib public-skeemi omaniku ja ACLi täpset säilimist. V2 lugeja sisu, rakenduskood ja sõltuvused on muutmata.
- SQL 40/40 ja jätkaja 30/30 kontrolli PASS; uus tootmisbuild PASS. Vana päevik on ainult loetav ja lukustatud; uus päevik eraldi. Fresh preflight peab säilitama algsed kuus sõrmejälge. Ebaselget katset või hiljem kadunud kinnitatud lugejat ei paigaldata automaatselt uuesti.
- Tarnitav jätk: `selqiro-postkasti-kaart-jatk-20261030/jatka.py --publish`. Maci tulemus, sama commit’i Verceli Ready ja päris uus kaart on veel ootel. Varasem edukas kontakt/tekstsõnum ja kuulutuse 197 avaldamine jäävad vastu võetuks.

## 2026-10-29 — V1 kuulutusekaart V2 vestluses

- Kuulutuse alt avatud vestlus kannab päritolu-ID koostajasse. Enne saatmist on eemaldatav pildi, pealkirja, täpse hinnateksti ja lingiga eelvaade; kinnitatud saatmise järel manus tühjeneb.
- Iga sõnum kuvab enda serveris salvestatud kaarti. Sama osaliste paari teine kuulutus ei sildista vana sõnumit ümber. Vanadele ilma manuseta tekstidele kaarte tagantjärele ei lisata.
- Uus range v2 lugemisleping jätab v1 lugeja ja kontrollitud saatja alles. Konto/identiteedi vahetus, kordussaatmise sama võti ning ajaloo lehitsemine säilivad.
- 23/23 Node kontrolli, 37/37 SQL kontrolli, tootmisbuild ja 16/16 paigaldaja kontrolli PASS. 14/14 sünteetilist brauseri kasutusolukorda PASS; mobiili- ja töölauavaade kontrollitud. Täielik tõendi piir on INBOX_CARDS_20261029.md-s.
- Üks jätkatav Maci uuenduspakk lisab andmebaasi lugeja, lähtefailid, build’i, commit’i ja push’i. Tegelik Maci käivitamine ning Verceli Ready ei ole ettevalmistuse põhjal kinnitatud.

## 2026-10-29 — Vestlus ja sõnum toimivad; V1 postkasti võrdlus

- Kasutaja kell 21:12–21:18 pildid kinnitavad vestluse 38 avanemist, ostja saadetud sõnumit ja selle lugemist müüja V2 postkastis/vestluses. Sama sõnum avaneb V1 vaates. Varasemat kontakti parandajat ei korrata.
- V1 lisas päritolukuulutuse kaardi konkreetsele sõnumile ja puhastas manuse pärast edu. V2 headeris on kuulutuse link, kuid saatmise UI annab listingId:null ning read-RPC/klient ei väljasta sõnumi manust.
- Olemasolev V2 send-RPC toetab juba serveris kontrollitud kuulutusemanust. Soovitatud järgmine teostus ühendab koostaja ja lugemislepingu selle võimekusega, säilitades per-message konteksti ka sama müüja mitme kuulutuse puhul.
- Audit oli lugemine; rakenduse, andmebaasi ega pilve muudatusi ei tehtud. Täpne võrdlus ja piir on INBOX_V1_REVIEW_20261029.md-s; jooksev üleandmine on uuendatud.

## 2026-10-29 — Vestluse RLS-ringi kitsas andmebaasiparandus

- Uus kasutaja pilt kinnitab LC-RPC-UNKNOWN-HTTP500 jõudmist nupu alla; diagnostikatarne kordamist pole vaja. Päris SQLSTATE ei ole veel otse loetud.
- Accepted funktsioonide ja PUBLIC poliitikatega kohalik katse kordab 42P17 business_members rekursiooni kontaktikirjutaja actor/peer/nime lugemises.
- Valmis on eraldi supabase/repairs parandus: privaatsed definer-helperid, avalike RPCde sama piiratud omanik, muutumatud actor-kontrollid/poliitikad/rollid/andmed.
- Täieliku guarded SQLi 35/35 kontrolli ja parandaja 17/17 kontrolli PASS; täpne tõendi piir CONTACT_REPAIR_20261029.md-s. Päris DB eelkontroll ja rakendamine on veel ootel.
- Üks Maci käsk kontrollib live-seisu, teeb ainult tuntud vea korral ühe SQL-tehingu ning loeb tulemuse üle. Git/source/deploy ei muutu. source_delta on säilitatav allikas, mitte Maci või GitHubi sünkroniseerimise tõend.
- Hosted koristuse/reservide sulgemine ja ülejäänud kokkulepitud V2 ulatus jäävad lahti.

## 2026-10-29 — Päris avaldamine vastu võetud; kontaktivea nähtavus

- 27.–28.10 kasutaja tõendid kinnitavad olemasoleva DB/Storage’i ja kolme konto ettevalmistuse, commit’i `8f25f65` push’i ning Production Ready tulemuse. Neid etappe ei korrata.
- Kuulutus 197 „Müüa BMW”, 4376 €, üks pilt on avaldatud. Detail, suur pilt ja omaniku aktiivne rida avanevad. Teise e-postiga sisselogitud Jaani Pood näeb kuulutust ja pilti, kuid kontakti POST tagastab 503. Selle täpset põhjust pole kinnitatud.
- Chrome Response ei saanud veakeha laadida. Senine kontaktitransport katkestas mitte-2xx keha lugemata. Kitsas kandidaat loeb kuni 4096 baiti, säilitab HTTP tulemuse ning kuvab nupu all ainult lubatud etapi/koodi/staatuse/SQLSTATE-PGRST koodi.
- Konto-, origini- ja readiness’i kontroll, RPC argumendid, idempotentsus ja range eduka vastuse parser säilivad. SQL-i, õigusi ega andmeid ei muudeta.
- 12 sihitud Node kontrolli läbisid sünteetiliste vastustega. Lõpliku build’i, brauserikontrolli ja uuendaja kontrolli seis on `docs/continuity/CONTACT_DIAGNOSTICS_20261029.md`-s. See kirje ei kinnita uue kandidaadi Maci paigaldust ega Productioni jõudmist.
- Jooksev seis ja sellest genereeritud üleandmine on ajakohastatud, et järgmine vestlus ei suunaks tagasi lõpetatud paigalduse juurde.

## 2026-10-27 — Jätkaja Giti autentimisabilise parandus

- Kasutaja 12:30 terminalipilt näitab `GIT_ENVIRONMENT_OVERRIDE_PRESENT`; peatumine toimus enne Git-käske, lähtefailide/indexi/päeviku muutmist ja pilve.
- Paketi r2 väline `jatka.py` lubab olemasoleva `GIT_ASKPASS` abilise. Kahe täitmislipu väärtus määratakse nulliks; muud Git-ülekirjutused keelatakse ja võimaliku keeldumise puhul kuvatakse ainult nimed. Pildil tegelikku muutuja nime pole, VS Code’i abiline on põhjendatud oletus.
- Kontrolliti üksnes uut keskkonnakontrolli mälus. Varasemaid Git-/SQL-/rakenduse teste ja buildi ei korratud. Portaali kood, kolme konto paigaldaja, SQL ja sõltuvused on muutmata; selle paranduse Maci edu on veel kinnitamata.

## 2026-10-27 — Olemasoleva portaali jätk ja kolm päris kontot

- 26.10 täielik veebiallikas on kasutaja 27.10 terminalipildi järgi eraldi `~/selqiro-veeb-20261026` tööpuus staged; commit/push ja uus deployment on veel tegemata.
- Kasutaja katkestas ühe konto paigaldaja enne e-posti sisestamist. 11:54 kuvatõmmis kinnitab `INTERRUPTED`; selle jooksu DB/Storage toimingud ei alanud. Varasemat tööpuu ettevalmistust ei korrata.
- Järgmine lähteparandus võimaldab uut avaldamis- ja kontaktivoogu Taivo kolmel olemasoleval kontol. See on funktsiooni ajutine kasutuselevõtu piirang; e-posti valik terminalis ei asenda brauseri parooliga sisselogimist.
- Parandus tuleb samasse olemasolevasse portaali/andmebaasi ja ettevalmistatud tööpuusse. Uut testportaali, pilvebaasi ega konto loomist pole vaja.
- `AI_BOOT` suunab nüüd ühele jooksvale seisukirjele; praegune sprint ja see päevik on ajakohastatud. Vana LocationCardi eraldamise NEXT oli aegunud: komponent ja hook on olemas.
- 26.10 rakenduse build'i, sihitud Node/SQL ja native kontrollide varasemad tõendid säilivad. Käesoleva paranduse 8 Python-, 4 Git- ja 5 aktiveerimismalli SQL-juhtumit läbisid; täpsed tõendipiirid on jätkupakis. SQL-kontroll kasutas PostgreSQL17.5 WASM-i sünteetiliste andmetega. Uut rakenduse build'i ega päris pilvekatset ei tehtud.
- Järgmine nähtav tulemus on pildiga kuulutus päris veebis ning eri kontode müüja/ostja kontakt. Hosted lõppkoristus ja ruumireservide vabastamine on endiselt lõpetamata.
- Energy ja maksete tuum ning piiratud AI abi jäävad kokkulepitud V2 käivitamise ulatusse; praegune kuulutuste etapp ei muuda neid automaatselt käivitamisjärgseteks lisadeks.


## 2026-06-26

### Premium / identity admin
- Added admin identities overview.
- Added admin identity detail page.
- Fixed dynamic route `/admin/identities/[identityId]`.
- Admin can set identity plan: `free`, `premium`, `business`.
- Plan is stored in `identity_profiles.plan`.
- Confirmed admin detail refresh keeps `premium`.

### My Page refactor
- `app/my-page/page.tsx` is currently very large, about 2559 lines.
- Decision: refactor My Page into smaller modules and components.
- First component: `app/my-page/components/MembershipCard.tsx`.
- Goal: make future maintenance easier and reduce risk when editing.

### Architecture decision
- Prefer smaller components and hooks.
- Avoid very large files.
- Future structure should move logic into hooks and UI into components.

### Engineering principles
- Adopted Selqiro official development style.
- Added ChatGPT-friendly architecture principle.
- Added development planning rule.
- Added 10-year architecture principle.
- Future development should prioritize modularity, maintainability, clear responsibilities, and easy debugging.
