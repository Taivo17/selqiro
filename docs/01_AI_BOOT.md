# Selqiro — alusta siit

See on püsiv sisenemisjuhis. Praegust tööjärge ei dubleerita siin eraldi sprinti
või NEXT-ülesandena.

## Loe selles järjekorras

1. `docs/continuity/CURRENT_STATE.json` — üks praegune seisukirje: tegelik Maci/Giti seis, tehtud kontrollid, pilveseis, piirid ja üks järgmine tegevus.
2. `docs/99_V2_HANDOFF_NEXT_CHAT.md` — samast seisukirjest genereeritud loetav üleandmine.
3. `docs/continuity/HOSTED_PORTAL.md` — käesoleva portaali kasutuselevõtu täpne juhend.
4. `docs/continuity/SERVICE_ACCESS.json` — olemasolevate teenuste sihid, CLI pin ja kuupäevaga tõendipiirid; saladusi siin pole.
5. `docs/03_AI_RULES.md`, `docs/00_PROJECT_DNA.md` ning ainult käsil oleva mooduli arhitektuur.

Püsivad otsused on `docs/02_AI_MEMORY.md`-s; V2 ulatus ja ehitusviis on
`docs/30_V2_SCOPE.md` ja `docs/31_V2_BUILD_PLAN.md`. Vanade kuupäevade CURRENT/NEXT
pealkirjad on ajalugu. Neid ei käsitleta tänaste käivitamiskäskudena.

## Koostöö ja tõendite piir

- Arendame olemasolevat Selqiro portaali samas hoidlas; V2 on selle uus modulaarne kiht.
- Anna üks parim soovitus ning vii töö väikeste nähtavate tulemusteni: vajalik kohalik kontroll → commit/push → Vercel → tegelik kasutustee.
- Erista alati ettevalmistatud lähtekoodi, Macis rakendatud/staged tööd, commit/push'i, andmebaasi muudatust ja tegelikku deployment'i. Üks ei tõenda teist.
- Enne Maci kirjutusi kontrolli tegelikku haru, HEAD-i, tööpuud/indexit, lähtefaile ja kinnitatud remote'i. Säilita kasutaja muudatused ning päevikud.
- Ära korda lõpetatud paigaldajaid, teste või teenuste ühendamist ilma konkreetse uue põhjuseta. Kontode, kuulutuste, piltide, sõnumite või päevikute kustutamisluba puudub.
- Uuenda pärast sisulist sammu seisukirjet, sellest genereeritud üleandmist ja `docs/selqiro-dev-log.md`-d. Väljastatud räsikaitsega pakki ei muudeta varjatult.

## Arhitektuuri alus

Väikesed moodulid, üks autoriteetne andmeallikas, õhuke kasutajaliides ning
serveri/andmebaasi õiguskontroll. Tavaline osalemine ei sõltu Energy ostust.
Kuulutused on praegune arendusetapp; Energy, maksete tuum ja piiratud AI abi
jäävad kokkulepitud V2 käivitamise ulatusse.
