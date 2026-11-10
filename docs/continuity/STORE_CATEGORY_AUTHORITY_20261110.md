<!-- SELQIRO_STORE_CATEGORY_AUTHORITY_ACCEPTED_20261110 -->
## 10.11.2026 — poe rubriikide õigusteparanduse kasutustulemus on vastu võetud

Kasutaja kinnitas pärast lõpetatud õigusteparandust: „poerubriigi lisamine õnnestus ja avalikul profiilil on kuulutus selle rubriigi filtris leitav“.
Ootel olnud salvestuse ja profiilifiltri kasutuskontroll on selle tulemuse ulatuses läbitud.
Varasem ülem- ja alamrubriigi loomise, nimevahetuse, seostamise ning eemaldamisel
kuulutuse säilimise vastuvõtt säilib. Paigaldajat, SQL-i ja läbitud katseid ei korrata.

Viimane raportiga kinnitatud paigaldus on `adfa3ae767712b5f71e9fac2d963a765f61fb444`,
10.11 kell 20:07:17 Europe/Tallinn, `database: verified`. Verceli sama commit’i
Ready / Production kuvatõmmis on vastu võetud. Uus kasutajakinnitus ei ole uus
Giti või SQL-kataloogi vaatlus ega kõigi vanade vormide või kontode katse.

Järgmine soovitus on ühendada hobusekuulutused enda poe rubriikidega, säilitades
`horse_offers` kanoonilise UUID. Teenused jäävad eraldi järgmiseks sammuks.
Selle töö koodi pole käesolevas vastuvõtus lisatud. Üks praegune seis ja järgmine
tegevus on `docs/continuity/CURRENT_STATE.json`-is; ulatus on
`docs/continuity/HORSE_STORE_CATEGORY_NEXT_20261110.md`-s.

See on eraldi dokumentide jätkupunkt. Selle dokumentide muudatusi pole Maci hoidlas rakendatud, commit’itud ega push’itud; järgmine kontrollitud lähteuuendus võtab need kaasa. Väljastatud lähte- ja paigalduspakid ning algsed raportid ja päevikud säilivad muutmata.

Allpool säilivad varasemad kirjed ja nende tõendipiirid muutmata. Nendes leiduv
ootel kasutuskatse, NEXT-pealkiri või paigalduskäsk ei ole praegune tööjuhis.

---

# 10.11.2026 õigusteparanduse lõpetatud paigaldus

Uus seis 20:07:17 Europe/Tallinn asendab allpool säilitatud ettevalmistus- ja
ooteseisu juhised. **Paigaldus on lõpetatud; sama paigaldajat ega SQL-i ei korrata.**

## Tegelik kasutaja raport

Fail: `selqiro-poerubriikide-oigused-20261110-raport-20261110-200717-a2d280189433.json`.
Maht 229403 baiti; SHA256 `07854b1ad2faa249203729e812c0dd03a078ebf20043cd0ee2e58d7d414261b1`.
Tegelik siht `/Users/taivo/selqiro`; commit `adfa3ae767712b5f71e9fac2d963a765f61fb444`.
`stage: complete`, `database: verified`, `build: passed`, `push: verified`,
`storage_operations: not_performed`. Manifest vastab väljastatud pakile:
`9095e459b64807a731fcfbaa32371503f78bfcd134917d203ea46d39a6fa5369`.
Kinnitamine võrdles 54 algolekut ja täielikku 1436-kirjelist algindexit.

Build, commit, push ning indexi räsid säilivad 17.32 esimesest jooksust.
Jätk ei tõenda uut build'i ega uut commit'i; push oli kinnitatud 17:32:41.
Build'i toorlogi, täielikku lõppindexit ja commit-objekti ei lisatud raportisse.

## Kliendimärk ja üks SQL-i rakendus

Enne jätku säilib kuue 404-vaatlusega 17.33 ooteolek. Jätkus vastas kliendimärk
20:07:05 ja 20:07:10 HTTP 200, täpselt 139 baidiga ja SHA256-ga
`d79b11e4ed8710ff39a4fbbfa748f5adde55a5c363729cda3711b2037bcc613e`.
Üks SQL-i rakenduskäsk on `store_category_authority_apply_once`, exit 0;
`database_apply_outcome: acknowledged`. Selle apply.sql SHA256 on
`ebe7d6d65dafc498e9b9e97f7ad8b68857c43479c05293216c3ce8f12a0da055`.
Eraldi `store_category_authority_verify` väljus 0 ning andmebaasi järelkontroll
kinnitati 20:07:15. `database_after.state: applied`, kõik üheksa kontrollirühma
on true; sõltuvuste fingerprint ja kolm säilivat invarianti vastavad eelolekule.
`database_last_read.state: absent` on alles jäetud rakenduseelne vaatlus.
Kliendimärgi kontroll enne SQL-i on täpse uuendaja juhtvoo ja raporti vaatlustega
toetatud; üksikute SQL-käskude ajatemplid raportis puuduvad.

## Veeb ja tõendipiir

Kasutaja 17.35.17 Verceli kuvatõmmisel on `adfa3ae`, main, Ready / Production.
See varem saadetud pilt on aktsepteeritud; uut pilti ei küsita.
20.09.22 terminalipilt toetab jätku lõppteadet ja sama commit'i.
Avalik märk, nähtav Verceli staatus ja SQL-i järelkontroll on eraldi tõendid;
täielik Verceli deployment-ID/API-kviitung ja uus päris brauseri salvestuskatse
ei kuulu selle raporti tõendisse. Raporti `READY_NOT_CHECKED` välja ei muudeta.

Lõpliku raporti võrguühenduseta ülevaatus läbis 26 kontrolli. Käesolev ülevaatus
ei käivitanud paigaldajat, build'i, SQL-i, brauserikatseid ega pilvetoiminguid.

## Üks järgmine tegevus

Värskenda portaal ja tee pärast õiguste muutmist üks kitsas kasutuskontroll: ava olemasoleva testkuulutuse 202 rubriigivaade https://selqiro.vercel.app/v2/my-area/listings/202/store-categories, vali üks aktiivse identiteedi olemasolev poe rubriik, salvesta ja kontrolli sama kuulutuse leitavust profiili vastava rubriigi filtris. Teata tulemus. Uut kuulutust või rubriiki ei pea looma ega eemaldama. Paigaldus ja varasem halduse täiskatse on lõpetatud; neid ei korrata.

See dokumentide koopia on eraldi jätkupunkt. Seda dokumentide uuendust pole Maci hoidlas rakendatud, commit’itud ega push’itud; uus koodimuudatus või deployment sellest ei teki. Järgmine kontrollitud lähteuuendus võtab selle delta kaasa. Väljastatud paigalduspakk, selle lähtekoopia ning kõik raportid ja päevikud jäävad muutmata.

## Säilitatud ettevalmistuse ajalugu

Alljärgnev varasem dokument säilib bait-baidilt. Selle ettevalmistusseis ja
käivitamiskäsud ei ole praegune tööjärg.

---

# Poe rubriigiseoste otsekirjutustee sulgemine

Seis: 10.11.2026 Europe/Tallinn. Ettevalmistatud uus allikas, mitte Macis või
pilves rakendamise tõend. Üks praegune tööjärg on `CURRENT_STATE.json` ja üks
käivitamiskäsk `HOSTED_PORTAL.md`-s.

## Lubatud töö ja kinnitatud alus

Kasutaja lubas järgmise soovitatud töö: vana `listing_store_categories`
otsetabeli kirjutajate ja õiguste sihitud ülevaatus ning minimaalne parandus.
Eesmärk on kasutada kõikides teadaolevates kasutajaliidese salvestusteedes sama
olemasolevat toimingut, mis seob kuulutuse ja rubriigid sama lubatud identiteediga.

Eelmine poe rubriikide halduse etapp on lõpetatud. Tegelik Maci raport kinnitab
`0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a`, andmebaasi kontrolli, build'i ja push'i.
Kasutaja võttis vastu loomise, mõlema taseme nimevahetuse, seostamise ja profiilist
leidmise ning rubriikide eemaldamisel kuulutuse säilimise. Seda katset ei korrata.
Täpne ajalooline tõendipiir on `STORE_CATEGORY_MANAGEMENT_20261110.md`-s.

Uus tarne nõuab täpselt sama edukat privaatraportit ja 1436-failist aluspuud
`4e8226df26a69aa966a9d809c19fb4df771d034f`. Alusraporti SHA256 on
`1e181c9533d3caa18b165f3541127241793d764e5f2adc2fd47161cd2f56abc7`.
Raporti asukoht leitakse selle teadaoleva väljalaske järgi, mitte uusima faili
otsinguga. Tegelikku haru, HEAD-i, kogu indexit/tööpuud, lähtefaile ja kinnitatud
remote'i kontrollitakse uuesti enne kirjutusi.

## Leitud kaks vana kirjutajat

| Koht | Senine rubriigisalvestus | Parandus |
| --- | --- | --- |
| `app/sell/page.tsx` | Ühe seose otsene lisamine pärast kuulutuse loomist. | Olemasolev kinnitatud aktoriga atomaarne RPC; fotoosa jätkub ka rubriigivea korral. |
| `app/my-page/page.tsx` | Kõigi vanade seoste kustutamine ja uue eraldi lisamine; kustutuse viga jäi kontrollimata. | Sama atomaarne RPC; tühi valik on teadlik seoste eemaldamine. |

Vana `FOR ALL` poliitika kontrollib kuulutuse `user_id`-d, kuid ei seo valitud
rubriigi identiteeti kuulutuse identiteediga. Üksnes lisamisreegli karmistamine
jätaks alles kahe eraldi päringu vea: vana seos võib olla juba eemaldatud, kui
uus lisamine tagasi lükatakse. Seetõttu muutuvad klient ja seostetabeli õigused
ühe tarne sees, kindlas järjekorras.

Uus väike `saveLegacyStoreCategorySelection` adapter fikseerib algatanud
kasutaja, identiteedi ja valiku enne asünkroonset tööd. See kasutab muutmata
`managedListingStoreCategoryApi` lugeja/kirjutaja ning täpset kviitungi kontrolli.
Üks salvestus teeb ühe RPC-katse. Automaatselt ei korrata teadmata tulemusega
kirjutust ega pöörduta otsetabeli või kasutaja-ID-põhise varutee poole.

Kuulutuse põhiosa võib rubriigivea ajaks juba salvestatud olla. English/Eesti
teade ütleb seda eraldi ega suuna sama kuulutust uuesti avaldama. Taastetee
`/v2/my-area/listings/[id]/store-categories` loeb olemasoleva kuulutuse tegeliku
rubriigivaliku enne uut teadlikku salvestust. Vaade kasutab olemasolevat
identiteedilugejat, rubriigikaarti, hook'i ja kaitstud API-t; see ei nõua
uue avaldamistee kviitungit. NULL-identiteediga või võõra identiteedi kuulutuse
seostamine jääb keelatuks. Kuulutuse identiteeti ei muudeta automaatselt.

## Andmebaasi muudatuse piir

Uus paranduse kataloog on `supabase/repairs/20261110_store_category_authority/`.
Ühes tehingus eemaldatakse PUBLIC/anon/authenticated otsesed mitte-SELECT õigused
ainult `listing_store_categories` tabelilt ning vana lai kirjutuspoliitika.
SELECT, avaliku lugemise poliitika, olemasolev serveri autoriteet, tabeli
struktuur, funktsioonid ja andmeread säilivad. Paigaldus ei kustuta ega kirjuta
ümber kuulutusi, rubriike, seoseid, fotosid või Storage'i objekte.

Üheksas eel-/järelkontrolli rühmas on rollid ja nende tegelikud õigused,
liikmesused, veeruõigused, projekt/paigalduse identiteet, säilivad funktsioonid,
tabelistruktuur, kustutamise mõjud ja rubriigitabeli muutumatu autoriteet.
Tundmatu või poolik seis peatab rakendamise. Täpne parandatud seis kontrollitakse
kordusrakendamisel ilma samu õiguste muudatusi uuesti tegemata.

SQL-i räsid:

| Fail | SHA256 |
| --- | --- |
| `apply.sql` | `ebe7d6d65dafc498e9b9e97f7ad8b68857c43479c05293216c3ce8f12a0da055` |
| `preflight.sql` ja `verify.sql` | `823bebb5a0f414d4aa0f6a7bacebf28a89d993add74e31dfff6571cf93549199` |
| `01_authority.sql` | `1f9a8f3299d13c6a275627375e31f39453f587f9ee7920d74e0436f7c87216ca` |

Olemasolev `set_my_listing_store_categories_v2(text,uuid[])` jääb samaks.
See kontrollib sisselogimist, salvestatud aktiivset identiteeti, eraomaniku või
aktiivse äriliikme ligipääsu ning kuulutuse ja kõigi rubriikide sama identiteeti.
Viga tühistab kogu asenduse; tühi komplekt eemaldab ainult rubriigiseosed.

See parandus sulgeb brauseri otsemuudatused seostetabelile. See ei kehtesta
universaalset invarianti hilisema `listings.identity_id` või
`store_categories.identity_id` muutmise ega privilegeeritud kirjutajate suhtes.
Ajaloolisi seoseid ei uurita sisu kaupa ega parandata automaatselt.

## Allikas peab jõudma veebi enne õiguste sulgemist

Uus klient töötab olemasoleva RPC-ga juba enne õigusteparandust. Uuendaja järjekord:

1. Lugemispõhine andmebaasi eelkontroll.
2. Allika ja dokumentide rakendamine, build, commit ja push.
3. Täpse uue avaliku kliendimärgi vaatlus olemasoleval portaalil.
4. Värske lähte-, remote'i- ja märgikontroll; üks SQL-i rakenduskatse ja eraldi
   tulemuse lugemine/kontroll.

Kliendimärk on 139-baidine JSON-fail, mille nimi ja sisu seovad 39 kliendiallikat,
sealhulgas kaks vana vormi ja taastetee identiteedi/rubriigimoodulid.
See ei sisalda kontoandmeid ega võtmeid. Päring kasutab fikseeritud HTTPS-sihti,
ei saada autentimist ega järgi ümbersuunamisi ning piirab aega ja vastuse mahtu.
Märgi täpne sisu ja räsid on paki `kontrollid/public-client-marker.json`-is.

Kuni 55-sekundilise oote järel võib uuendaja lõpetada olekus
`WAITING_FOR_CLIENT_DEPLOYMENT`. Sama käsk jätkab ainult kontrollitud allikast;
varasemat build'i, commit'i ja push'i ei korrata. Pärast ebakindlat push'i
võrreldakse kaugviita täpse commit'iga; uut saatmist ei oletata turvaliseks.
Ebaselge SQL-i vastuse järel loetakse andmebaasi seisu, kirjutust ei saadeta uuesti.
Päevikus säilib ka varasema andmebaasisammu ajalugu, kui katkestus toimus hiljem.

Avalik märk tõendab selle kliendimärgi kättesaadavust, mitte Verceli
Ready/API/deployment-ID-d ega kõigi juba avatud vahelehtede koodi asendamist.
Pärast uuendust tuleb portaal värskendada. Vana koodiga vahelehe otsekirjutus
ei saa uute õiguste all õnnestuda.

## Kohalikud kontrollid

Lõpliku kliendi tõendid vastavad parandatud taastetee revisjonile. Välise paki
`kontrollid` kaustas on järgmised failid; SQL-i tõendid jäävad lisaks paranduse
lähtekataloogi.

| Kontroll | Tulemus | Tõend paki kontrollid-kaustas |
| --- | --- | --- |
| Vana adapter ja tegelikud create/save handlerid | 19/19 PASS | `client-result.json` |
| Tegelik taastesihtkoht, identiteedi hook ja rubriigimoodulid | 10/10 PASS | `review-result.json` |
| Build'i järel vanad handlerid Chromiumis | 7/7 PASS | `handler-browser-result.json` |
| Build'i järel tegelik taastesihtkoht Chromiumis | 9/9 PASS | `review-browser-result.json` |
| Lõplik Next webpack build | PASS, 79.449 s, 616 sisendit, muutusi 0 | `final-runtime-build.json`, `final-runtime-inputs.json`, `final-build-log.json` |
| Täpne varasem raport ja alus | 9/9 PASS | `installer-prior-receipt.json` |
| SQL-i adapter ja ebaselge vastuse lugemine | 13/13 PASS | `installer-database.json` |
| Kliendimärgi transport ja ajalimiit | 9/9 PASS | `installer-marker.json` |
| Allikas-enne-SQL järjekord ja katkestusest jätk | 10/10 PASS | `installer-rollout.json` |
| Täpse manifesti ajutise Giti tarnekäik | Väljastamise eel nõutud PASS | `final-flow.json` |
| Sõltumatu lähte- ja tarnejärjekorra ülevaatus | Lahendatud taastetee puudus; allesjäänud blokeerijat ei leitud | `independent-review.json` |

Lõpliku build'i sisendinventari SHA256 on
`8be5072e3cde54cc9f98cc395552008d431e8f9627acd53478c34c2984fe6b51`, logi SHA256
`01d23d79160c696a79d1b2b0586e446525bc6b3371c65df65673f6b050da2f12`.
Chromium 153 katsed võrdlevad vastavalt 12 ja 33 tegeliku runtime-sisendi räsi
selle inventariga; mittevastavusi ja hilisemat muutust ei olnud. Uue taastetee
1280- ja 390-pikslised ekraanivaated kontrolliti kohalikult: kaartide tekst ja
nupud on loetavad, nähtavat horisontaalset ülevoolu pole. Pilte ei lisata pakki.

Brauseris on päris uus route/page, identiteedihook ja rubriigi kaart/valija/hook/
API/parser. Auth/PostgREST, keelekontekst, muu kest ja Next Link on kontrollitud
rakise piirid; CSS pärineb lõplikust build'ist. See ei ole kogu Next-serveri
või live-teenuse kontroll. Vanade handlerite katse kasutab lähtekoodist eraldatud
tegelikke funktsioone; ümbritsev vorm, foto/AI ja navigeerimine on sünteetilised.

Esimene build peatus TypeScripti tulemusetüübi kitsendamise juures; eraldi
union-variantide parandus ei muutnud käivitatavat JavaScripti. Esimene taastetee
rakise jooks peatus puuduva sünteetilise shelli ekspordi tähise tõttu.
Need algsed tõendid ja enne taastetee parandust läbinud revisjon säilivad
`kontrollid/history` all; neid ei esitata lõpliku revisjoni kontrollina.

SQL-i praegused muutumatud tõendid on paranduse kataloogis:

- `runtime-result.json`: 18/18 PASS.
- `installation-result.json`: 31/31 PASS.
- `guard-generation-result.json`: eel-/järelseis, kordus ja invariantsused PASS.

SQL-katsed kasutavad PGlite PostgreSQL/WASM-i, sünteetilisi rolle ja andmeid ning
ühte ühendust. Esimene nõrga poliitika reproduktsioon ei õnnestunud, sest
säilitatud fixture'i kuulutuste lugemisreegel oli suletud. Parandatud eraldatud
reproduktsioon kasutas ajaloolise aluse avalikku SELECT-poliitikat, mis eemaldati
enne päris paranduse kontrolli. See on tingimuslik lähtekoodi vea reproduktsioon,
mitte tõend praegu tootmises kasutatavast ründeteest. Algne ebaõnnestunud
katsetõend säilib `tests/review/runtime-attempt-1.json`-is.

Kliendi sõltumatu ülevaatus leidis esialgse taastelingi puuduse: üldine
integreeritud muutmisvaade nõuab avaldamise kviitungit, mida vana `/sell`
otse loodud kuulutus ei oma. Eraldi rubriigivaade kõrvaldab selle sõltuvuse.
Varasema 19-katse/7-brauserikatse ja build'i tõendid jäävad varasema revisjoni
juurde. Parandatud variandi kontroll renderdab ka tegeliku taastesihtkoha.

Kohalik build, sünteetiline Auth/PostgREST, eraldatud brauserirakis ning ajutise
Giti/remote'i tarnekatse ei tõenda uut tegelikku Maci, Supabase'i või Verceli seisu.
Varasemad väljastatud pakid, lähtekoopiad ja päevikud säilivad muutmata.

## Üleandmine ja järgmine tegevus

Uus pakk on `selqiro-poerubriikide-oigused-20261110.zip`. Selle manifest määrab
täpse lubatud lähte-, SQL-i ja abiskriptide ulatuse. Commit'i kavandatud pealkiri
on **Close direct store category link writes**. Uut tegelikku commit-räsi ei
teata enne kasutaja käivitamist.

Pakk kannab kaasa varasema 12 vastuvõtudokumendi delta ning uue CURRENT_STATE,
sellest genereeritud üleandmise, arenduspäeviku ja selle paranduse lepingu.
Uut hoidlat, portaali, projekti, konto- või keelesüsteemi ei looda.

Käivita `HOSTED_PORTAL.md` üks käsk. Lõpetamisel või peatumisel näitab uuendaja
**SAADA SEE FAIL:** täpset unikaalset raportit ja valib selle Finderis.
Saada see JSON-fail. Selle põhjal täpsustatakse tegelik allika/commit/push'i,
avaliku kliendimärgi ja andmebaasi seis; vastu võetud varasemaid katseid ei korrata.
