# Selqiro development log

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
