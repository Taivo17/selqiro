# Konto aluse ainult lugemise kontroll

22.11.2026. Käesolev kontrollpakk on uus ja Macis veel käivitamata.
Vastu võetud rakenduse alus on `034211d`. Lõpetatud tööloendi parandust ei korrata.

## Üks käsk

Paki `selqiro-konto-aluse-kontroll-20261122.zip` Downloads-kaustas lahti.
Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-konto-aluse-kontroll-20261122/kontrolli.py"
```

Käivitaja kontrollib olemasolevat `/Users/taivo/selqiro` hoidlat ja kinnitatud
remote'i. Ta teeb olemasoleva CLI kaudu ühe piiratud ainult lugemise
metaandmepäringu samasse Supabase projekti. Portaali allikaid, indeksit,
andmebaasi skeemi, kasutajaandmeid või Auth/SMTP seadistusi ei muudeta;
build'i, paigaldust, commit/push'i ega Verceli avaldamist ei tehta.

## Saada selle käigu raport

Terminal kuvab `SAADA SEE FAIL: <täpne absoluutne failirada>` ja valib sama
unikaalse privaatse raportikoopia Finderis. Saada see JSON-fail siia.
Originaalpäevik ja varasemad koopiad säilivad.

Kui ilmub PEATATUD, säilita seis ja saada näidatud raport. Kui raportit ei
loodud või kontrollitud raportit ei saa näidata, saada PEATATUD-rida.
Ära käivita kontrolli uuesti ega tee käsitsi parandusi vea oletuse põhjal.

See raport on alus järgmisele konto oleku/sulgemise moodulile. Edukas vaatlus
ei tähenda veel, et konto kustutamine on rakendatud. Uue registreerimise ja
SMTP kasutuselevõtt jäävad kokkulepitud domeenietappi.

Dokumentide ettevalmistatud delta ja varasem ajalugu on paketis kaasas;
käivitaja neid hoidlasse ei paigalda. Üks praegune seis on CURRENT_STATE.json
ning üleandmine genereeritakse sellest.
