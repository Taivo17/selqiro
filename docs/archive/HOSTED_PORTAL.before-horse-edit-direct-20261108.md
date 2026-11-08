# Hobuse muutmise kinnitused ja galerii nooled

Seis: 08.11.2026 Europe/Tallinn. Praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Vanad paigalduskäsud on ajalugu.

## Kasutaja kinnitatud tulemus

Kasutaja katse kinnitab hobuse ja tavakuulutuse pildilinke, hobuse pisipilti
Minu alas, avaliku galerii fotode vahetamist ja suurendamist. Peatatud hobune
kaob avalikust vaatest; peatatud kuulutuse muudatus ilmub esmalt Minu alas ja
pärast aktiveerimist avalikus vaates. Aktiveerimine säilitab senise tähtaja.
Eraldi „Uuenda kuulutust” ja kinnitus annavad uue 90-päevase tähtaja.
Neid vastuvõetud katseid ei ole vaja selle väikse paranduse jaoks korrata.

Uus muudatus taastab noolte peitumise kolme sekundi järel ning kasutab sama
kuulutuse muutmisel kasutaja varem antud faktilist kinnitust. Kasutustingimuste
uue versiooniga nõustumine on eraldi. EN/ET ja olemasolev halduse loogika säilivad.

## Üks praegune käsk

Paki **selqiro-hobuse-muutmise-viimistlus-20261108.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-hobuse-muutmise-viimistlus-20261108/uuenda.py" --publish
```

Uuendaja kontrollib eelmise hobuse halduse väljalaske privaatset eduraportit,
commiti, kõiki 1226 alusfaili ja selle eelnevat paigaldusahelat. Uus andmebaasi
muudatus on eraldi täpsete eeltingimustega tehing. Järgneb järelkontroll,
failivarukoopia, rakenduse kooste, commit ja tavaline push. Eelmised päevikud
säilivad; teadmata SQL-tulemust kontrollitakse lugemisega.

**PEATATUD** korral säilita teade, raport ja päevikud ning saada need vestlusse.

## Kaks kontrolli pärast selle commit’i Ready / Production tulemust

1. Ava avalik kuulutus ja jäta kursor pildil paigale. Nooltega navigeerimine
   peitub umbes kolme sekundi pärast ja ilmub kursori liigutamisel tagasi.
   Sama kehtib suurendatud vaates. Klaviatuuriga fookuses olevat noolt ei peideta.
2. Ava sama hobuse kuulutuse muutmine. Kui varasem kinnitus on selle kuulutuse
   ja praeguse kasutajaga seotud, kuvatakse „Väited on juba kinnitatud”. Muuda
   näiteks teksti ja salvesta ilma uut väidete linnukest tegemata.

Uue kuulutuse või puuduva sobiva kinnituse korral on esmane kinnitamine endiselt
vajalik. Muutunud avaldamistingimused tuleb läbi vaadata ja eraldi kinnitada.

## Järgmine töö

Järgnevad teenused kanoonilise `services` UUID ning sama
**Avalda → Minu ala → Muuda → Salvesta** kasutusvooga. Kohustuslikku eraldi
mustandi salvestamist ei lisata; töökuulutused järgivad sama loogikat hiljem.
Mitmesaja kuulutuse eesmärk ja otsustamata püsiv arvupiir säilivad.

Täpne leping: [horse-confirmation-reuse-v1.md](../architecture/horse-confirmation-reuse-v1.md).
Varasema töö juhend säilib [arhiivis](../archive/HOSTED_PORTAL.before-horse-edit-polish-20261108.md).
