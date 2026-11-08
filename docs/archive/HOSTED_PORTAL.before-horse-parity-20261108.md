# Hobuse kahe fotoga avaldamise jätkamine

Seis: 08.11.2026 Europe/Tallinn. Üks praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemad paigalduskäsud on ajalugu.

## Praegune alus ja parandus

Hobuse r2 paigaldus on tagastatud raporti järgi edukalt lõpetatud: lähtealus on
puhas `main` commit `6bb438519570faa0e42f56e0670e32965cfd62fb`, kokku 1165 faili.
Hobuse vana r1 peatus ei ole praegune seis. Hobusepaketti ega varasemaid foto- ja
keelepakette ei käivitata uuesti.

Kahe uue foto ruumikeelu põhjus on tuvastatud: senine tehniline arvestus liitis
175 MiB koristamist ootavaid algfailireserve ja 84 MiB juba avaldatud
veebipildireserve. Kaks uut fotot lisasid 58 MiB; vana kontroll sai 317 MiB.
Uus parandus käsitleb 300 MiB läve ajutise üleslaadimistöö kaitsena.
Avaldatud galeriipildid seda arvestust ei kasvata, nii et sama kahe foto
kontroll on enne koristamist 233 MiB. Kontole püsivat 300 MiB tootepiiri ega
kuulutuste arvu piiri ei kehtestata.

## Miks ruumiparandusel on uus r2

Esimese ruumipaketi tagastatud `result.json` näitab eelkontrolli peatust enne
SQL-i rakendamist, lähtefailide uuendamist, build'i ja avaldamist. Kohalikust
kontrollalusest puudusid 17 varem paigaldatud privaatset funktsiooni. Nende
täpsete määratluste ja õiguste taastamine säilitatud lähtekoodist reprodutseerib
raporti funktsioonide ja koondsõltuvuste räsid. R2 parandab kontrollalust; rakenduse tööloogika
ja kolm SQL-moodulit säilivad. Vana paketi ega peatunud päeviku kustutamist
pole vaja. Täpne tõend on [UPLOAD_CAPACITY_20261108.md](UPLOAD_CAPACITY_20261108.md).
R2 ruumiparanduse paigaldust ega Ready tulemust pole veel kinnitatud.

## Üks praegune käsk

Paki **selqiro-uleslaadimise-ruum-20261108-r2.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-uleslaadimise-ruum-20261108-r2/uuenda.py" --publish
```

Paigaldaja kontrollib eduka hobuse r2 privaatset tulemust, täpset lähtepuud,
haru, indeksit ja kinnitatud remote'i. SQL-i uus võime paigaldatakse
kontrollitud tehingus; järgnevad failivarukoopia ja uuendus, build, piiratud
commit ja tavaline push. Päevikud ja varasemad varukoopiad säilivad.

**PEATATUD** korral säilita teade, raport ja päevikud ning saada teade koos
raportiga vestlusse. Tundmatu lähte- või andmebaasiseisu korral kontrolli ei
nõrgendata ega varasemat paigaldust oletuse järgi korrata.

## Jätka sama kahe fotoga toimingut pärast Ready tulemust

1. Oota terminalis näidatud uue commit'i **Ready / Production** tulemust.
2. Värskenda senist hobuse lisamise lehte.
3. Vajuta **Kontrolli salvestatud tulemust**.
4. Kui vorm küsib algfaile, vali **Vali algfotod** kaudu need samad kaks fotot.
5. Vajuta **Jätka** ja kontrolli pärast avaldamist, et mõlemad fotod on näha
   hobuse kuulutuse avalikus vaates.

Säilitatud toiming jätkab sama käsu ja võtmega ka siis, kui esialgne ruumikeeld
jättis serverisse toimingu loomata. Selle jätkamiseks pole vaja päevikut
käsitsi kustutada ega uut dubleerivat kuulutust luua.

## Säiliv suund ja järgmine töö

Kasutaja eesmärk on mitusada kuulutust kontol; täpne püsiv arvupiir on otsustamata.
Kolme korraga avatud ja 20 uue toimingu/24 h kasutuselevõtukaitsed on sellest
eraldi ning vajavad edaspidi tooteotsust. Piiratud avaldatud algfailide
lõpetamine ei ole kogu portaali püsiv terminalne taustakoristus.

English/Eesti valik, Frankfurt `fra1` ja varem vastu võetud üks 9-sekundiline
fotolisamine säilivad. Teenused ühendatakse järgmisena kanoonilise `services`
UUID peale: sisestamine → **Avalda**, hiljem Minu ala → **Muuda** →
**Salvesta muudatused**, ilma kohustusliku eraldi mustandisalvestuseta.
Töökuulutused järgivad sama loogikat hiljem.

Tõend ja tehniline leping:
[UPLOAD_CAPACITY_20261108.md](UPLOAD_CAPACITY_20261108.md) ning
[upload-capacity-v1.md](../architecture/upload-capacity-v1.md).
