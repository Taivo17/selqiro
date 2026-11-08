# Hobuse galerii ja 90-päevane haldus

Seis: 08.11.2026 Europe/Tallinn. Üks praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemaid paigaldusi ei korrata.

## Kasutaja kinnitatud tulemus

Hobuse „hobutest” avalikus vaates on kaks fotot. Kuulutus on näha ka ühises
avalikus otsingus ja Minu alas. Kasutaja uued ekraanipildid kinnitavad seda
brauseritulemust. Ruumiparanduse r2 uus commit ja privaatne eduraport ei ole
vestluses eraldi eksporditud; uus uuendaja kontrollib neid Macis enne muutmist.
Säilitatud täpne r2 lähtekood sisaldab 1193 faili.

Käesolev uuendus lisab puuduva galerii edasi-tagasi vahetamise ja suure vaate,
hobuse pisipildi ning samad staatuse, tähtaja, uuendamise ja muutmise valikud
nagu tavakuulutustel. Ka tavakuulutuse pilt avab sama sihi kui pealkiri.

## Üks praegune käsk

Paki **selqiro-hobuste-haldus-20261108.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-hobuste-haldus-20261108/uuenda.py" --publish
```

Uuendaja kontrollib eduka ruumiparanduse r2 privaatset tulemust, selle tegelikku
commiti ja kogu lähtepuud, töökausta, indexit ja kaug-main'i. Seejärel teeb ta
kontrollitud SQL-tehingu, järelkontrolli, failivarukoopiad, lähteuuenduse,
build'i, täpse commit'i ja tavalise push'i. Teadmata SQL-tulemust kontrollitakse
lugemisega; seda ei rakendata pimesi uuesti.

**PEATATUD** korral säilita teade, raport ja päevikud ning saada need vestlusse.
Kaitseid, paigalduspäevikuid ega varukoopiaid ei kustutata.

## Vastuvõtt pärast Ready / Production tulemust

1. Värskenda portaali ja ava Minu ala. Kontrolli hobuse pilti ning ava sama
   aktiivne avalik kuulutus pildist ja pealkirjast. Tee pildilingi kontroll ka
   tavakuulutusega.
2. Vaheta hobuse fotosid noolte või pisipiltidega, ava suur vaade, vaheta fotot
   seal ning sulge vaade. Kitsas vaates kontrolli ka puuteliigutust.
3. Vali hobusel Peatatud. Avalik detail ja otsing peavad seda peitma; Minu ala
   peab säilitama omaniku foto ja Muuda võimaluse.
4. Vali uuesti Aktiivne. See ei pikenda tähtaega. „Uuenda kuulutust” kinnitab
   eraldi, et pakkumine on alles, ning annab uue 90-päevase perioodi.
5. Kontrolli soovi korral sama haldusvaadet English-keeles.

Seniste tähtajata hobuste 90 päeva arvestatakse algsest avaldamise hetkest.
Aegunud aktiivset rida näidatakse Aegunud olekus. Sisu salvestamine ei aktiveeri
peatatud/müüdud kuulutust ega uuenda aegunud tähtaega.

## Järgmine töö

Pärast selle muudatuse vastuvõttu ühendatakse teenused kanoonilise `services`
UUID ja sama **Avalda → Minu ala → Muuda → Salvesta** loogikaga. Kohustuslikku
eraldi mustandi salvestamist ei lisata. Töökuulutused järgnevad hiljem.

Mitmesaja kuulutuse eesmärk ja otsustamata püsiv arvupiir säilivad. Käesolev
muudatus ei muuda ajutise üleslaadimisruumi arvestust ega olemasolevaid
kasutuselevõtu sageduskaitseid. English/Eesti ning Frankfurt fra1 säilivad.

Täpne leping: [horse-owner-lifecycle-v1.md](../architecture/horse-owner-lifecycle-v1.md).
Eelmise töö juhend säilib ainult ajaloona:
[HOSTED_PORTAL.before-horse-parity-20261108.md](../archive/HOSTED_PORTAL.before-horse-parity-20261108.md).
