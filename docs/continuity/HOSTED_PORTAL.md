# Avaliku tööotsingu laadimisvea parandus

21.11.2026. Alus on avaldatud `512fe45`. Olemasolevad kuulutused on oma vaates või avalikul profiilil nähtavad, kuid üldotsing annab laadimisvea. Koodis korrati sama tõrge ühe tulemuse vanas formaadis profiilipildiga.

## Tulemus

Töökuulutuste avalik vastus hakkab kasutama olemasolevat profiilipiltide lugejat. Nii ei saa ühe avaldaja vana pildiväli kogu tööotsingut katkestada. Uus eraisiku tööots ja vana ettevõtte töökuulutus peavad olema samas loetelus nähtavad, kui nende tavalised nähtavustingimused on täidetud. Kuulutusi ega pilte ei ole vaja uuesti lisada.

## Käivitamine

Laadi alla ja ava `selqiro-too-otsingu-parandus-20261121.zip` Downloads-kaustas. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-otsingu-parandus-20261121/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat allikat ja eelmise paigalduse raportit, teeb värske andmebaasilepingu lugemiskontrolli, kontrollib ettevalmistatud allikat ning rakendab ühe piiratud SQL-tehingu. Sõltumatu järelkontroll peab õnnestuma enne commit’i ja push’i. Sõltuvusi ei paigaldata. Varasemad andmed, kviitungid ja paigalduspäevikud säilivad.

Saada lõpus **SAADA SEE FAIL** juures näidatud uus raport. Oota Vercelis **sama commit’i Ready / Production** tulemust ja värskenda portaali. Ava **Töö** ilma filtriteta: kontrolli „Otsin lume lükkajat täna” ja „Muruniiduki operaator” nähtavust. Ava olemasolevad kuulutused ning kontrolli ka avaliku profiili tööde jaotist.

Kui uuendaja peatub, saada uus raport või **PEATATUD** rida. Säilita failid ja päevikud.

## Kohalik kontroll

- 37 kliendi ja jagamise kontrolli läbisid edukalt, nende seas viis uut pildivea kontrolli.
- 12 SQL-i kontrollrühma läbisid eraldatud testandmetega edukalt.
- 48 uuendaja kontrolli läbisid edukalt.
- Portaali tootmisversiooni build läbis edukalt; 764 koostamissisendit jäid muutumatuks ning üheksa nõutud artefakti kontroll õnnestus.

Uuendaja käivitab Macis sihitud 37 kliendikontrolli ja build'i uuesti ning kontrollib tegelikku andmebaasilepingut. Uusi teeke ei ole vaja paigaldada. Kohalikud kontrollid ei tähenda, et serveriparandus oleks juba avaldatud.

## Tõendi piir

Uus parandus on enne selle käsu käivitamist ainult ette valmistatud ja lokaalselt kontrollitud. Senine production-versioon ja avaliku otsingu viga on eraldi üle vaadatud. Uut serverimuudatust, Maci käivitamist ega uut Verceli tulemust ei loeta enne raportit tehtuks.
