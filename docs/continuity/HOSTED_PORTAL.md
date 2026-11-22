# Minu ala tööloendi lugemisluku parandus

22.11.2026. Vastu võetud alus on `78aea6f`. Senine kliendi korduskatse ja töö kättesaadavuse selgitus on juba avaldatud. Uus pakett asendab ühe andmebaasifunktsiooni, et oma tööde loend saaks avaneda ka siis, kui muu toiming hoiab profiili kirjutamislukku.

## Käivitamine

Ava `selqiro-too-lugemisluku-parandus-20261122.zip` Downloads-kaustas ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-lugemisluku-parandus-20261122/uuenda.py" --publish
```

Uuendaja kontrollib täpset olemasolevat lähtekoodi, tööpuud, indeksit, kinnitatud remote’i, eelmise eduka käigu originaalraportit, sõltuvusi ja SQL-kataloogi. See teeb värske build’i, rakendab ühe piiratud SQL-paranduse ning kinnitab tulemuse uue lugemisega enne commit’i ja push’i. Varasemaid paigaldajaid ega 49 vastuvõetud klienditesti ei korrata.

Saada lõpus **SAADA SEE FAIL** juures näidatud täpne raport. Uuendaja loob sellest privaatse kordumatu koopia Downloads-kausta ja avab selle asukoha Finderis. Algne päevik ja kõik varasemad koopiad säilivad.

Kui käik peatub, säilita failid ja saada näidatud raport. Kui raportit ei tekkinud, saada **PEATATUD** rida. Ebaselget SQL-kirjutust ei korrata automaatselt.

## Pärast avaldamist

Oota Vercelis raporti uue commit’i **Ready / Production** tulemust ja värskenda portaali.

1. Ava Minu ala tööde loend oma eraisiku profiiliga. Mine avalehele ja tagasi Minu alasse.
2. Vaheta oma ettevõtte profiilile ning ava selle tööde loend. Näha peavad olema selle profiili tööd.
3. Kontrolli, et olemasolev suletud töö on endiselt oma loendis Suletud olekuga ning senine vestlus avaneb.

Selle kontrolli jaoks piisab olemasolevate kirjete lugemisest. Kui loend jälle tõrgub, saada vastava `get_my_jobs_v1` päringu Status ning Response’i `code` ja `message`. Päringu päiseid, tokeneid ega kontode täisandmeid pole vaja saata.

Paketi `proof` kaust kirjeldab kohalikke katseid. Need on ettevalmistuse tõendid; tegeliku Maci ja pilve tulemuse kinnitab uus raport ning Verceli tulemus eraldi.
