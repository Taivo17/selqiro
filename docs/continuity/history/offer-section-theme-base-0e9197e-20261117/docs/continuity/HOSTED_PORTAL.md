# Praegune samm: aktiivse profiili tüübi parandus

Töö, jagamise ja värvide 12ff2bb väljaanne on kasutaja raporti ning
Ready / Production pildi põhjal vastu võetud. Tööpakkumiste SQL on
rakendatud ja järelkontrollitud. Seda paigaldust ega SQL-i ei korrata.

## Üks käsk

Paki `selqiro-aktiivse-profiili-parandus-20261116.zip` Downloads-kausta lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-aktiivse-profiili-parandus-20261116/uuenda.py" --publish
```

Parandaja seob end täpse 12ff2bb main-haru, kõigi 1863 alusfaili, indexi,
tööpuu, kinnitatud remote’i ning eelmise eduka jobs-jooksu privaatse
originaalraportiga. Eelmist raportit hoitakse ainult lugemiseks lukus.
Kasutaja muudatused ja päevikud säilivad. Muutunud alus peatab töö.

Parandus võtab aktiivse profiili tegeliku tüübi olemasolevast identiteetide
päringust. Tüübita nime/pildi vastust ei tõlgendata enam eraisikuks.
Konto ja aktiivne identiteet peavad tulemuse tagastamisel endiselt klappima.
Andmebaasiõigusi ja konto või profiili tüüpi see parandus ei muuda.

Uuendaja rakendab ainult täpse lähtekoodi/testi/dokumentide loendi, teeb
identiteedi sihtkontrolli ning build’i ja seejärel commit/push’i.
Andmebaasi, Supabase CLI ega Storage’i toiminguid tal pole.

## Jooksu tulemus

Terminal näitab ja Finder valib selle jooksu täpse privaatse raporti:

```text
SAADA SEE FAIL: <absoluutne JSON-tee>
```

Saada see fail. Kopeerimise tõrke korral näidatakse kontrollitud originaali;
Finderi tõrke korral jääb täpne tee terminali. Kui raportit ei loodud, saada
PEATATUD-rida. Võimalikult aegunuks märgitud raportiga saada ka peatumisrida.

Sama uue väljaande jätk kasutab sama käsku ja päevikut. Kontrollitult
lõpetatud sihtkatseid, build’i, commit’i ega push’i ei korrata. Muutunud
allika, ebaselge commit’i või remote’i korral saada raport, säilita tööseis.

## Pärast Ready / Production tulemust

Kontrolli Vercelis raportis nimetatud sama uue commit’i Ready / Production
tulemust ja värskenda portaali. Ava **Minu ala → Lisa tööpakkumine**.
Kontrolli vormis tööandja nime ja vormi avanemist. Kui tegelik aktiivne
identiteet on eraisik, peab rakendus seda ausalt näitama ja paluma valida
olemasoleva ettevõtte identiteedi; konto tüüpi ei muudeta automaatselt.

Seejärel avalda üks eesmärgipärane tööpakkumine ning kontrolli sama pakkumist
tööotsingus, ettevõtte profiilis ja otseviitel. Jaga lingi kontroll ning teise
olemasoleva konto kontakt tulevad pärast edukat avaldamist. Praegu saadetud
tühja töövaate ja Minu ala pildid ei ole selle kasutustee vastuvõtt.

Täpsed tõendid on paki kontrollid/ all. Üks praegune seis on
CURRENT_STATE.json; loetav üleandmine genereeritakse ainult sellest.
