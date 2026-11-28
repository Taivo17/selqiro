# Profiili asukohavaliku kasutuselevõtt

> Ajalooline juhend. ASUKOHT-1 võeti 28.11.2026 vastu commitiga `af78c7b`:
> paigaldusraport, sama versiooni Ready / Production ja kasutaja kinnitus
> asukoha salvestamise toimimise kohta. Seda paketti uuesti ei käivitata.
> Praegune järgmine samm on [avaliku profiili kaart](PROFILE_MAP_INSTALL_20261128.et.md).

27.11.2026. Aktiivne töö on ASUKOHT-1. Kõigepealt seadista kohasoovituste
võti, seejärel käivita uus uuendaja ning kontrolli selle uue versiooni profiilivormi.

## 1. Kohanimede soovituste võti

1. Ava [Geoapify projektid](https://myprojects.geoapify.com/), loo konto
   ning Selqiro jaoks eraldi projekt. Alustuseks sobib tasuta pakett;
   tasulist tellimust see muudatus ei eelda.
2. Kopeeri projekti API-võti otse Verceli Selqiro projekti
   **Environment Variables** vaatesse.
3. Muutuja nimi on täpselt **`GEOAPIFY_API_KEY`**, väärtus on Geoapify võti.
   Vali **Production** ja salvesta. See on serveri muutuja; avalikku
   `NEXT_PUBLIC_` eesliidet ei kasutata.
4. Järgmise sammu commit/push loob uue deployment'i, mis võtab selle
   seadistuse kasutusele. Kui lisad võtme alles pärast uue versiooni
   juurutamist, tee Vercelis sellele versioonile **Redeploy**.

Verceli ametliku juhendi järgi rakendub muutujate muudatus uuele deployment'ile,
mitte juba töötavale vanale versioonile. Geoapify tasuta maht on 27.11.2026
hinnalehe järgi 3000 krediiti päevas ja kuni 5 päringut sekundis, koos
nõutud teenuse- ja andmeallika viidetega. Selqiro valikul on need viited olemas.
Rakenduse oma ühine mahupiir on konservatiivsem; teiste rakenduste sama
võtmega kasutust see ei arvesta.

API-võtit ei ole uuenduspaketis ega raportis. Kopeeri see teenuste vahel
otse. Uuendaja ei loo Geoapify kontot ega muuda Verceli seadeid.

## 2. Uus uuenduspakett

Laadi alla ja paki Downloads-kaustas lahti **`selqiro-profiili-asukoht-20261127.zip`**.
Käivita terminalis üks kord:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-asukoht-20261127/uuenda.py" --publish
```

Projekt on senine `/Users/taivo/selqiro`. Uuendaja kontrollib lähtekoodi,
muutmata varasemaid raporteid ja olemasolevaid sõltuvusi. Ta lisab uue
lähtekoodi ning teeb testid ja värske build'i. Nende õnnestumisel kontrollib
ta andmebaasi eelseisu, rakendab piiratud SQL-muudatuse, kontrollib
kinnitust ja järelseisu ning teeb kinnitatud tulemusest commit/push'i.
Vanade kuulutuste andmeridu ei geokodeerita ega täideta.

Saada lõpus näidatud **uus JSON-raport**. Kui käik peatub, saada sama
käigu raport; ära käivita varasemaid uuendajaid ega proovi SQL-i eraldi
uuesti. Peatumise põhjus lahendatakse sama etapi sees.

## 3. Sama uue versiooni kontroll

Oota, kuni uus commit on Vercelis **Ready / Production**. Seejärel ava
**Minu ala → Muuda profiili** ja kontrolli:

| Katse | Oodatav tulemus |
| --- | --- |
| Riiki trükkides `Soo` või `Suomi` | Soome on valitav |
| Eesti ja `Pai` | Sobivate soovituste hulgas saab valida Paide |
| Soome ja `Hels` | Soovitused jäävad Soome piiresse |
| Jaapan ja `Tokyo` või `東京` | Teise kirjasüsteemi sisestus säilib; katvust kinnitab päris teenuse vastus |
| Vali koht, salvesta, värskenda lehte | Sama kinnitatud koht säilib |
| Muuda riiki enne koha salvestamist | Vana riigi koht ei jää kinnitatud valikuks |
| Muuda ainult profiili nime või tutvustust | Senine koht säilib, uut kohapäringut pole vaja |
| Eemalda koht ja salvesta | Koht eemaldub alles salvestamisel |
| Vali ettevõtte olemasoleva aadressi juures uus asula | Vana tänavaaadress eemaldub ning kuvatakse selgitus |

Eraisikul puudub täpse tänavaaadressi valik. Ettevõttel säilib vabatahtlik
senine aadressiväli. Uute pakkumiste automaatne eeltäide ja lähimad-enne
otsing kuuluvad järgmiste etappide juurde.

Raport, sama commiti Ready / Production ning tegeliku valiku/salvestamise
kinnitus lõpetavad ASUKOHT-1 vastuvõtu. Seejärel jätkub ASUKOHT-2.

Allikad: [Geoapify API](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/),
[Geoapify hinnad](https://www.geoapify.com/pricing/),
[Verceli keskkonnamuutujad](https://vercel.com/docs/environment-variables/managing-environment-variables).
