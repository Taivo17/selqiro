# Konto oleku jätk — Maci UID-kontrolli parandus r2

23.11.2026 Europe/Tallinn. Esimene jätk peatus kell 16:54 enne lähtefailide
kirjutamist, uut build'i ja andmebaasi. Algse kontooleku paigalduse 60 faili
on tööpuus ja 20 testi PASS säilib. Viga oli Maci protsesside reaalse ning
efektiivse kasutajatunnuse võrdlemises. Selle jaoks on eraldi r2 pakett.

## Üks praegune käsk

Paki selqiro-konto-oleku-jatk-20261123-r2.zip Downloads-kaustas lahti.
Kui Selqiro kohalik arendusserver on sinu terminalis töös, peata see oma
aknas Ctrl+C-ga. Jäta kõik olemasolevad failid, vanad kaustad ja päevikud alles.

```bash
python3 -I -B "$HOME/Downloads/selqiro-konto-oleku-jatk-20261123-r2/jatka.py" --publish
```

R2 kontrollib täpset v1 60-failist lähtepuud, haru/HEAD-i, indeksit, remote'i,
sõltuvusi ning nelja varasemat originaalraportit. Esimese jätkupaki dokumente
Maci eelseisus ei eeldata. Mõlemad varasemad STOP-raportid ja nende lukud
avatakse ainult lugemiseks; r2 kasutab eraldi uut päevikut.

Maci protsessivaatlus eristab nüüd ruid ja uid välju. Sama reaalse kasutaja
muu efektiivse kasutajatunnusega kõrvaline protsess ei põhjusta enam ekslikku
UID-skoobi viga. Seotud arendus-/ehitusprotsessi või ebaselge vaatluse korral
jätk peatub. Olemasolevaid arendus-/ehitusprotsesse jätk ei lõpeta.

20 rakendusetesti tulemus kontrollitakse täpsest vanast privaatsest logist;
testiprotsessi uuesti ei käivitata. Üks uus build on endiselt vajalik,
sest algse 14:38 käigu täielik build-logi ja artefaktitõend jäid salvestamata.
Esimene jätk ei jõudnud uut build'i alustada.

Pärast edukat build'i teeb r2 seni alustamata andmebaasi preflight'i, ühe
lisava SQL-i, järelseisu kontrolli ning ainult paketi failide commit/push'i.
Commit'i pealkiri on Add private active account state foundation; tegelik
räsi tuleb uuest Maci raportist. SQL võib olla paigaldatud juba enne hilisemat
Giti peatumist; päevik eristab neid etappe ja ebaselget kirjutamist ei korrata.

## Raport

Saada täpselt SAADA SEE FAIL: juures näidatud uus privaatne raport.
Finder avatakse selle faili juures. Koopia vea korral näidatakse kontrollitud
originaali, Finderi vea korral täpset asukohta. Salvestustõrke järel märgitakse
viimane säilinud raport võimalikuks aegunud tõendiks. Kui raportit ei loodud,
saada terminali PEATATUD-rida.

Vana kontooleku uuendaja ega esimene jätkaja pole praegused käsud.
Raporteid, lõppkoristuse märkeid ega indeksit käsitsi ei muudeta.

## Sama uue commit'i Ready / Production järel

1. Värskenda portaali ja ava Minu ala → Minu konto.
2. Kontrolli konto e-posti, Aktiivne olekut ja teadaolevat algset loomiskuupäeva.
3. Kontrolli sama vaate avamist päise menüüst.
4. Logi sisse teise olemasoleva kontoga ja kontrolli selle konto andmeid.
5. Vaata kitsas aknas üle tekst ning tagasitee.

Konto oleku vundament lubab veel ainult active olekut. Konto sulgemise,
taastamise ja kustutamise toimingud järgnevad eraldi; SMTP, e-posti kinnitamise
ning registreerimisvaate paigaldus on endiselt pausil. Otsene Auth-konto
kustutamine on olekurea paigaldamise järel ON DELETE RESTRICT tõttu tõkestatud.
