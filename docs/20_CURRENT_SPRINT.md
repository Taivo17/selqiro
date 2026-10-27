# Praegune tööetapp — kuulutused olemasolevas portaalis

Seis: 27.10.2026 Europe/Tallinn. Täpne ja autoriteetne tööjärg on
`docs/continuity/CURRENT_STATE.json`; loetav üleandmine on sellest genereeritud
`docs/99_V2_HANDOFF_NEXT_CHAT.md`.

## Eesmärk

Viia uus pildiga kuulutuse lisamine olemasolevasse Selqiro portaali ja kontrollida
müüja ning ostja tegelikku kasutusteed Taivo kolme olemasoleva kontoga.

## Tegelik seis

- Kohalik piltidega avaldamine ja galerii on kasutaja poolt vastu võetud.
- 26.10 paketi allikad on 27.10 terminalipildi järgi kaustas `~/selqiro-veeb-20261026` commit'iks ette valmistatud.
- Kasutaja katkestas vana ühe konto paigaldaja e-posti küsimuse juures. 27.10 kell 11:54 kuvatõmmis näitab `PEATATUD: INTERRUPTED`; selle jooksu pilvetoimingud ei alanud.
- 27.10 kell 12:30 peatus esimene `jatka.py` enne kirjutusi liiga laia Giti keskkonnakontrolli juures. r2 parandab autentimisabilise lubamise; tegelikud Git-sihtkoha kontrollid säilivad.
- Kolme olemasoleva konto lubamise jätk on ette valmistatud samasse töökausta; Macis on see veel rakendamata. Uut pilvebaasi ega kontosüsteemi ei looda; brauseris jääb e-posti/parooliga sisselogimine.
- Uus commit/push, andmebaasi/Storage'i aktiveerimine, Verceli deployment ja esimene uus pildiga veebikuulutus on veel kinnitamata.

## Järgmine tegevus

Kasuta `docs/continuity/HOSTED_PORTAL.md` üht jätkamiskäsku. See uuendab juba
loodud töökausta ja jätkab kolme konto seadistusega. Esialgset
`prepare_portal_worktree.py` käsku ei korrata.

Seejärel: vajalikud Verceli Production-seaded → commit/push → uue commit'i Ready
→ üks pildiga avaldamine → teise kontoga kontakt → müüja vastus.

## Valmimise piir

Hosted piltide lõppkoristus ja reserveeritud ruumi vabastamine vajavad lõpetamist
enne üldist avalikku kasutust. Vana ja uue navigeerimise ning sõnumite täielikku
koostööd ei eeldata enne päris kasutuskäiku valmis. Kontrollid peavad vastama
muudetud osale; juba kinnitatud laiu kontrolle ei korrata.

Varasem Architecture Sprint 1 ja LocationCardi eraldamine ei ole praegune
ülesanne: `LocationCard.tsx` ja `useLocation.ts` on lähtekoodis olemas. Püsivad
arhitektuuripõhimõtted ning üleilmne riigivaliku tugi säilivad. Energy/maksete
ja AI järjekord järgneb praegusele kuulutuste etapile kokkulepitud V2 ulatuse sees.
