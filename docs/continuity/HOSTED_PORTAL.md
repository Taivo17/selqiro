# Foto valimine — olemasoleva portaali uuendus

Seis: 07.11.2026 Europe/Tallinn. Üks autoriteetne seis on
[CURRENT_STATE.json](CURRENT_STATE.json).

## R2 parandab väljastatud ZIP-i koosseisu

Esimene ZIP oli kasutajal lahti pakitud. Peatuse `PACKAGE_EXTRA_FILE_REFUSED`
põhjus oli kaks assistendi lisatud .log tõendifaili, mida uuendaja pakireeglid
ei luba. Peatus toimus enne hoidla muutmist ja uue jooksupäeviku loomist;
selle vea kohta eraldi result.json-i ei teki.

R2 tarnib need samad tõendid .md dokumentidena, jättes rakenduskoodi ja
uuendaja kontrollid samaks. Paki r2 eraldi kausta; vana kausta ega sealsete
failide käsitsi muutmist pole vaja. Väljastatud vana ZIP ja päevikud säilivad.

## Mida see samm teeb

Nähtav foto valimise nupp avab kohe seadme failide/fotode valija. Eraldi
brauseri `Choose File` nuppu enam vahepealse sammuna ei näidata. Sama kehtib
nupu „Lisa järgmine foto” kohta. Valiku katkestamine säilitab lõpetatud
lisamise ja selle jätkamiskirje; uut faili saadetakse alles eraldi kinnitusega.

Ajutise piirangu teade eristab konto pooleliolevaid lisamisi, viimase 24 tunni
katsete piiri ja vaba üleslaadimisruumi. Aktiivse galerii piir jääb kümneks.
Piiri muutmist ega konto konkreetse keeldumise põhjust ette ei oletata.

Uus pakett on **selqiro-foto-valik-20261107-r2.zip**. See sisaldab ka inglise
põhikeele/eesti teise keele püsivat otsust ning V2 keelekatvuse auditit.
Täielik V2 tõlkimine ja edasine jõudlusparandus on eraldi töö.

## Üks jätkamiskäsk

1. Laadi uus ZIP Maci Downloads-kausta ja paki lahti. Seal peab tekkima
   `selqiro-foto-valik-20261107-r2` kaust, mille sees on `uuenda.py`.
2. Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-foto-valik-20261107-r2/uuenda.py" --publish
```

Uuendaja leiab vahetult eelneva eduka fotode kiirenduse raporti ja kontrollib
selle commit’i sõltumatult tegeliku Giti ajaloo ning täpsete lähtepuudega.
Kontrollitakse ka main-haru, HEAD-i, tööpuud/indexit, kõiki lähtifaile ja
kinnitatud remote’i. Siht on senine `/Users/taivo/selqiro`; uut hoidlat ega
worktree’d ei looda. Varem edukalt lõpetatud paigaldajaid ei korrata.

See on ainult lähtekoodiuuendus: vajalik build ning üks kontrollitud
commit/push. SQL-i, Supabase CLI-d ega Storage’i ei käivitata. Kasutaja
päevikud ja kõrvalised muudatused säilivad. `PEATATUD` korral saada täpne
rida ja raport; ära muuda räsikaitset ega kustuta päevikuid. Sama eduka sammu
uuesti käivitamine ei korda kinnitatud build’i ega push’i.

## Üks kasutuskatse

Pärast uuendaja edukat lõppu oota Vercelis **sama uue commit’i Production
Ready** tulemust ja värskenda portaali. Kuulutuse muutmisel peab „Vali foto”
või „Lisa järgmine foto” avama kohe seadme valija. Faili valimine näitab
kohalikku eelvaadet; „Lisa kuulutusele” alustab saatmist.

Proovi senise viie fotoga kuulutusele üht lisamist. Kui piirang kordub,
saada uus täpne kasutajateade. Olemasolevaid fotosid ega päevikuid selle
jaoks kustutada ei ole vaja. Varasemat tervet kasutuskatsete sarja ei korrata.

## Aeg ja keel

Uued kasutaja stopperiajad on 17 ja 19 sekundit. Varasem 27–31 sekundit oli
ligikaudne loendus. Failide/võrgu samasus pole kinnitatud; kindlat ajavõitu
nende põhjal ei lubata. Edasiseks kiirenduseks kasutatakse olemasolevaid
piiratud etapimõõtmisi, säilitades õiguste ja faili kontrollid.

Inglise põhikeel ja eesti teine keel on nõue. V2 sisaldab veel püsivalt
eestikeelseid tekste, seega ingliskeelse profiili täielik V2 katvus ei ole
valmis. Järgmine keeleetapp ühendab ühe tervikliku kuulutuse kasutustee
olemasoleva tõlkeabiga; vt `architecture/interface-language-v1.md`.

Koristuse tehnilised paneelid jäävad testimise ajal seniseks. Automaatne
lõpetamine ja nende eemaldamine tavakasutaja vaatest on vajalik enne
üldist avalikku avamist.
