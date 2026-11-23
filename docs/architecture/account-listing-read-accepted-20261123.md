# Tavakuulutuste konto-oleku kontroll — vastu võetud

23.11.2026 Europe/Tallinn. Commit `87bff3f51a01a6953c37096ed32a1017135fd304`; ainus vanem `8dc0b3b11777b010c8486b45a3f98f0191d97d80`;
puu `a6f7b7522cd0e88db25caf88b8dd4e9a48c64d77`, 2154 faili. **See moodul on vastu võetud.**

## Kokkuviidud tõendid

| Osa | Tulemus |
| --- | --- |
| Mac/Git | 32 täpset paketi rada: 8 muudatust ja 24 uut faili; ülejäänud alus säilib. |
| Testid | Üks sihitud 13/13 TAP-käik, null viga/vahelejätmist/katkestust/todo. |
| Build | Üks edukas Next.js 16.4.6 / TypeScripti build; kaheksa artefaktiräsi. |
| SQL | Üks preflight, üks kinnitatud apply, eraldi ainult lugemise verify. |
| Commit/push | Main puhas ja kinnitatud remote’iga võrdne; viimane vaatlus 20:27:38.314. |
| Vercel | Pildil main 87bff3f, õige pealkiri, Ready (23 s), Production. |
| Kasutuskontroll | Kasutaja kinnitus „kõik lehed avanevad”. |

[Algne raport](https://chatgpt.com/library?file_id=libfile_fde3_f-801a56d184588191939cb92565f8ecac_47723c41e94c8191aa89f8c107f6c132&account_id=personal): `selqiro-kuulutuste-konto-olek-20261123-raport-20261123-202738-2e4bf1222037.json`,
1350011 baiti, SHA256 `1771fc501d411e71f45bb63a098a62abe47d6b33612782b6b30b11a7e65e8b95`. Käik 20:26:41.816–20:27:38.341 Europe/Tallinn.
[Väljastatud paigalduspakett](https://chatgpt.com/library?file_id=libfile_fde3_f-c1b2b51558dc81919e2e41017c6be155_47723c41e94c8191aa89f8c107f6c132&account_id=personal): SHA256 `d93fa57b5abcdbe25ad1dd50603dd1a2f72f70a3ed4d8e65e0ee38082e8aed79`;
manifest `f8619bf143a47d7f373aeaebacfebb42d7e1752b0470ab3aa84233afd42c976f`. Väljastatud pakett ja originaalraport säilivad muutmata.

## Allikad ja andmebaas

Täielik lõpppuu ja indeksi tekstiväljund taastati aktsepteeritud aluse ning
payload’i baitidest. Pikkused ja räsid kattuvad salvestatud Giti väljunditega.
Binaarset indeksit ega terviklikku commit-objekti raport ei ekspordi; uus Git
või remote’i päring ei ole osa sellest ülevaatusest.

Kolme CLI kviitungi ümbrised taastati parsitud andmetest. Kõigi kolme täpsed
baidipikkused ja SHA256 kattuvad raportiga; need baidid parsiti algse range
parseriga. Terviklikke kataloogiridu ega stderr’i teksti polnud eksporditud.
Valitud listing-õiguste, veergude ja indeksite lähtekoodist tuletatud ootused
said selle käigu enne/pärast metaandmevõrdlusega kinnituse. See pole terve skeemi audit.

Muutusid ainult nelja lugeja kehad ja definitsioonide räsid. Signatuurid,
omanikud, konfiguratsioon, õigused ja konto/profiili alus säilisid. Konto helper
ei muutu; ühendatud otsingu hobuste haru ja lehekülje ühine lõpposa on samad.
Paigalduse SQL loeb süsteemi metaandmeid; kontode, Auth-i, sisu ja Storage’i
ridade toiminguid see ei tee. See ei kirjelda muid samaaegseid kasutajatoiminguid.

## Kontrollide piir

TAP-i ja build’i toorlogid ning ehitatud failide baidid pole raportis. Nende
vastuvõtt põhineb muutumatu uuendaja kontrollitud käigul, exit-koodidel, parsitud
tulemustel ning logi- ja artefaktiräsidel. Toorlogide kordusparsimist ei väideta.
569 käsu protsessilõpud ja kolm runtime-etappi olid kinnitatud; vana eduka käigu
originaalraport ning senised päevikud säilisid. Vastuvõtul teste ega build’i ei korratud.

Raporti `READY_NOT_CHECKED` jääb algseks. Deployment’i tõend on kasutaja eraldi
kuvatõmmis `Screenshot 2026-11-23 at 20.42.59.png`. Lehtede avanemine on kasutaja
kinnitus küsitud kontrollile; eraldi mobiili, anonüümse seansi, kõigi kontode või
iga nupu toimimist sellest ei tuletata.

Ettevalmistuse 12 000 kuulutuse võrdlus ja 20 000 mitteseotud konto lisamise
kontroll jäävad sünteetiliseks tõendiks. Ühendatud laiotsingu vana/uue mediaan oli
4,25/4,72 sekundit. Kaartide koostamine enne lehekülge vajab enne suuremat
kasutusmahtu eraldi optimeerimist; tootmise koormustaluvust pole mõõdetud.

## Jätk

Üks järgmine moodul on hobuste põhiotsing ja üksikvaade sama kontoolekuga.
Täpne lähtekoodiaudit on `account-horse-read-next-20261123.md`-s. See on kavand;
selle uut teostust, testi ega paigaldajat pole selle vastuvõtu käigus tehtud.
Konto sulgemise ja kustutamise tegevus ootab ülejäänud vajalikke serveriteid.

Käesolevad dokumendid on ette valmistatud pärast 87bff3f. Neid pole siit Maci
kirjutatud, commit’itud ega pushitud. Järgmine sisuline koodipakett võtab lisad
kaasa. SMTP paus, ühe eraisiku või ettevõtte konto suund, suletud AI päringuteed
ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.
