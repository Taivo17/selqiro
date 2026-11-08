# Teenuste avaldamine ja muutmine

Seis: 08.11.2026 Europe/Tallinn. Praegune tööjärg ja kontrollitulemused on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemad paigalduskäsud on ajalugu.

## Kasutaja kinnitatud tulemus

Hobuse „Muuda” avab kohe muudetavad väljad. Kasutaja tegi muudatuse, salvestas,
tegi samas vormis veel ühe muudatuse ja salvestas uuesti; kõik muudatused olid
avalikus vaates nähtavad. See parandus on kasutuskatse järgi vastu võetud.
Varem kinnitatud galerii, pisipilt, pildilingid, peatamine, kinnituste kasutamine
ja eraldi 90-päevane uuendamine jäävad samuti vastu võetuks.

## Praegune teenuste uuendus

Esimene teenuste pakett peatus enne muudatusi: `DATABASE_PRECONDITIONS_NOT_MATCHED`.
Tegelik raport kinnitas, et andmebaasimuudatust, lähtefailide muutmist, build'i,
commit'i ega push'i ei alustatud. Kõik 1255 alusfaili vastasid kontrollitud
hobusemuutmise commit'ile `78209e8ed0c7330b117d7db070b733eda5aa1723`.

r2 parandab kohaliku andmebaasikatse õiguste taastamise: rubriigitabeli
vaikeõigused ja kahe varasema teenusefunktsiooni anonüümne käivitusõigus.
Parandatud kirjeldus taastab mõlemad päris raporti kontrollväärtused täpselt.
Teenuste rakenduse failid ja kaheksa paigaldatavat SQL-moodulit säilivad.

Teenuse lisamine järgib **täida vorm → lisa fotod → Avalda** kasutusteed.
Hiljem **Minu ala → Muuda → Salvesta muudatused**. Väljad on kohe muudetavad
ja pärast salvestamist saab samas vormis jätkata. Eraldi kohustuslikku
mustandiks salvestamist ei ole.

Teenused kasutavad päris avalikku otsingut ja detailvaadet, sama galeriid,
omandi kontrolli, salvestatud tulemuse lugemist ja olemasolevat sõnumivahetust.
Minu alas saab valida aktiivse või peatatud oleku; muutmine säilitab staatuse.
Olemasolevad teenused, UUID-d ja fotod säilivad.

## Üks praegune käsk

Paki **selqiro-teenused-20261108-r2.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-teenused-20261108-r2/uuenda.py" --publish
```

Uuendaja kontrollib viimase hobuse muutmise paranduse eduraportit, tegelikku
Git-commiti ja kõiki 1255 alusfaili ning eelnevat paigaldusahelat. Seejärel
kontrollib ta andmebaasi olemasolevat seisu ja lisab teenuste toe ühe tehinguna.
Lähtefailide varukoopia, build, commit ja tavaline push järgnevad kontrollitud
tulemusele. Varasemad paketid ja päevikud jäävad alles. Uuel paketil on oma
väljalasketunnus ja päevik; esimese peatunud teenuste paketi päevikut ei kirjutata üle.

**PEATATUD** korral säilita teade, raport ja päevikud ning saada raport vestlusse.

## Kontroll pärast uue commit'i Ready / Production tulemust

1. Ava „Teenused” → „Lisa teenus”. Täida vorm, lisa kaks fotot ja vajuta „Avalda”.
   Kontrolli sama teenuse nähtavust avalikus nimekirjas, detailis ja Minu alas.
2. Ava Minu alas „Muuda”, muuda pealkirja ja salvesta. Tee samas vormis veel üks
   muudatus ja salvesta uuesti. Mõlemad salvestused peavad avalikus vaates näha olema.
3. Peata teenus, muuda peatatud teenuse teksti ja salvesta. Aktiveeri see uuesti.
   Peatatud teenus ei tohi ilmuda avalikus otsingus; taasaktiveeritud teenusel
   peab olema salvestatud sisu ja sama aadress.

Hobuse ja galerii juba vastu võetud katseid ei ole vaja korrata. Kohalikud
kontrollid ei ole teenuste uue versiooni Maci paigalduse ega live-vastuvõtu tõend.

## Järgmine töö

Teenuste Quick Update, ajutine asukoht ja saadavus on eraldi edasine töö.
Töökuulutused järgivad hiljem sama lihtsat lisamise ja muutmise loogikat.
Mitmesaja kuulutuse eesmärk ja otsustamata püsiv arvupiir säilivad.

Täpne leping: [service-publication-v1.md](../architecture/service-publication-v1.md).
Eelmine juhend säilib [arhiivis](../archive/HOSTED_PORTAL.before-services-20261108-e60ea1d90a6c.md).
