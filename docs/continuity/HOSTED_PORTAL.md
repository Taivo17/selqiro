# Teenuste poe rubriigid ja avaliku profiili filtrid

Seis: 11.11.2026 Europe/Tallinn. Üks praegune seisukirje on
`docs/continuity/CURRENT_STATE.json`. Uus lähtepakk on kohalikult kontrollitud;
Maci paigaldus, pilveandmebaas ja uus veebiversioon on veel kinnitamata.

## Üks jätkamiskäsk

Paki `selqiro-teenuste-poerubriigid-20261111.zip` sisu lahti Downloads-kausta.
Seejärel käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-teenuste-poerubriigid-20261111/uuenda.py" --publish
```

Uuendaja kasutab olemasolevat hoidlat `/Users/taivo/selqiro` ja kinnitatud
remote’i. Enne kirjutusi kontrollib see tegelikku haru/HEAD-i, tööpuud/indexit,
lähtefaile, aluse lõpetatud raportit ja andmebaasi lepingut. Aluseks on vastu
võetud hobuste sammu commit `d5e77e963f80cb4dab33e6e6667c44d4062c4bbc`.
Uut töökausta, kontot, Supabase’i projekti või sõltuvuste paigaldust ei tehta.
Vana hobuste paigaldajat ega varasemaid prepare-käske ei korrata.

Lisanduv teenuste seos ja avalikud lugejad kontrollitakse enne ja pärast SQL-i.
Seejärel rakendatakse täpne lähtefailide delta koos dokumentidega, tehakse
build ning üks commit/push. Lõpetatud etappe jätkamisel ei korrata.
Teadmata SQL-i tulemus selgitatakse lugemisega, mitte pimesi korduskirjutusega.

## Pärast edukat raportit

1. Oota raportis näidatud **uue commit’i** Verceli **Ready / Production** tulemust.
2. Värskenda portaali. Ava üks olemasolev teenus muutmiseks, vali enda poe
   rubriik või alamrubriik ja kasuta eraldi nuppu **Salvesta rubriigid**.
3. Ava oma avaliku profiili teenuste osa, vajadusel **Vaata kõiki**. Leia ja ava
   teenus selle rubriigi kaudu. Brauseri tagasi-noolega peavad taastuma filter,
   lehekülg ja koht, kust teenuse avasid.
4. Vaata teenuste ning kuulutuste rubriigifiltrit: tühje rubriike ei kuvata;
   sisuga alamrubriigi ülemrubriik on alles. **Minu ala → Poe rubriigid** ja
   muutmisvaate valija näitavad kõiki enda rubriike.

Ühe olemasoleva teenusega katse on piisav. Lõpetatud tava-/hobusekuulutuste
paigaldusi või vastuvõtukatseid ei korrata. Selle kontrolli jaoks pole vaja
kustutada kuulutust, teenust, fotot ega poe rubriiki.

## Kui uuendaja peatub

Saada `PEATATUD`-rida ning **`SAADA SEE FAIL`** real näidatud JSON-raport.
Uuendaja teeb sellest unikaalse faili Downloads-kausta ja valib sama faili
Finderis. Nii ei pea pikka Library/Application Support rada käsitsi otsima.
Kui koopia või Finderi avamine ei õnnestu, näitab uuendaja kontrollitud
originaali või ütleb selgelt, et raportit ei saanud luua. Hoia vanad raportid alles.

## Tõendite piir

Kohalikud SQL-, kliendi- ja brauserikatsed ning lõppbuild on kirjeldatud
`SERVICE_STORE_CATEGORIES_20261111.md`-s. Paki täpse lõppmanifesti kohaliku
tarnekäigu tõend on `kontrollid/final-flow.json`. See ei ole päris Maci,
Supabase’i ega Verceli kviitung. Järgmise jooksu tegelik raport ja kasutaja
vastuvõtt täiendavad praegust seisu; väljastatud ZIP-i ei muudeta tagantjärele.
