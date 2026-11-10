<!-- SELQIRO_SERVICE_NAVIGATION_ACCEPTED_20261109 -->
## 2026-11-09 — teenuste tagasitee tootmises vastu võetud

Kasutaja kinnitas: „korras nüüd läheb mõlemas kohas tagasi samasse kohta”.
Vastu on võetud teenuse detailist Browser Back nii avalikule profiilile kui
ka avalikku teenuseloendisse. 21:31:20 nimega Verceli kuvatõmmisel on
`429ace2` / `Restore service list on browser back` / `main` / Ready / Production.
Varasem foto/profiiliparandus `26e468e` on samuti Ready / Production nähtav.

Täielikku commit-räsi, Maci eduraportit ega värsket tööpuud/indexit ei antud;
neid ei oletata. Paigaldajat, build'i, teste ega deployd ei korratud.
Käesolev eraldi dokumentide üleandmine sisaldab uut seisukirjet ja sellest
loodud handoff'i; Maci/GitHubi dokumente pole selle salvestusega muudetud.
Väljastatud ZIP-id ja senised päevikud säilivad muutmata.

## Varasem ettevalmistuse tõend — ajalooline

Allpool säilib väljastatud paki ettevalmistuse kirje. Selle tulevased paigaldamis-/Ready-/kasutajakatse märked on ülaloleva vastuvõtuga asendatud.

# Teenuste tagasitee — 09.11.2026

## Vastuvõtt ja praegune puudus

Kasutaja kinnitas 09.11, et teenuse pilte saab salvestada ning Minu alas ja
avalikul profiilil on uusim teenus esimene. Viis kuvatõmmist kell 20:19–20:36
Europe/Tallinn toetavad nähtavat tulemust. Need ei näita täpset uut commit'i,
Maci eduraportit ega Verceli Ready identiteeti.

Teenuse detailist brauseri Tagasi viib profiili või teenuseloendi algusesse.
Hobuse profiililt ja tavakuulutuse avalikust loetelust tagasitee on kasutaja
poolt vastu võetud. Vana r2 allikaga korrati kaks teenuste puudust brauseris:
profiili laiendus sulgus ja asukoht kadus; avalikus loendis kadusid filtrid,
juurde laaditud teine leht ning asukoht.

## Ette valmistatud parandus

Eraldi väike service-navigation moodul seob lähte- ja detailiajalookirje
valideeritud lähtekoha ning teenuse UUID-ga. Teenuse avamisel säilitatakse
kaardi koht nähtavas aknas, profiili laiendus ja horisontaalne asend või
avaliku loendi filtrid ja laaditud lehed. Avalik andmestik loetakse tagasitulekul
uuesti senise lugejaga; ajalukku ei salvestata teenusekirjeid ega fotosid.

Tagasi–Edasi–Tagasi saab sama koha taastada korduvalt. Detaili nähtav tagasilink
arvestab profiilist või loendist tulekut. Otse avatud detaili varuvalik on
avalik teenuseloend. Automaatne joondamine arvestab ülemiste sektsioonide hilist
laadimist ning lõpetab kasutaja kerimise, puudutuse või klahvivajutuse peale.

Automaatne uuesti lugemine piirdub kaheksa 24-realise lehega. Väga pika loendi
puhul taastatakse otse avatud kaardi leht; varasemate ja hilisemate tulemuste
nupud jätavad ülejäänud tulemused kättesaadavaks. See ei ole teenuste arvupiir.

Pikk kirjeldus jääb kaartidel kahe rea sisse. Avalik SQL annab täisteksti ning
detailis ei ole kärpimise reeglit. Nii vana kui uue allika katses oli pikk
kirjeldus viimase lõiguni loetav. Selles paranduses ei muudeta kirjelduse sisu.

Arhitektuur: `docs/architecture/service-return-navigation-v1.md`.

## Uued kontrollid ja tõendipiir

| Kontroll | Tulemus | Piir |
| --- | --- | --- |
| Next 16.2.1 tootmiskooste | PASS, 17,219 s, 596 sisendit, drift 0 | Sünteetilised kohalikud võtmed; Maci ega Vercelit ei käivitatud |
| TypeScript ja sihitud ESLint | PASS; 0 lint-viga, 2 varasemat img-hoiatust | Muudetud runtime |
| Konteksti ja filtrite leping | 12/12 PASS | Päris helperid, jsdom history/storage |
| Vana vea kordamine | Mõlemad puudused korratud | R2 frozen allikas, eraldi säilitatud enne-katse |
| Chromiumi kasutusteed | 13/13 PASS, EN/ET, 390/1365 px | Päris React/CSS/history, sünteetilised API/auth ja Next Link/router piirid |
| Buildi ja brauseri sisendi seos | 53/53 runtime-faili kattuvad; drift 0 | Uue buildi tegelik CSS |
| Uuendaja varasema tõendi sidumine/veatee | 8/8 PASS | Privaatne kohalik fixture; Git-vastused/build/Finder sünteetilised |
| Lõppmanifesti tarnekäik | Täpne tulemus tarne `kontrollid` kaustas | Päris ajutine Git/backup/index/commit/kohalik push; build ja prior-resolve sünteetilised |

Brauseris kontrolliti laiendatud profiili, horisontaalset eelvaadet, filtreeritud
teist tulemuste lehte, native Back–Forward–Back liikumist, nähtavat tagasilinki,
hilist 180 px ülemise sisu kasvu, sügavat lehte, teenuse/kuulutuse vahetust
ning detaili otse avamist. Sügav taastamine luges ühe lehe offset 216; varasem
ja järgmine nupp lugesid 192 ning 240. Pikad EN/ET kirjeldused kattusid täielikult
sisendiga ja viimane lõik oli nähtav. Välisvõrgupäringuid ning pageerror-erandeid
oli null; console.error voogu eraldi ei kogutud.

Esimene lokaalne build läbis kompileerimise ja TypeScripti, kuid vana AI route
vajas puuduolevat sünteetilist serverivõtit. Katse säilitati eraldi ja sama
runtime koostati täieliku sünteetilise konfiguratsiooniga edukalt. Selle tõttu
rakenduse lähtekoodi ega kasutaja keskkonda ei muudetud.

Need kontrollid ei kinnita päris Supabase'i, kontode, Storage'i, täieliku Next
runtime-navigeerimise ega Verceli kasutuskatset. Varasemaid vastu võetud
fotovaliku, SQL-i, järjestuse ja hobuste laiu kontrolle ei korratud.

## Ainult lähtekoodi tarne

Uus pakett on `selqiro-teenuste-tagasitee-20261109.zip`. Selle alus on muutmata
r2 manifest `d537235cb494f4b3862b2580952d3cc300bc20e7f8137a03aebcd58c78c45c7d`
ja 1367-failine tree `224a1c5708688303c24dcd2a360ff3035a91e683`.

Uuendaja loeb ainult selle r2 täpset privaatset complete-päevikut. Sealt leitud
tegelik commit peab Gitist tõendama parent'i
`b05ed3047a25bc1504403ec70e98ae0ff7757bec`, oodatud teemat, kõiki puukirjeid ja
59 r2 muudatuse rada. Käesoleva paketi sisse ei oletata r2 commit'i ega
raportiräsi; Macis loetud raporti räsi seotakse uue jooksu päevikuga.

Seejärel kontrollitakse tegelikku haru, HEAD-i, indexit, lähtefaile ja kinnitatud
remote'i, varundatakse ainult vajalikud failid, tehakse build ning piiratud
commit/push. SQL-i, Supabase CLI-d, Storage'i toimingut ega sõltuvuste installi
ei ole. Varasem r2 pakett ning kõik päevikud jäävad muutmata.

Vea korral kuvatakse just selle jooksu kontrollitud JSON-raporti täpne asukoht
real `SAADA SEE FAIL:` ja valitakse sama fail Finderis. Koopia/originaali,
puuduva või vananenud raporti ning Finderi tõrke eristused säilivad.

Üks kehtiv käsk ning kasutajakatse on `docs/continuity/HOSTED_PORTAL.md`-s.
Maci rakendamine, uus commit/push, sama commit'i Ready ja mõlemad tegelikud
Browser Back kasutusteed jäävad pärast ettevalmistust kinnitada.
