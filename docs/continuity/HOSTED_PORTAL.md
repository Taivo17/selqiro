# Profiili kataloogikontrolli järjestuse parandus

20.11.2026. Viimane vastu võetud tootmiscommit on `5312ea0`. Kell 17:16 peatunud jätkukäik tegi ühe read-only kontrollpäringu ja peatus enne muudatusi. Uus eraldi pakett parandab kontrollsumma sõltuvuse serveri tekstijärjestusest.

## Üks käsk

Laadi `selqiro-profiili-kontrolli-parandus-20261120.zip` alla ja ava Downloads-kaustas.

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-kontrolli-parandus-20261120/uuenda.py" --publish
```

Uuendaja kontrollib algseid käiguraporteid, koguja tulemust, lähtepuud, indeksit, värsket remote’i, CLI-d ja andmebaasi kataloogi. Muudatus algab ainult teadaolevast seisust. Rakenduse test ja täielik build peavad läbima enne üht SQL-tehingut. Seejärel kontrollitakse uut andmebaasiseisu ning tehakse täpse muudatuse commit ja push.

Säilita varasemad paketid, originaalraportid ning `Downloads/selqiro-recovery` all olev koguja tulemuskaust ja ZIP. Uus pakett kasutab olemasolevaid tõendeid. Vanade paigaldajate või koguja korduskäiku ega manifesti käsitsi lisamist pole vaja.

## Miks eelmine käik peatus

Esimese katse kell 16:34 lõpetas `PREVIOUS_RELEASE_RECEIPT_REQUIRED`: koguja manifest asus ZIP-is, uuendaja otsis seda kaustast. Jätkupakett parandas selle lugemise tee.

Kell 17:16 jõudis jätkupakett kataloogikontrollini. Selle raporti SHA256 on `522fbb2910f4afc112a2bd444f9b76dbc5ec5ba93a31904adeeb2c6c4536b843`; `stopped_at: baseline_verified`, `DATABASE_PRECONDITIONS_NOT_MATCHED`, `database: not_started`, `tests/build/push: not_run`, `commit: null`. Raport kinnitab üht edukat read-only preflight’i ja varasema väljastuse säilimist.

Põhjus on täpselt taastoodetud: samad õiguste kirjed eri tekstijärjestuses andsid erineva kontrollsumma. Uus pakett määrab SQL-is kanoonilise `C`-järjestuse. Kõik õigused ja kontrollitavad väljad ning algsed enne/pärast kontrollsummad jäävad kontrolli alla; tundmatut seisu lubatuks ei märgita.

## Oodatud tulemus

Eduka käigu lõpus prindib uuendaja `VALMIS`, uue commit’i ning `SAADA SEE FAIL` raporti tee. Saada see täpne uus raport. Seejärel oota Vercelis sama commit’i `Ready / Production` tulemust ja värskenda portaali. Kuni neid tulemusi pole, ei ole paranduse tootmisse jõudmine kinnitatud.

Kui käik peatub, saada uus raport või raporti puudumisel prinditud STOP-rida. Ebaselge SQL-vastuse korral ei korrata kirjutust automaatselt.

## Ulatus

Järjestusparandus võimaldab lõpetada varem ette valmistatud konto ja profiili privaatsete väljade lugemise kitsenduse. Rakenduskoodi ja sisulist õigusteparandust ei muudeta. Profiile, pilte, pakkumisi, liikmesusi ega vestlusi ei kustutata või migreerita. Uut profiiliredaktorit see pakett veel ei ava.

Kirjutamisõiguse ja versiooni kontroll, serveri hallatavate tasemeväljade kaitse, ühtne pildiallikas ning sõnumite profiililink on järgmised tööd. See samm ei ole kogu portaali turvalisuse heakskiit.
