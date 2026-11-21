# Töökuulutused eraisikule ja ettevõttele

21.11.2026. Alus on vastu võetud `cd35d18` turvauuendus. E-posti kinnitamise aktiveerimine jääb kasutaja otsusel `selqiro.com` kasutuselevõtu etappi; praegu kasutab kõiki kolme kontot ainult tema ise.

## Tulemus

Eraisik ja ettevõte kasutavad sama töökuulutuse vormi. Valida saab „Otsin töö tegijat” või „Otsin töötajat”. Konkreetse töö puhul saab lisada kogu töö tasu; olemasolevad tunni- ja muud tasuperioodid säilivad. Töö ilmub üldises Töö otsingus ja avaldaja profiilis. Kuulutuse juurest saab avada vestluse tegeliku avaldajaga.

## Käivitamine

Ava `selqiro-eraisiku-tookuulutused-20261121.zip` Downloads-kaustas, salvesta pooleliolev töö ning käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-eraisiku-tookuulutused-20261121/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat lähtekoodi, originaalraportit ja serverilepingut. Seejärel paigaldab piiratud muudatuse, kontrollib kliendi käitumist ja koostab portaali. Üks tehing laiendab töökuulutuste serverilepingut; sõltumatu lugemiskontroll peab tulemuse kinnitama enne piiratud commit/push’i. Tegevuste toored logid jäävad Macile; saadetav raport ei sisalda kasutajate ridu ega võtmeid.

Saada lõpus **SAADA SEE FAIL** juures näidatud uus raport. Oota Vercelis **sama commit’i Ready / Production** tulemust ja värskenda portaali. Seejärel proovi eraisikuna konkreetse töö kuulutust, kontrolli üldist otsingut ja oma avalikku profiili ning ava teise oma kontoga selle kuulutuse kontakt. Sõnumi saatmine jääb sinu eraldi vajutuseks.

Peatumisel saada uus raport või **PEATATUD** rida. Säilita failid ja päevikud. Ebaselget SQL-tulemust ei lahendata sama käsu pimesi kordamisega.

## Kohalik kontroll

- 53 kliendi ja integratsiooni kontrolli läbisid edukalt.
- 22 SQL-i kontrollrühma läbisid eraldatud testandmetega edukalt.
- 3 eraldi vormi käitumise kontrolli ja 46 uuendaja kontrolli läbisid edukalt.
- Uuendatud portaali build läbis edukalt; lähtekoodi sisendites muutusi ei olnud.

Need on ettevalmistuse kontrollid. Uuendaja käivitab Macis sihitud 53 kliendikontrolli ja build’i uuesti ning kontrollib tegelikku andmebaasilepingut. Uusi teeke ei ole vaja paigaldada.

## Piir

Pakett ei ole selle juhendi kirjutamise ajal Macis ega hosted-andmebaasis käivitatud. Kohalikud sünteetilised rakendus-/SQL-kontrollid ei asenda kasutaja avaldatud versiooni läbimist. Varem avatud leht tuleb pärast avaldamist värskendada, et laadida uute tööliikide lugeja.
