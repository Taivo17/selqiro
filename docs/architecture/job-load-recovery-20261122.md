# Minu ala tööde lugemise taastumine ja kättesaadavuse selgitus

## Täheldatud käitumine

22.11.2026 teatas kasutaja, et Minu ala tööpakkumised ei avane alati esimesel korral, kuid Proovi uuesti järel avanevad. Ta kinnitas sulgemist: töö jääb oma vaatesse Suletud olekuga, kaob aktiivsest otsingust ning sõnumid säilivad. Suletud pakkumise avamine sõnumikaardist näitab üldist kättesaamatuse teadet.

Lähtebaas on vastu võetud commit `8c2ee5c1e7caddcc4a6e4efb630458a331c3e31d`. Kasutaja vea võrgu- ega SQL-koodi ei ole kogutud. Koodiaudit ei tõendanud autentimise võidujooksu. Tõendatud puudus on see, et üks ajutine lugemistõrge muutub kohe lõplikuks veavaateks. SQL-i 2-sekundiline lukupiirang on üks võimalik ajutise vea allikas, mitte selle juhtumi tõendatud põhjus.

## Üks piiratud korduslugemine

RPC transpordikihis eristatakse teadaolevaid ajutisi võrgu- ja serverivigu enne range vastuseparseri käivitamist. Oma tööde loendi lugemisel tehakse sellise tõrke järel üks lisakatse lühikese katkestatava viivitusega. Mõlemad katsed kasutavad sama sisendit. Enne kordamist peab konto, aktiivne profiil ja selle kontrollitud põlvkond olema endiselt kehtiv.

Komponendi eemaldamine, konto või profiili vahetamine katkestab nii ooteaja kui ka päringu. Hilinenud vastus ei tohi vana profiili töid kuvada. Kahe järjestikuse ajutise tõrke järel jääb nähtavaks senine veateade koos nupuga Proovi uuesti. Õiguste, sisendi ja vastuse skeemi vead ning kasutaja katkestus ei põhjusta automaatset kordust. Aktori kontrolli vigu automaatselt ei korrata, sest praegune kontekst ei erista nende põhjuseid piisavalt.

Kordamine on ainult loendi lugemise ümber. Avaldamise, salvestamise, sulgemise, pikendamise ja kontakti päringuid ei korrata. Kviitungite, revisjonide ja ebaselge kirjutamise tulemuse käsitlus jääb samaks.

## Avalik link pärast sulgemist

`get_public_job_v1` tagastab ainult avalikult lubatud aktiivse töö. Edukas `null` vastus võib tähendada sulgemist, peatamist, aegumist, puuduvat tööd või piiratud ligipääsu. Seetõttu ei muudeta seda kindlaks Suletud teateks ega tooda peidetud sisu välja ajaloolise sõnumikaardi põhjal.

Uus vaade ütleb: **See tööpakkumine ei ole praegu avalikult nähtav.** Selgitus: **Pakkumine võib olla lõpetatud, peatatud või aegunud.** Kasutaja saab minna tagasi vestlustesse või vaadata kõiki tööpakkumisi. Edukas tühi vastus, laadimine ja päringuviga jäävad eraldi olekuteks. Sõnumikaardi link ega serveri õigused ei muutu.

## Kontroll ja väljastamine

Pakett sisaldab API ning tegeliku React DOM-i läbimängimise tulemusi, allikate räsisid ja täieliku Next.js 16.4.6 build’i tõendit. Kohalikud testid kasutavad sünteetilisi vastuseid. Need tõendavad muudatuse käitumist kontrollitud olukordades, mitte kasutaja algse vea täpset põhjust ega uut avaldamist.

Maci uuendaja nõuab täpset 2020-failist alust, eelmise eduka paigalduse originaalraportit, oodatud Git-hoidlat ja lukufailile vastavaid sõltuvusi. See rakendab piiratud lähtekoodimuudatuse, käivitab sihitud testid ja build’i ning avaldamiskäsu korral teeb commit’i ja push’i. SQL-i, Authi, SMTP, domeenide või kasutaja sisu muudatusi paketis ei ole.
