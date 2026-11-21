# Profiilipildi ja taustapildi laadimise parandus

20.11.2026. Praegune vastu võetud lähtecommit on `68b6e68`. Selle Maci raport ja sama commit’i Verceli **Ready / Production** on kontrollitud. Kasutaja märgatud laadimisvea põhjustab vana pilt, mis on salvestatud pika `data:`-tekstina. See ületab esialgse pildipäringu mahu enne, kui rakendus jõuab pildivalikuid näidata.

## Käivitamine

Ava `selqiro-profiilipiltide-laadimine-20261120.zip` Downloads-kaustas. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiilipiltide-laadimine-20261120/uuenda.py" --publish
```

Uuendaja kontrollib senist lähtekoodi, indeksit, remote’i, eelmise profiilipiltide uuenduse originaalraportit ja värsket andmebaasiseisu. Pärast kohalikke kontrolle rakendab see ühe kitsa SQL-paranduse, kontrollib tulemust eraldi lugemisega ning teeb commit’i ja push’i. Säilita varasemad raportid; vana uuendust ega andmekogujat ei ole vaja uuesti käivitada.

## Pärast käiku

Saada terminalis **SAADA SEE FAIL** juures näidatud uus raport. Eduka commit’i järel oota Vercelis **sama uue commit’i** `Ready / Production` tulemust ja värskenda portaali.

Ava **Minu ala → Minu profiil → Profiili pildid**. Seal peavad olema eraldi **Profiilipilt** (ettevõttel **Profiilipilt või logo**) ja **Taustapilt**.

1. Profiilipildi juures ava **Vali pilt**, vali fail ning vajuta **Salvesta pilt**.
2. Taustapildi juures ava **Vali pilt** või olemasoleva pildi puhul **Muuda pilti**. Uue pildi eelvaates saad **Sobita pilti** abil pilti nihutada ja suurendada. Kinnita asend ning vajuta **Salvesta taustapilt**.

Vana toetamata manuspildi asemel võib enne uue pildi valimist näha nime algustähte. Sobiv olemasolev taustapilt jääb alles. Parandus ei kustuta vanu andmevälju ega pildifaile; see jätab toetamata vana väärtuse pildipäringu vastusest välja.

**Proovi uuesti** on salvestatud andmete korduslugemise nupp. Pildifaili valimise avavad **Vali pilt** ja **Muuda pilti**.

## Kui käik peatub

Saada uus raport või raporti puudumisel täpne **PEATATUD** rida. Ebaselget andmebaasikirjutust ei korrata automaatselt. Käesolev pakett on selle juhendi koostamise ajal ette valmistatud; kasutaja Maci ja brauseri tulemus võetakse hiljem eraldi vastu.
