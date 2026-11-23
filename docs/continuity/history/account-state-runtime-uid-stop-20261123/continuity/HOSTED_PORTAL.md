# Konto oleku paigalduse eraldi jätk

23.11.2026 Europe/Tallinn. V1 60 faili on Macis rakendatud ja 20 testi läbisid.
Build-käsk väljus 0, kuid lõppkoristus jäi kinnitamata; SQL, commit/push ei alanud.
Selle jätku lähtekoht on täpne STOP-raport ja sama 034211d alus, mitte puhas tööpuu.

## Üks praegune käsk

Paki selqiro-konto-oleku-jatk-20261123.zip Downloads-kaustas lahti.
Kui kohalik arendusserver on sinu terminalis töös, peata see oma aknas Ctrl+C-ga.
Jäta olemasolevad failid, indeks, vanad kaustad ja päevikud alles.

```bash
python3 -I -B "$HOME/Downloads/selqiro-konto-oleku-jatk-20261123/jatka.py" --publish
```

Jätk kontrollib algse paigalduse täpset järelseisu ja vanu originaaltõendeid,
sama haru/HEAD-i/indeksit/kogu lähtekoodi/remote'i ning olemasolevaid sõltuvusi.
Praegust protsessiseisu vaadeldakse enne kirjutusi, enne uut build'i ja
pärast build'i enne andmebaasi. Ebaselguse või aktiivse seotud
arendus-/ehitusprotsessi korral jätk peatub. Olemasolevaid
arendus- või ehitusprotsesse jätk ei lõpeta.

20 testi tulemus võetakse samade rakenduse/testi baitide ja täpse vana logi
alusel uuesti kasutusele. Build tehakse ühe uue kontrollitud käiguna, sest
vana build-passed.log, parsed proof ja artefaktide kinnitus jäid salvestamata.
Konto UI, serveri SQL ja senised õiguskontrollid selles jätkus ei muutu.
Dokumendid saavad peatumise ja jätku õige kirje.

Pärast build'i ja uut lähtekoodi kontrolli teeb jätk seni alustamata
andmebaasi preflight'i, ühe lisava SQL-i, järelseisu kontrolli ning ainult
paketi failide commit/push'i. Uue commit'i pealkiri on
Add private active account state foundation; tegelik räsi tuleb Maci raportist.
SQL võib olla juba paigaldatud, kui sellele järgnev Git samm peatub;
seda eristab päevik ja ebaselget apply'd ei korrata automaatselt.

## Raport

Saada täpselt SAADA SEE FAIL: juures näidatud uus privaatne raport.
Finder avatakse selle faili juures. Varasemaid originaale ja koopiaid säilitatakse.
Koopia vea korral näidatakse kontrollitud originaali; Finderi vea korral
täpset asukohta. Viimase salvestuse tõrke järel märgitakse allesjäänud raport
võimalikuks aegunud tõendiks. Raporti puudumisel saada PEATATUD-rida.

Vana peatumismärget ega raporteid käsitsi ei muudeta. Vana uuendaja uut käiku,
Git reset/restore'i või käsitsi SQL-i selle jätku jaoks ei kasutata.

## Sama commit'i Ready / Production järel

1. Värskenda portaali.
2. Ava Minu ala → Minu konto ja kontrolli e-posti, Aktiivne olekut ning teadaolevat algset loomiskuupäeva.
3. Kontrolli sama vaate avamist päise menüüst.
4. Logi sisse teise olemasoleva kontoga ja kontrolli selle konto andmeid.
5. Vaata kitsas aknas üle tekst ja tagasitee.

Konto loomist või kustutamist selle kontrolli jaoks pole vaja. SMTP, e-posti
kinnitamine ja registreerimise uue vaate paigaldus on endiselt pausil.
Konto oleku vundament lubab veel ainult active olekut; sulgemise/taastamise/
kustutamise toimingud järgnevad eraldi. Otsene Auth konto kustutamine jääb
olekurea paigaldamise järel ON DELETE RESTRICT tõttu tõkestatuks.
