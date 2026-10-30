# Olemasoleva Selqiro portaali jätkamine

## 30.10.2026 — sõnumiuuenduse tegeliku eelkontrolli jätk

Kuulutuse 197 avaldamine, vestlus 38, ostja/müüja tekst ning kuulutusekaart on
kasutaja tõenditega vastu võetud. Kaardijätku commit
`cbd475757690db7bd1faf8784cd43359f45d5be9` ja edukas push jäävad lõpetatuks.

Kasutaja üles laaditud `result.json` kinnitab sõnumijätku 599… lähtekontrollide
läbimist samal main-baascommit’il. Ainult lugemiseks tehtud DB-eelkontroll peatus
`DATABASE_PRECONDITIONS_NOT_MATCHED` juures: kuus guard’i läbisid, ainult
`storage_policy_authority` oli väär. Hoidla loomine, andmebaasi paigaldus,
lähtefailide kopeerimine, build, commit ja push ei alanud.

Põhjus on paigaldaja omanikupõhine õiguse-eeldus. Supabase toetab eraldi
registreeritud `supautils.policy_grants` luba poliitika haldamiseks. Parandus
kontrollib selle täpset rolli ja tabelit; päris poliitika loomine ja tehingu
järelkontroll säilivad. Teenuse rolle, omanikke ega konfiguratsiooni ei muudeta.

Järgmine pakk on `selqiro-sonumid-oigused-20261030/uuenda.py --publish`.
See lukustab mõlemad muutmata vanad sõnumipäevikud ning võrdleb enne kirjutusi
kõiki 11 varasemast raportist pärit DB-invarianti. Jooksev üleandmine on
`CURRENT_STATE.json`-is ja `MESSAGING_RESTORE_20261030.md`-s. Selle uue jätku
Maci lõpp ja Verceli Ready on veel ootel. Allolev ajalugu ei ole kordamiskäsk.

## 27.10 ettevalmistuse ajalugu ja sihtandmed

Seis: 27.10.2026 Europe/Tallinn. Jätkame sama Selqiro portaali, GitHubi hoidla ja
Supabase’i andmebaasiga. Taivol on kolm olemasolevat portaali kontot; uus voog
avatakse neile müüja/ostja kasutustee proovimiseks. Brauseri tavapärane e-posti ja
parooliga sisselogimine säilib.

**26.10 paketi allikad on Macis juba ette valmistatud ja staged. Ühe konto
paigaldaja katkestati enne e-posti sisestamist. Kolme konto jätku rakendamine,
andmebaasi/Storage’i aktiveerimine, commit/push ja uus Verceli deployment on
veel kinnitamata.**

27.10 kell 11:54 kuvatõmmis näitab `PEATATUD: INTERRUPTED` ja tagasitulnud
terminaliviipa. Läbivaadatud skript teeb esimese kaugpäringu pärast e-posti
sisestamist, seega see katkestatud käik pilvetoiminguteni ei jõudnud. Päevik ja
juba ettevalmistatud tööpuu jäävad alles.

## Kindel siht

| Seade | Valitud väärtus |
| --- | --- |
| Portaal | `https://selqiro.vercel.app` |
| Supabase’i projekt | `vyjletlmwoiwxsnsunlm` / Selqiro |
| Regioon | `eu-central-1` |
| Paigalduse UUID | `2d088814-0900-448a-a9d1-7b05470cb1d2` |
| GitHub | `https://github.com/Taivo17/selqiro.git` |
| Senine main | `/Users/taivo/selqiro` |
| Säiliv kohalik kandidaat | `/Users/taivo/selqiro-v2-integratsioon-20261018` |
| Juba loodud veebi töökaust | `/Users/taivo/selqiro-veeb-20261026` |
| Selle töökausta haru | `work/portal-20261026` |

UUID jääb sama paigalduse järgnevates deployment’ides samaks. Sisemine release’i
nimi on endiselt `listing-publication-hosted-preview-v1`; siht on sellest nimest
sõltumata olemasolev päris portaal. Põhi-release jääb muutmata, SHA-256:
`974dd6acb246b275acb593688aa14449cd42e80939101086d742ee5c4c5a4c3e`.
Kolme konto parandus puudutab eraldi aktiveerimismalli ja paigaldusloogikat.

27.10 kell 12:30 peatus esimene jätkaja veaga `GIT_ENVIRONMENT_OVERRIDE_PRESENT` enne kirjutusi. r2 lubab olemasoleva Giti autentimisabilise ja säilitab tegelike sihtkoha-/konfiguratsioonimuudatuste kontrolli. Jätkame alloleva parandatud paketiga.

## 1. Üks jätkamiskäsk olemasolevas töökaustas

Paki `selqiro-portaali-jatk-20261027-r2.zip` Downloads-kaustas lahti samanimeliseks
kaustaks ja käivita:

```bash
python3 "$HOME/Downloads/selqiro-portaali-jatk-20261027-r2/jatka.py"
```

See jätk kontrollib juba ettevalmistatud tööpuu tegelikku lähte- ja Git-seisu,
paigaldab täpsed selle sammu muudatused ning jätkab parandatud
`apply_portal_release.py` kaudu. Uut töökausta ega testbaasi ei tehta. Algne
`prepare_portal_worktree.py` on juba lõpetatud ja seda ei käivitata uuesti.
Kohalik arenduskeskkond ning varasemad kasutajaandmed säilivad.

Terminal küsib ükshaaval **kolme erineva olemasoleva Selqiro konto e-posti**.
Sisesta iga aadress eraldi küsimuse vastuseks. See valib kontod funktsiooni
ajutiseks lubamiseks; see ei logi sind brauseris sisse, ei loo uut kontot ega
muuda parooli. Kõik kolm kontot ja nende aktiivsed identiteedid kontrollitakse
enne pilvekirjutusi. E-posti aadresse ega paroole pole vaja vestlusse saata.

Pärast kolme aadressi sisestamist jätkab skript olemasoleva projekti tegeliku
seadistamisega: puuduv lisav SQL-release, privaatne pildikogu ning kõigi kolme
valitud konto lubamine. Kontode lubamine toimub ühes tehingus. Teistsugust
paigaldust, pildikogu seadeid ega kõrvalisi lubatud kontosid ei kirjutata üle.
Juba tehtud pilve-etappide tulemust kontrollitakse tegelikust teenusest.

Pildikogu on privaatne, ühe objekti piir 25 MiB ja MIME-tüübid täpselt
`application/octet-stream` ning `image/webp`. Olemasolev pinnitud Supabase CLI
2.117.0 ja senine autentimine säilivad. Serverivõti loetakse võimalusel olemasoleva
ühenduse kaudu mällu; kui CLI legacy võtit ei anna, küsitakse seda terminalis
peidetult. Võtmeid vestlusse ei kopeerita.

Edukas lõpptulemus kinnitab DB/Storage’i ja kolme konto valmisolekut. Skript ei
avalda kuulutust, ei tee Git push’i ega juuruta Vercelisse. Järgmised sammud
viivad sama lähtekoodi veebirakendusse.

Pilve-ettevalmistuse raport jääb samasse asukohta:

`~/Library/Application Support/Selqiro/hosted-publication/2d088814-0900-448a-a9d1-7b05470cb1d2/prepare-report.json`

Ka lähtekoodi jätk kuvab oma tulemuse asukoha. Raportitesse ei lisata paroole,
võtmeid ega e-posti aadresse. Peatumise korral säilita failid ja päevik ning
saada lühike terminalitulemus. Vanu käske ega SQL-i käsitsi ei korrata.

## 2. Verceli Production-seadistus

Ava Vercelis olemasoleva **selqiro** projekti keskkonnamuutujate vaade. Järgmised
väärtused peavad olema seotud **Production** keskkonnaga enne järgnevat push’i.
Juba õigesti seadistatud võtmeid pole vaja vahetada.

| Muutuja | Väärtus | Tüüp |
| --- | --- | --- |
| `SELQIRO_V2_HOSTED_PORTAL` | `v1` | Config |
| `NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL` | `v1` | Config |
| `SELQIRO_V2_HOSTED_PROJECT_REF` | `vyjletlmwoiwxsnsunlm` | Config |
| `SELQIRO_V2_HOSTED_INSTANCE_ID` | `2d088814-0900-448a-a9d1-7b05470cb1d2` | Config |
| `SELQIRO_V2_HOSTED_REGION` | `eu-central-1` | Config |
| `SELQIRO_V2_APP_ORIGIN` | `https://selqiro.vercel.app` | Config |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vyjletlmwoiwxsnsunlm.supabase.co` | Config |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sama projekti kehtiv legacy `anon` JWT | Avalik kliendivõti, Config |
| `SUPABASE_SERVICE_ROLE_KEY` | Sama projekti kehtiv legacy `service_role` JWT | Secret, ainult serveris |
| `SELQIRO_V2_S3_ACCESS_KEY_ID` | Sama projekti serveri S3 access key ID | Secret, ainult serveris |
| `SELQIRO_V2_S3_SECRET_ACCESS_KEY` | Eelmisega paaris olev S3 secret access key | Secret, ainult serveris |

S3-võtmepaar pärineb Supabase’i sama projekti Storage’i S3-seadetest. Kui
serveri S3-võtmepaari veel ei ole, loo seal üks selle portaali jaoks ja sisesta
mõlemad väärtused otse Vercelisse. Need ei ole kohaliku arenduse S3-võtmed ega
brauserile antavad üleslaadimisvõtmed. `sb_publishable_...` ja `sb_secret_...`
ei asenda selle v1-adapteri legacy JWT-võtmeid.

Production-keskkonnas peavad **puuduma** järgmised neli muutujat:

```text
SELQIRO_V2_HOSTED_PREVIEW
NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW
SELQIRO_V2_LOCAL_INTEGRATION
NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION
```

Ka tühi defineeritud väärtus loetakse segatud seadistuseks. Muude keskkondade
väärtusi pole vaja eemaldada. Senised muud serveriseaded, sealhulgas
`OPENAI_API_KEY`, säilivad. Verceli enda `VERCEL`, `VERCEL_ENV`, `VERCEL_URL` ja
`NODE_ENV` väärtusi käsitsi ei võltsita.

Seaded jõuavad rakendusse uue deployment’iga; `NEXT_PUBLIC_...` väärtused
seotakse build’i ajal. Käesolev production-haru töötab püsival portaaliaadressil,
mitte juhuslikul `selqiro-<deployment>.vercel.app` aadressil. Preview eraldi
haru käitumine jääb seniseks.

## 3. GitHub ja uus veebiversioon

Kui 1. samm lõppes edukalt ning 2. sammu Production-väärtused on salvestatud,
vaata ettevalmistatud muudatuste kokkuvõtet:

```bash
cd "$HOME/selqiro-veeb-20261026"
git diff --cached --stat
```

Commit ja push kasutavad senist GitHubi ühendust. Järgnev käsk eeldab, et
senine `~/selqiro` peapuu on endiselt puhas haru `main`; esimene ettevalmistus
kontrollis seda. Kui oled vahepeal selles kaustas tööd teinud, säilitame selle
enne ühendamist. Tavapärase jätku käsud:

```bash
cd "$HOME/selqiro-veeb-20261026" &&
git commit -m "Connect controlled listing publication to the existing Selqiro portal" &&
git -C "$HOME/selqiro" merge --ff-only work/portal-20261026 &&
git -C "$HOME/selqiro" push origin main
```

Kasutatakse tavalist fast-forward ühendamist ja tavalist push’i. Kui harud on
vahepeal lahknenud, annab Git vea ja töö jääb alles; force-push’i ei kasutata.
Vercelis oota selle uue commit’i **Ready / Production** tulemust. Varasem
`e95fa9c` Ready ei kinnita selle uue versiooni kasutuselevõttu.

## 4. Üks päris pildiga kuulutus ja teise konto kontakt

Ava `https://selqiro.vercel.app/v2/sell` ja logi sisse ühe valitud **päris portaali
kontoga ning selle tavapärase parooliga**. Kohalikud proovikontod ei kandu
Supabase’i automaatselt üle. Uue koodi korral viib ka portaali kuulutuse lisamise
link samasse voogu; „Minu kuulutused” viib `/v2/my-area` vaatesse.

Vali aktiivne identiteet, täida tavakuulutuse andmed, lisa esialgu üks pilt ja
avalda. Ava kuulutus, pilt/galerii ning „Minu kuulutused”. Seejärel leia sama
kuulutus portaali avalehe kaudu. Avaldamine täidab ka senise portaali loetavad
kuulutuse- ja pildiread; vana lugeja saab pildi `/api/v2/listing-media/...` teelt.
Selle päris koostöö tulemus tuleb kasutuskäiguga kinnitada.

Logi teise valitud kontoga sisse ja ava kuulutuse V2 detail. Proovi müüjale
kirjutamist ning müüja kontoga vastamist. Kolmanda kontoga saab kontrollida
teise kasutaja vaadet ja õigusi. Vanade ja uute detaili-/sõnumivaadete täielikku
koostööd ei käsitleta enne tegelikku proovimist valmis olevana.

Järgmine sisuline kontroll on see veebikasutus. Varasemat kohalikku vastuvõttu,
kogu testikomplekti ega teenusemetadata kogumist ei korrata. Konkreetses voos
ilmnenud tõrge parandatakse selle põhjuse järgi.

## 5. Teadaolev allesjäänud töö

Hosted failide lõppkoristus ja nende reservi vabastamine on endiselt ootel.
Seetõttu võib ka õnnestunud avaldamise järel olla koristusteade. Reserv on
29 MiB pildikoha kohta ja konto piir 300 MiB; korduv piltidega proovimine võib
selle täita. Püsiv koristus ja kokkulepitud säilitustähtajad peavad saama valmis
enne üldist avalikku kasutust.

Avaldamise paus säilitab endiselt nähtavate kuulutuste avalike piltide lugemise:
published-binding, räsi ning uus binding-kontroll jäävad nõutuks. Omaniku
privaatne meedia ja kirjutamised jäävad pausi ajal suletuks. Olemasolevaid
kuulutusi, pilte, kontosid ega sõnumeid selle jätkuga ei kustutata.

Kolme konto lubamine on ajutine kasutuselevõtu piirang. Lõplikus avalikus
portaalis peab tavaline õigustatud kasutaja saama kuulutuse avaldada ilma
terminalis eraldi lubamiseta. Kasutaja kirjeldatud portaali ligipääsukoodi pole
siin sõltumatult kontrollitud; see ei asenda Authi ega õiguskontrolli.

## Kontrollide seis ja jätkuplaan

26.10 rakenduse 8 sihitud Node-juhtu ja production Turbopack/TypeScript build
17,905 s säilivad. Säilivad ka varasema hosted ühenduse 14 Node- ja 8 isoleeritud
SQL-kontrolli ning native-pakendi tõend. Need sünteetilise seadistusega kontrollid
ei kinnita tegelikku Maci paigaldust ega päris Storage’i/Verceli kasutust.

27.10 paranduse kontrollid läbisid: 8 Python-juhtu, 4 tegeliku ajutise Git-hoidla
juhtumit ja 5 aktiveerimismalli SQL-juhtumit. SQL jooksis eraldatud PostgreSQL
17.5 WASM-mootoris (PGlite 0.3.14) sünteetiliste tabelite ja kontodega; see ei
tõenda päris Supabase’i õigusi ega mitme ühenduse konkurentsust. Python3.9 AST
läbis. Tõendid on jätkupaki `evidence/three-accounts-20261027` kataloogis.
Muutmata rakenduse laiu kontrolle ega build’i uuesti ei käivitatud. Tegelik
pilvevalmidus kinnitatakse pärast kasutaja käiku.

Kuulutused on praegune esimene arendusetapp. Energy rahakott/arvestus, maksete
tuum, piiratud AI abi, teenused, identiteedid, sõnumid ja vajalik haldus jäävad
kokkulepitud V2 käivitamise ulatusse (`docs/30_V2_SCOPE.md`). Tavaline marketplace’i
osalemine ei sõltu Energy ostust.

- Jooksev seis: `CURRENT_STATE.json` ja sellest genereeritud `docs/99_V2_HANDOFF_NEXT_CHAT.md`.
- Teenuste identiteedid ning kuupäevaga tõendipiirid: `SERVICE_ACCESS.json`.
- Verceli Production-muutujate viide: https://vercel.com/docs/environment-variables.
- Supabase S3 autentimise viide: https://supabase.com/docs/guides/storage/s3/authentication.
