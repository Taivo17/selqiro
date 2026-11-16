# Praegune samm: varem loetud seisu selge tähistus

15.11.2026 Europe/Tallinn. Viimane vastu võetud Maci commit on
`3aaebc6d663e6d11c02c49bed502b32ed4312852`; selle SQL-parandus, push ning
Ready / Production on kinnitatud. Kasutaja võttis 15.11 vastu kahe vahelehe
katse: vana kinnituse järel jäi uus blokeering alles. See töö on lõpetatud.

Uus pakett muudab jagatud dialoogi seisukirjeldust. Varasema seisupildi kohal
on „Varem loetud seis” ja selgitus, et see ei kinnita praegust seisu. Eduka
lugemise järel on „Seis viimase kontrolli ajal”. Kui vana sihtrida puudub,
eelistuste kokkuvõtet ei näidata. Unknown ja konflikt jäävad eraldi tulemusteks.

## Üks järgmine käsk

Paki `selqiro-salvestatud-seisu-teade-20261115.zip` Downloads-kausta lahti:

```bash
python3 -I -B "$HOME/Downloads/selqiro-salvestatud-seisu-teade-20261115/uuenda.py" --publish
```

Käsk kontrollib tegelikku main-haru, täpset 3aaebc6 alust, kogu indexit,
tööpuud, lähtefaile ja kinnitatud remote’i. Eelmise eduka SQL-paranduse
päevikut loetakse hoitud luku all ning säilitatakse baiditäpselt. Rakendatakse
ainult 19 üle vaadatud faili, käivitatakse üks uus 7-juhuline sihttest ja
muudetud kliendi build, seejärel luuakse täpse ulatusega commit ning tehakse push.
Maci olemasolevaid lukustatud sõltuvusi kasutatakse paigaldamise või uuendamiseta.

Uuendajal ei ole SQL-i, Storage’i, teenuste ühendamise ega vana paigalduse
kordamise sammu. Uus väljaanne kasutab eraldi päevikut. Kui sama jooksu
lõpetamine katkeb, kontrollitakse tegelikku seisu ning lõpetatud etappe ei
korrata. Tundmatu protsessi või avaldamise tulemus peatab automaatse jätku.

## Saada selle jooksu täpne raport

Terminal näitab ja Finder valib selle jooksu faili:

```text
SAADA SEE FAIL: <selle jooksu absoluutne JSON-tee>
```

Saada just see unikaalne privaatne Downloads-koopia. Kui kopeerimine ei
õnnestu, näidatakse kontrollitud originaali; kui Finder ei avane, on täpne
tee terminalis. Kui raportit ei loodud, saada `PEATATUD`-rida. Võimalikult
aegunuks märgitud raportiga saada ka peatumisrida. Ära kustuta ega nulli päevikuid.

## Veebiversiooni kontroll

Pärast edukat raportit peab Vercelis olema **sama uue commit’i Ready /
Production**. Seejärel värskenda portaali. Kontrolli ainult, et edukalt loetud
seisu pealkiri on „Seis viimase kontrolli ajal”. Kui toimingu tulemus jääb
ebakindlaks, peab varasema info juures olema „Varem loetud seis”; automaatset
korduskirjutust ei lisandu. Varem vastu võetud blokeeringu ja peitmise katset
pole vaja uuesti teha.

## Tõendi piir

Kohalik 7-juhuline test ja täielik build läbisid. Tegelik brauserikontroll jäi keskkonna piirangute tõttu tegemata. Kohalik Chromium peatus socket()-õiguse vea tõttu enne ühegi testijuhu käivitumist. Lubatud CDP-brauser ei pääsenud kohaliku HTTP-serverini ning selle file-URL katse keelas brauseri turvapoliitika. Edasised brauserikatsed lõpetati; käesolevat kasutajaliidese tulemust pärisbrauseris ei ole kinnitatud.
Pakendi lõplikud tõendid on `kontrollid/` all. Need ei ole uue Maci jooksu,
live-remote’i ega Verceli deployment’i kviitung.

Üks autoriteetne seis on `CURRENT_STATE.json`; sellest genereeritakse
`docs/99_V2_HANDOFF_NEXT_CHAT.md`. Täpne muudatuse ja varasema vastuvõtu piir
on `PROVIDER_STATE_FEEDBACK_20261115.md`-s. Ajaloolised SQL-juhendid ei ole
praegused käivitamiskäsud.
