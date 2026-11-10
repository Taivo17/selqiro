# Hobusekuulutuse poe rubriigid — üks järgmine käsk

Seis: 10.11.2026 Europe/Tallinn. Uus lähtepakk on kohalikult kontrollitud;
Maci rakendus, uus commit/push, andmebaasi paigaldus ja deployment on veel
kinnitamata. Üks seisukirje on `docs/continuity/CURRENT_STATE.json`.

Varasem tavakuulutuse rubriigihaldus ja õigusteparanduse järgne salvestus/profiili
kasutuskontroll on vastu võetud. Neid paigaldajaid ega läbitud katseid ei korrata.

## Paigaldus

Laadi `selqiro-hobuse-poerubriigid-20261110.zip` alla ja paki Downloads-kausta
lahti. Seejärel käivita terminalis üks käsk:

```sh
python3 -I -B "$HOME/Downloads/selqiro-hobuse-poerubriigid-20261110/uuenda.py" --publish
```

Siht on olemasolev `/Users/taivo/selqiro`, haru `main`, alus
`adfa3ae767712b5f71e9fac2d963a765f61fb444`. Uuendaja kontrollib tegelikku
HEAD-i, täielikku lähtepuud/indexit, tööpuud, kinnitatud remote'i, eelmise
lõpetatud jooksu privaatraportit ning vajalikke andmebaasilepinguid enne kirjutusi.
Uut worktree'd ega algset portaali paigaldajat ei käivitata.

Uus lisanduv SQL ja eraldi järelkontroll tulevad enne lähtefailide rakendamist,
build'i ning commit/push'i. Vana profiili v1 lugemisleping säilib; uus klient
kasutab v2. Pakk toob kaasa ka viimase vastuvõtu dokumentide delta.

## Pärast edukat jooksu

1. Oota Vercelis terminali näidatud **uue commit'i** `Ready / Production` tulemust.
2. Värskenda portaali ja ava Minu alas üks olemasolev avalik hobusekuulutus muutmiseks.
3. Vali kaardil „Poe rubriigid” üks enda olemasolev rubriik või alamrubriik ja
   vajuta „Salvesta rubriigid”. Hobuse sisu ega avaldamist pole selleks vaja salvestada.
4. Ava sama kasutaja avalik profiil ja vali sama rubriigi filter. Hobune peab
   olema leitav ning kaardilt peab avanema sama hobusekuulutus.

See on uue hobuste kasutustee vastuvõtt; varasemat tavakuulutuse CRUD-katset ei
korrata. Katseks ei ole vaja hobust, fotot ega rubriiki kustutada.

## Kui käsk peatub

Saada **PEATATUD-rida ja fail, mille tee on real SAADA SEE FAIL**. Uuendaja
valib sama unikaalse JSON-faili Finderis. Kui koopia või Finderis valimine ei
õnnestu, näitab uuendaja alles oleva kontrollitud raporti teed või ütleb, et
raportit ei loodud. Hoia algsed päevikud alles.

Teadmata SQL-i tulemust kontrollitakse lugemisega; automaatset teist rakenduskatset
ei tehta. Edukalt lõpetatud sammu jätk ei korda. Tuvastatud kasutaja muudatused,
indexi erinevus või võõras remote peatavad uuendaja enne uusi kirjutusi.

Täpne lähte-/testi-/pilvepiir on `HORSE_STORE_CATEGORIES_20261110.md`-s.
