# Teenuste poe rubriigid — vastu võetud 11.11.2026

## Vastuvõetud tulemus

Kasutaja kinnitas: „lisasin teenusele poerubriigi antiik, avalikus profiilivaates
avab selle teenuse peale antiik valimist, avalikus profiilis on nähtaval ainult
need poe rubriigid, mille all on aktiivseid kuulutusi”.

Kolm lisatud kuvatõmmist toetavad seda kasutusteed: teenuste jaotises on
ANTIIK-filter, selle valimisel jääb nähtavale üks Puhastusteenus ning
kuulutuste jaotises on alles sisuga AUTODE MÜÜK ja GARAAZI LEID.
Pilte selles dokumendipakis uuesti ei levitata; nende kirjeldus ja räsid on
`evidence/user-acceptance.json`-is. ANTIIK on kasutaja enda rubriiginimi;
globaalset teenuse kategooriat see ei muuda.

## Tegeliku Maci lõppraporti seos

| Tõend | Tulemus |
| --- | --- |
| Raport | `selqiro-teenuste-poerubriigid-20261111-raport-20261111-163201-1847005ab277.json` |
| Raporti suurus / SHA256 | 237629 baiti / `024d92a76b33fc5b6e3ea51f3fa0216b47c4bafe122243552d9d43372b7350ff` |
| Vorming / etapp | selqiro-service-store-categories-20261111-v1 / complete |
| Siht | /Users/taivo/selqiro |
| Lähtecommit | d5e77e963f80cb4dab33e6e6667c44d4062c4bbc |
| Uus commit | `1b0c5ba867e5f466e75f63aee78521d37cf8164f` |
| Raporti database / build / push | verified / passed / verified |
| Algus / SQL järelkontroll / lõpp | 16:31:16 / 16:31:32 / 16:31:59 Europe/Tallinn |
| Storage'i toimingud | not_performed |
| Vercel | READY_NOT_CHECKED |

Raporti release vastab muutmata väljastatud manifestile `38d5ff79c86506c89f3a9d59517b271092f1d27470c810c4a227c76a548f7a99`.
Väljastatud ZIP-i SHA256 on `23fd05e8c59c02ebd940bfb903fe22f1449cd5e1f8ad8b8975968a1a4e9468a8`, suurus 1330873 baiti ja 128 faili.
Kõik üheksa uuendaja abifaili, payload-räsid/režiimid ning ZIP-i indeks
kattuvad. Varasem hobuste raport on seotud täpse räsi, commit'i, ainsa vanema,
teema ja lähtepuuga; lühikese commit'i eesliite järgi alust ei oletata.

1515 algse indexikirje ja 76-failise delta (28 asendust, 48 lisandust) ning
1487 muutumatu faili võrdlus rekonstrueerib 1563-failise lähtepuu
`6808d687e21b96d7e8b25639e00d0a525f97ad6a`. See kattub väljastatud lepinguga ja külmutatud kandidaadiga.
Tegemist on raporti ning muutmata uuendaja kontrollide ülevaatusega, mitte
värske kaug-Giti päringuga.

## Andmebaasi tõend

Raport sisaldab edukat eellugemist, üht acknowledged rakendust ja eraldi
edukat järelkontrolli: absent → applied. Mõlemal poolel on 12 nõutud kaitset
tõesed. Kolm olemasolevaid funktsioone, õigusi ja struktuuri kaitsvat
sõrmejälge, sõltuvuste sõrmejälg ning hosted-kontekst on võrdsed.
SQL-i apply-intent vastab täpselt väljastatud failile; uue SQL-i korduskäivitust
selles vastuvõtu ülevaatuses ei tehtud.

Need kontrollid katavad nimetatud lepingu, mitte iga kasutajasisu rea täielikku
räsivõrdlust. Raporti SQL-käskude exit code on 0; igaüks märgib 27 stderr-baiti,
kuid toorteksti pole üles laaditud. Seetõttu ei väideta, et stderr oli tühi.

## Tõendi piir ja järjepidevus

Kasutajavastuvõtt katab ANTIIK-salvestuse, selle profiilifiltri kaudu
leidmise/avamise ja avalike tühjade rubriikide puudumise. See ei lisa värsket
Back-, alamrubriigi-, kõigi omaniku rubriikide-, negatiivse õiguse-,
kustutamise- ega aegumiskatse kinnitust. Varasemad tava-/hobusekuulutuste
rubriigisammud ning teenuste Back-katse jäävad vastu võetuks.

Uuendaja kontrollis lõpetamisel main-haru, tööpuud/indexit, täpset vanemat,
commit'i ulatust, oodatud teemat ja kinnitatud remote'i main-haru võrdsust
uue commit'iga. Tooreid Maci Git-logisid, indexi baite ega build-6cmbpdm1.log-i
pole eraldi esitatud. Build passed on valvatud build-toimingu raportitõend.
Täpne Verceli Ready/deployment-ID ei ole esitatud. Push ja nähtav kasutajakatse
ei ole selle konkreetse deployment-kviitungi asendus.

Selles vastuvõtu vestluses tehti ainult tõendite lugemine, räsivõrdlus ja uus
dokumentide jätkupunkt. Paigaldajat, build'i, rakendusteste, SQL-i ega Storage'i
toiminguid ei korratud. Väljastatud lähtepakk ja varasemad tõendid säilivad
muutmata. Dokumentide delta ootab järgmisse sisulisse lähtepakki kandmist;
seda ei märgita Macis/Gitis juba rakendatuks.

Üks järgmine soovitatud töö on teenuse üheaastane kehtivus ja teadlik
pikendamine: `SERVICE_ACTIVITY_NEXT_20261111.md`.
