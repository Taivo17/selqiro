# Selqiro — kinnitatud V2 avaldamise ja piltide nõuded

Kuupäev: 2026-10-12.
Staatus: kasutaja kinnitatud teostusnõuded; see dokument ei tõenda nende rakendamist ega testide läbimist.
Kinnitus vestluses: „need on väga olulised tähelepanekud, võtame need tegemisel arvesse”.

## Järgmine üks töö

Jätkata olemasoleva V2 kuulutuse lisamisvoo privaatse avaldamiskatse,
kontrollitud piltide ja kinnitatud lõppavaldamise teostusega koos failikoristuse jäljega.
Kasutajale jääb üks „Avalda kuulutus” toiming, mitte kohustuslik nähtav mustandietapp.
Need nõuded kuuluvad samasse töösse; eraldi üldist töövoo- või failihaldusplatvormi ei ehitata.

## 1. Üleslaadimise tee ja serveri kontroll

- Pildibaidid liiguvad brauserist otse privaatsesse Storage'i, mitte ühe suure päringuna läbi Verceli rakendusfunktsiooni.
- Server kontrollib kontot, aktiivset identiteeti ja katse õigusi ning määrab konkreetse failikoha ja piiratud üleslaadimisõiguse.
- Kliendi antud rada, failinimi, MIME või väide „kontrollitud” ei ole volitus ega tõend faili sobivusest.
- Server kontrollib tegelikku failitüüpi, baidimahtu, dekodeeritud pikslite arvu ja töötlemise piire.
- Enne lõppavaldamist kontrollitakse uuesti õigusi, nõutud nõustumisi, täpset hinda ja kõigi valitud piltide valmidust.
- Teenuse täpsed mahu-, aja- ja õiguste kehtivuse piirid peavad vastama teostuses kasutatavale liidesele; seda kinnitatakse päris integratsioonikatses.

## 2. Pildi privaatsus ja kvaliteet

- Avalikuks saab serveris kontrollitud veebipilt, mitte kontrollimata algfail.
- Veebiversioonist eemaldatakse GPS ja muu tarbetu privaatne metadata.
- Foto õige pöörang säilib; seda kontrollitakse päris näidisfailidega.
- Metadata eemaldamine ei anna lubadust eemaldada fotol endal nähtavaid isiku- või asukohaandmeid.
- Algfaile ega vaheversioone ei säilitata tähtajatult ilma määratletud vajaduse ja tähtajata.
- Olemasolevaid avalikke pildilinke või pildihoidla avalikkust ei muudeta pimesi.

## 3. Katse, hilinenud üleslaadimine ja koristamine

- Igal failil on algusest peale serveris jälgitav seos konkreetse avaldamiskatse või kuulutusega.
- Katse lõpetamine, üleslaadimisõiguse tegelik kehtivus ja koristamise ajastus moodustavad ühe kontrollitud lepingu.
- Vormi sulgemist või väljalogimist ei käsitleta tõendina varem väljastatud üleslaadimisõiguse tühistamisest.
- Hilinenud või korratud üleslaadimine ei tohi avaldada tühistatud sisu ega tekitada jälitamata faili.
- Kinnitatud faili ei tohi pärast kontrolli teise faili vastu vahetada.
- Koristamise täpsed failiviited salvestatakse enne lähteseoste eemaldamist; failid eemaldatakse Storage API kaudu.
- Koristamine on püsiv, piiratud ja kordusturvaline; takerdunud töö jääb halduses nähtavale.
- Võrgu ajapiirang ei tõenda faili puudumist ega ebaõnnestunud andmebaasikirjutust.
- Katse koristaja ei tohi eemaldada avaldatud või veel kehtiva katse pilte.
- Kuulutuse lõppkustutus eemaldab selle sisu ja tema hallatavad failid; vana kordustaotlus ei taasta kustutatud kuulutust.

## 4. Terve kasutajatee vastuvõtt

Avaldamise tervikvalmidus ei võrdu ühe RPC või build'i läbimisega.
Kontrollida tuleb: lisamine → leidmine → detail ja profiil → müüjale kirjutamine → omaniku haldus → eemaldamine.

- Otsingus, detailis, profiilis ja Minu alas peavad hind, valuuta, pildid, identiteet ning nähtavus olema kooskõlas.
- Kadunud vastuse või topeltvajutuse korral taastatakse sama katse tulemus, mitte ei looda automaatselt uut kuulutust.
- Testides eristatakse müüja, ostja ja sisselogimata külastaja seansse; omaniku ligipääs ei tõenda avaliku vaate korrektsust.
- Kasutaja valitud otsingupiirkond, pakkumise asukoht, keel ja valuuta jäävad eraldi mõisteteks.
- Veateated, korduskatse ja pooleli töö jätkamine peavad olema arusaadavad, ilma vale eduteateta.
- Halduses piisab alguses ebaõnnestunud avaldamiste, ootel koristuse vanuse ja pildimahu näitudest; privaatsisu ei kopeerita logidesse.

## 5. Kulud ja ulatus

Piirata katsete arvu, failide arvu ja kogumahtu, töötlemist, säilitusaega ning korduskatsete sagedust.
Täpsed piirväärtused ja vastuvõtutestid dokumenteeritakse koos teostusega, mitte oletatava juba olemasoleva seadistusena.

Privaatsus, õigused, topeltloomise vältimine, kontrollitud pildid ja koristamine on enne uue avaldamise avamist vajalikud.
Täielik liitumise, suhtlemise, nähtavate tegevuste ja telefonikasutuse kontroll kuulub portaali käivitamise kontrolli.
Energy, maksed, AI, valuuta meeldejätmine ja hinnaotsingu laiendused ei tule käesoleva avaldamisühenduse vahele.
Töötavaid V2 hobuse-, identiteedi-, otsingu- ja omanikuvaateid säilitatakse; V1 täielikku ümberehitamist ei lisata.
Praeguste kontode, testkuulutuste, piltide või operatsioonipäevikute kustutamiseks see kinnitus luba ei anna.

## Üleandmise piir

See on väline otsuselisa vestluses juba kirjeldatud üleandmise juurde, mitte selle uus täislähtekoodi koopia.
Selle koostamisel ei loetud ega muudetud kasutaja repositooriumi, GitHubi või productioni andmebaasi.
Ei koostatud käivitatavat paigaldajat ega tehtud SQL-, build'i-, brauseri- või Storage HTTP-teste.
Varasemat keskkonnatõrget ei käsitleta tõendina teostuse puuduse või kasutaja vea kohta.
Järgmine teostus peab enne kirjutusi kontrollima tegelikku lähtekoodi ja Git-seisu; lõpetatud skripte ei korrata.
