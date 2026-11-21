# Profiilipildi sobitamine ja suuremad pildid sõnumites

21.11.2026. Vastu võetud alus on `68c3996`: pildi lisamine, taustapildi sobitamine ja piltide kuvamine toimivad kasutaja esitatud katsete järgi. See pakett lisab profiilipildi enda sobitamise ning teeb vastaspoole pildi sõnumite loendis ja päises suuremaks.

## Käivitamine

Ava `selqiro-profiilipildi-sobitamine-20261121.zip` Downloads-kaustas ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiilipildi-sobitamine-20261121/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat lähtekoodi, indeksit, remote’i ja eelmise eduka käigu originaalraportit. Seejärel käivitab uued fokuseeritud testid ja build’i ning teeb kontrollitud commit’i ja push’i. Säilita varasemad raportid. Selle muudatuse jaoks puudub eraldi andmebaasisamm.

Saada lõpus **SAADA SEE FAIL** juures näidatud uus raport. Oota Vercelis **sama uue commit’i** `Ready / Production` tulemust ja värskenda portaali.

## Pildi sobitamine

Ava **Minu ala → Minu profiil → Profiili pildid**.

1. Vajuta profiilipildi juures **Vali pilt** või **Muuda pilti** ning vali oma seadmest fail.
2. Avaneb ringikujuline eelvaade. **Täida ring** täidab raami; suurenduse ja asendi saad valida lohistamise, liugurite või klaviatuuri abil. **Näita tervet pilti** säilitab kogu foto või logo ja võib jätta raami servadesse vaba ala.
3. Vajuta **Kasuta seda asendit**, seejärel **Salvesta pilt**. Asendi kinnitamine valmistab ette kohaliku pildi; avalik pilt vahetub salvestamise õnnestumisel.

Eraisiku puhul on algvalik **Täida ring**, ettevõtte puhul **Näita tervet pilti**. Valikut saab mõlemal juhul muuta. Enne salvestamist saab sama valitud originaali uuesti sobitada. Juba salvestatud pildi uueks lõikamiseks vali originaalfail uuesti nupuga **Muuda pilti**.

Vastaspoole profiilipilt on sõnumites suurem. Sellelt avaliku profiili avamine jääb samaks, nagu kasutaja on juba kinnitanud. Uuendus ei muuda seniseid fotosid automaatselt.

## Kontrollide piir

Paketi juurde kuuluvad kohalikud testide ja build’i tõendid. Siinne Chromium ei käivitunud keskkonna socket-piirangu tõttu; kasutaja Safari ja tootmiskeskkonna uus pildisobitamise käik võetakse vastu pärast paigaldust. Uue paketi avaldamist ei ole selle juhendi koostamise ajal kasutaja eest tehtud.

Kui käik peatub, saada näidatud raport või raporti puudumisel täpne **PEATATUD** rida. Ära käivita selle tõttu uuesti varasemaid SQL-paigaldusi.
