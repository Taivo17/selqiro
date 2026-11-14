# Praegune samm: peitmise ja blokeerimise menüü avalikule profiilile

13.11.2026 Europe/Tallinn. `40ceac78` andmebaasitugi, Maci build, commit/push
ning sama commit’i Vercel Ready / Production on kinnitatud. Kasutaja pole
peitmise/blokeerimise toiminguid veel katsetanud.

Uus kinnitatud paigutus koondab ühise menüü avalikule profiilile ning eemaldab
selle tava-, hobuse- ja teenusekaartidelt. Sõnumivestluse senine blokeerimine
ja Minu ala tagasivõtmine/haldus säilivad. Vaatamiskoguse lävendit ega uut
jälgimist ei lisata. See uus UI-parandus pole veel Macis rakendatud.

## Üks uus käsk

Paki `selqiro-peitmine-profiilile-20261113.zip` Downloads-kausta lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-peitmine-profiilile-20261113/uuenda.py" --publish
```

Runner kontrollib olemasoleva `/Users/taivo/selqiro` main-haru, täpset
`40ceac78deb255d8006244ae232652956b92bea0` HEAD-i, kogu 1696 faili alust,
tervet indexit/tööpuud ja kinnitatud remote’i. Ta loeb viimast edukat
paigalduspäevikut ning hoiab selle olemasolevat lukku ainult lugemiseks
avatuna läbi lähtefailide muutmise, buildi, commit’i ja push’i. Muutunud
alus või kasutaja töö peatab automaatse jätku.

Rakendatakse ainult selle uue paki lähte-/dokumendimuudatused. Asendatavad
failid varundatakse, tehakse build ning kontrollitakse täpset commit/push’i.
Andmebaasi- ja Supabase CLI-kutseid on selles sammus **0**. Juba kinnitatud
SQL-tuge, vana paigaldajat, taastajaid ega probe’i ei käivitata uuesti.

## Saada selle jooksu täpne raport

Lõpus kuvatakse `VALMIS` või `PEATATUD` ja:

```text
SAADA SEE FAIL: <selle jooksu täpne absoluutne JSON-tee>
```

Finder valib sama unikaalse privaatse Downloads-koopia. Saada täpselt see
fail; vana raportit ei valita kaustast uusima faili otsimisega. Kõik varasemad
päevikud ja koopiad säilivad. Kopeerimisvea korral näidatakse kontrollitud
originaali; Finderi tõrke korral kasuta prinditud rada. Kui raportit ei loodud,
saada `PEATATUD`-rida. Võimalikult aegunud püsiraport saada koos peatuse reaga.

Peatumisel vaadatakse üle selle konkreetse jooksu tõend. SQL-i ega vanu
paigaldajaid ei korrata. Kontosid, kuulutusi, pilte, sõnumeid, päevikuid,
intente, raportikoopiaid ja väljastatud pakke ei kustutata.

## Pärast uue commit’i Ready / Production tulemust

1. Värskenda portaali ja kontrolli, et tava-, hobuse- ja teenusekaartidel
   ühiseid peitmise/blokeerimise menüüsid enam ei ole.
2. Ava teise olemasoleva kontoga pakkuja avalik profiil. Ühes menüüs peavad
   olema **Peida pakkuja 24 tunniks** ja eraldi **Blokeeri kasutaja**.
3. Peida pakkuja profiililt. Tema pakkumised peavad selle konto otsingust ja
   avastamisest kaduma; teadlikult avatud profiil ja sõnumiajalugu säilivad
   tavapäraste õigustega. **Võta tagasi** või Minu ala **Näita uuesti** taastab
   pakkumised.
4. Kontrolli eraldi blokeerimist ja selle eemaldamist. Uued sõnumid on bloki
   ajal keelatud mõlemas suunas, ajalugu säilib. Ühe konto bloki eemaldamine
   ei eemalda eraldi peitmist ega teise konto seatud blokki.

Oma profiili ja võõra profiili õigused tulevad samast olemasolevast serveri
lepingust. Testi jaoks ei muudeta tootmise kellaaega ega kustutata sisu.
Täpne 24 tunni piir säilib varasema SQL-tõendi ulatuses; päris aegumine
kinnitatakse hilisemas kasutuses. Üks praegune seis on `CURRENT_STATE.json`;
uus paigutuse otsus ja ajalooliste tõendite piir on
`VIEWER_PROVIDER_CONTROLS_20261113.md` viimases sissekandes.
