<!-- SELQIRO_SERVICE_STORE_CATEGORIES_ACCEPTED_20261111 -->
## 11.11.2026 — paigaldus ja kasutajavastuvõtt on lõpetatud

Allpool on muutmata ettevalmistusetapi ajalugu, mitte tänane paigaldusjuhis.
Uus commit on `1b0c5ba867e5f466e75f63aee78521d37cf8164f`; SQL-i järelkontroll, build ja push
on lõppraportiga tõendatud. ANTIIK-rubriigi teenusele salvestus, profiilifilter
ning aktiivse sisuga avalikud rubriigid on kasutaja poolt vastu võetud.
Täpsed piirid: `SERVICE_STORE_CATEGORIES_ACCEPTED_20261111.md`.
Praegune järg: `CURRENT_STATE.json`; uus kehtivuse ulatus:
`SERVICE_ACTIVITY_NEXT_20261111.md`. Uut terminalikäsku praegu pole.

---

<!-- SELQIRO_SERVICE_CATEGORIES_PREPARED_20261111 -->
# 11.11.2026 — järgmise sammu lähtepakk on ette valmistatud

Allpool olev 10.11 plaan on ajalugu. Teenuste poe rubriikide teostus ja
avaliku profiili sisuga rubriigifiltrid on nüüd kohalikult kontrollitud.
Praegune seis: `CURRENT_STATE.json`; üks käsk: `HOSTED_PORTAL.md`;
tõendid: `SERVICE_STORE_CATEGORIES_20261111.md`. Maci/pilve rakendus on ootel.

---

# Järgmine soovitatud samm on teenuste poe rubriigid

Seis: 10.11.2026 Europe/Tallinn. Tavakuulutuse ja hobuse poe rubriikide
kasutusteed on vastu võetud. See on järgmise töö ulatus, mitte paigaldusjuhend.
Teenuste rubriigiseoste lähtekoodi, SQL-i ega uut pakki pole veel koostatud.

## Üks kasutustee

Teenuse omanik valib teenuse muutmisvaates oma poe ülem- või alamrubriigi,
salvestab valiku eraldi ning leiab sama teenuse avaliku profiili teenuste osas
selle rubriigi filtriga. Teenus jääb oma kanooniliseks `services` UUID-kirjeks.

Olemasolevaid poe rubriike kasutatakse uuesti; globaalset teenuste taksonoomiat
ei muudeta. Teenused jäävad profiilil eraldi teenuste loendisse. Teenuse põhivormi
ja fotode pooleliolev töö peab rubriigisalvestusel säilima. Rubriigi eemaldamine
võib eemaldada ainult seose; teenus ja fotod peavad säilima.

## Enne teostust

Loe olemasolev teenuse muutmisvaade, entity/API, omanikukontroll, profiililugeja
ning olemasolevate poe rubriikide leping. Kontrolli seostetabelite ja RPC-de
tegelikku olemasolu enne uue nime või migratsiooni valimist. Lahenda õigused
serveris/andmebaasis; ära kopeeri klienti otsest tabelikirjutust. Kasuta väikeseid
mooduleid, olemasolevat kahetasandilist valijat ja English/Eesti tõlkeallikaid.

Järgmise tarnesammu alus on paigaldusraporti commit
`d5e77e963f80cb4dab33e6e6667c44d4062c4bbc`, kuid enne Maci kirjutusi tuleb
tegelikku seisu uuesti võrrelda. Võta järgmisse lähtepakki kaasa praeguse
vastuvõtu dokumentide delta; väljastatud hobuste pakki ei muudeta tagantjärele.

Kontrollid peavad puudutama muudetud teenuste osa. Lõpetatud tava- ja
hobusekuulutuse paigaldusi/kasutuskatseid uue etapi alustamiseks ei korrata.
Üldine fotode taustakoristus ning muud avaliku avamise piirid jäävad eraldi tööks.
