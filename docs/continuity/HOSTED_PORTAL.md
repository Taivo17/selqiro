# Poe rubriigid — järgmine jätkusamm

Seis: 10.11.2026 Europe/Tallinn. Üks autoriteetne seis on
`docs/continuity/CURRENT_STATE.json`. See samm ühendab olemasolevad poe rubriigid
tavakuulutuse praeguse muutmisvaatega.

## Üks käsk

Paki `selqiro-poerubriigid-20261110.zip` Downloads-kausta lahti. Seejärel:

```bash
python3 -I -B "$HOME/Downloads/selqiro-poerubriigid-20261110/uuenda.py" --publish
```

Uuendaja kontrollib olemasoleva `~/selqiro` hoidla tegelikku main-haru, HEAD-i,
kogu indexit, tööpuud, lähtefaile ja kinnitatud remote'i. Aluseks on lõpetatud
teenuste tagasitee jooksu täpne privaatne raport ning sõltumatud Giti puu,
parent'i ja diffi kontrollid. Kuvatõmmiselt kinnitatud `429ace2` ja `26e468e`
ei laiendata oletatud täiscommit'ideks; täisväärtused loetakse ja kontrollitakse
Macis. Esialgset paigaldajat või varasemat diagnostikat ei korrata.

Kontrollitud muudatustest tehakse privaatsed varukoopiad. Uuendaja rakendab
ainult paki räsikaitsega lähtefailid, käivitab build'i ning teeb ühe commit'i
ja tavalise push'i. Uue commit'i pealkiri on
**Connect store categories to listing editor**. Täisräsi ilmub terminalis.
SQL-i, Supabase CLI-d, Storage'i toiminguid ega sõltuvuste paigaldust ei tehta.

## Pärast terminali VALMIS-rida

1. Oota Vercelis just terminalis näidatud uue commit'i **Ready / Production** tulemust.
2. Värskenda portaali. Ava **Minu ala → Kuulutused → Muuda** ühe avalikult nähtava tavakuulutuse juures.
3. Jaotises **Poe rubriigid** vali selle aktiivse identiteedi olemasolev rubriik
   või alamrubriik ja vajuta **Salvesta rubriigid**.
4. Ava oma avalik profiil, vali sama rubriik ja kontrolli kuulutuse nähtavust.
   Ülemrubriigi tulemused hõlmavad ka alamrubriikidesse seotud kuulutusi.
5. Muuda valikut või tühjenda ja salvesta. Tühjendamisel kaob rubriigiseos;
   kuulutus jääb Kõik-vaatesse ning selle tekst, hind ja fotod säilivad.

Rubriikide salvestus on eraldi tegevus. Selles sammus saab valida olemasolevaid
rubriike. Integreeritud Minu alas loomise, ümbernimetamise ja kustutamise
halduse avamine vajab eraldi identiteediga seotud lepingut; tühja rubriigiloendit
näidatakse ausalt. Hobuste ja teenuste rubriigiseosed vajavad oma andmemudelit.

## Peatumise korral

Säilita **PEATATUD**-rida ja lisa vestlusse fail, mille täpne tee on real
**SAADA SEE FAIL:**. Uuendaja loob võimalusel Downloads-kausta privaatse,
unikaalse JSON-koopia ja valib sama faili Finderis. Koopia või Finderi vea
korral näidatakse kontrollitud originaali asukoht või täpne juhis.
Puuduvast või võimalikust vananenud raportist antakse eraldi teada.
Varasemaid päevikuid, faile ega pakke ei kustutata ega muudeta.

## Säiliv vastuvõtt ja tõendi piir

Teenuste tagasitee on kasutaja poolt vastu võetud nii profiililt kui avalikust
teenuseloendist. 09.11 kuvatõmmis näitab `429ace2` Ready / Production ja
varasemat foto/profiiliparandust `26e468e` Ready / Production. Seda vastuvõttu
pole vaja selle sammu jaoks uuesti korrata.

Uus rubriikide lähtepakett, Macis rakendatud töö, commit/push, Verceli Ready
ning tegelik rubriigi kasutus on eraldi tõendid. Lähtekood ja kohalik kontroll
on ettevalmistus; uut Maci/GitHubi/deployment'i tulemust pole veel nähtud.
Kohaliku kontrolli täpne ulatus on `STORE_CATEGORIES_20261110.md`-s ja
väljastatud paki `kontrollid` kaustas.
