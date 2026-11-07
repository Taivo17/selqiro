# Foto kiirem kuvamine pärast lisamist

Seis: 07.11.2026 Europe/Tallinn. Üks praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemad käsud on ajalugu.

## Kinnitatud lähtealus

Foto valiku ja lõpetatud algfailide reservi parandus on kasutaja poolt
paigaldatud ja kasutuses. Verceli lähtecommit on `f1745be`
(`Fix photo selection and release completed upload sources`).
Kasutaja lisas kuulutusele 201 viis fotot, jõudis kümne foto piirini ning
kinnitas galerii ja avaliku vaate. Vana viie foto takistus on lahendatud.

Verceli Function Region on Frankfurt `fra1`. Sama koodiga redeploy on
Ready / Production; uus `image-verify` vastus kinnitas `arn1::fra1`.
Serverietapp vähenes kahe vaatluse vahel 7647,2 ms → 4345,2 ms.
Kasutaja ühe uue lisamise stopperiaeg oli 12 sekundit.
Seda piirkonna muutmist ega selle kinnitamist ei korrata.

Järgmine väike kliendiparandus alustab kinnitatud uue veebifoto kaitstud
laadimist samal ajal värske galerii lugemisega. Foto saab nähtavaks alles
siis, kui värske galerii kontroll seda lubab. Pildi kontroll, salvestamine,
andmebaas ja teenuseseaded kasutavad senist rada.

## Üks käsk

1. Laadi **selqiro-foto-kuvamine-20261107.zip** Downloads-kausta ja paki lahti.
2. Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-foto-kuvamine-20261107/uuenda.py" --publish
```

Paigaldaja lahendab olemasolevas Gitis `f1745be` täpseks üheseks commit'iks
ning võrdleb 1084 lähtemanifesti faili, main-haru, tööpuud, indexit ja
kinnitatud remote'i. Muudetavatest failidest tehakse varukoopia, seejärel
build ning selle paranduse commit ja tavaline push samasse hoidlasse.
Paki kontroll ei järelda Maci täpset lähtepuud ainult Verceli ekraanipildist.

`PEATATUD` korral säilita teade ja raport ning saada need vestlusse.
Varem väljastatud paigaldajaid ega diagnostikaprogramme ei käivitata uuesti.

## Üks kasutuskatse pärast uue commit'i Ready tulemust

Oota Vercelis terminalis näidatud uue commit'i **Ready / Production**
tulemust ja värskenda portaali. Ava testkuulutus, kus on alla kümne foto;
kuulutus 201 oli viimases kinnitatud katses täis. Lisa üks uus foto ja
mõõda aeg nupust **Lisa kuulutusele** kuni uue foto nähtavale ilmumiseni.
Kontrolli ka selle foto avalikku nähtavust.

Üks kasutuskatse on selle paranduse kontrolliks piisav. Ära eemalda
kinnitatud fotosid üksnes katse jaoks. Täpset uut sekundiarvu ette ei lubata:
muudatus võimaldab kahe viimase lugemisetapi osalist kattumist, kuid foto ettevalmistus,
üleslaadimine, kontroll ja salvestamine võtavad endiselt aega.

Paki kohalikud kontrollid ja nende piirid on
[PHOTO_DISPLAY_20261107.md](PHOTO_DISPLAY_20261107.md). Need ei tähenda,
et uus parandus oleks juba Macis või Vercelis paigaldatud.
