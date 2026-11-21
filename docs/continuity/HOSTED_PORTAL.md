# Selqiro sõltuvuste turvauuendus

21.11.2026. Vastu võetud alus on `fb36c3b`: suurem oma profiilipilt vestluste loendis on kasutaja raporti, sama commit’i Ready / Production ja ekraanipildi järgi avaldatud. Seda varasemat käiku pole vaja korrata.

## Muudatus

Uuendatakse Next ja eslint-config-next versioonile **16.4.6** ning Sharp versioonile **0.35.5**. Kolm olemasolevate tarbijate versioonivahemikesse sobivat transitiivset teeki uuendatakse lukus: ws **8.23.0**, source-map-js **1.2.4**, zod **4.6.7**. Uus pilditöötlus kasutab libvips **8.18.7**. Ülejäänud otsesõltuvused säilivad.

Sharpi uue versiooniga sobitamiseks parandati kahes failis tüübiimpordid. Sama olemasolev pilditöötlusfailide kaasamise seadistus rakendub nüüd ka hobuse- ja teenusekuulutuste API-dele. Kohalikud lõppkontrollid läbisid: 140 pilditesti, TypeScript, portaali Turbopacki build, native komponendid ja kõigi viie pilditöötluse API build-failide täielikkus. Kasutajate pildid, andmed, kontod ja õigused jäävad olemasoleva rakenduse hallata. Supabase, andmebaasi ega Storage seadistuse käsku selles paketis ei ole.

## Käivitamine

Ava `selqiro-turvauuendus-20261121.zip` Downloads-kaustas ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-turvauuendus-20261121/uuenda.py" --publish
```

Uuendaja kontrollib kogu lähteseisu ning eelmise eduka uuenduse originaalraportit. Seejärel paigaldab lukustatud sõltuvused, kontrollib native komponente, käivitab 140 olemasolevat pilditöötluse testi, koostab portaali ja kontrollib pilditöötluse failide kaasatust. Eduka kontrolli järel teeb piiratud commit’i ja push’i pealkirjaga **Update Next.js and Sharp security dependencies**.

Saada lõpus **SAADA SEE FAIL** juures näidatud uus raport. Oota Vercelis **sama uue commit’i** `Ready / Production` tulemust. Seejärel vaata üle avalik profiil, pildi lisamine/muutmine ja sõnumite vaade. Uuendust ei ole selle juhendi koostamise ajal kasutaja eest avaldatud.

## Kontrollide piir

Kohalikud testid kasutavad sünteetilisi pilte ning asendatud Auth/RPC/Storage teenuseid. Kohalik Linuxi kontroll ei ole Maci native-kontroll ega live-õiguste audit. Maci uuendaja kontrollib tegelikke seal laaditud komponente. ZIP-i `kontrollid` kaustas on täpsed sisendid, väljundid, ülevaatused ja sõltuvusauditi jääkleiud. Kõigi riskide puudumist see pakett ei väida.

Peatumisel saada uus raport või selle puudumisel **PEATATUD** rida. Säilita olemasolevad failid ja päevikud. Edukat sama sisendiga etappi uuendaja jätkamisel uuesti ei korda.

## Järgmine töö

Kasutaja on palunud lisada e-posti kinnitamise. Järgmine pakett ühendab selle registreerimise ja esmase eraisiku/ettevõtte valikuga. Enne live-kinnitamiskohustuse muutmist tuleb kontrollida Supabase Authi tegelikku seisu, kirjade saatmist, tagasipöördumislinke ning olemasolevate kasutajate üleminekut. Eraisiku töökuulutuste laiendus tuleb eraldi ühtse serveriõiguste muudatusena. Täpne plaan on `docs/architecture/registration-email-and-private-employers-plan.md`.
