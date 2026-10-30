# Kuulutusekaart V2 vestluses — 29.10.2026

## Tulemus ja tegelik seis

Kasutaja palus taastada V1 kuulutusekaardi käitumise. Kandidaat ühendab
kuulutuse alt alustatud vestluse, eemaldatava eelvaate ning iga sõnumi juurde
salvestatud pildi, pealkirja, hinna ja kuulutuse lingi.

Kasutaja varasemad pildid kinnitavad juba vestluse 38 avanemist ning Jaani Pood
saadetud teksti lugemist Taivo Garaaži V2 ja V1 postkastis. Seda edukat
kontaktikäiku ega varasemat seadistust ei nõuta uuesti. Käesoleva kaardimuudatuse
Maci paigaldus ja Productioni tulemus on ettevalmistusest eraldi faktid.

## 30.10 paigalduse peatus ja parandatud jätk

Kasutaja käivitas Macis algse paketi. Terminal näitas
`DATABASE_OUTCOME_NOT_VERIFIED` pärast DB lisamise katset. Paigaldaja ei
jõudnud lähtefailide paigaldamise, buildi ega commit/push’ini. Pilt ei näita
DB järelkontrolli sisu; tegelik seis selgub säilinud raportist ja värskest
lugemiskontrollist.

Vana SQLi omanikuvahetus eeldas õigust, millest superkasutajaga test mööda
läks. Täpsed tarnitud SQL-baidid andsid mittesuperkasutaja katses `42501:
permission denied for schema public` ning tehing pöördus tagasi. Parandus
annab piiratud omanikule CREATE õiguse omanikuvahetuse ajaks ja võtab selle
sama tehingu sees tagasi. Enne kinnitamist peab public-skeemi algne omanik
ja ACL täpselt säilima. V2 lugeja sisu ja rakenduskood ei muutu.

Kohaliku tootmisõigusi modelleeriva katse 40/40 kontrolli, jätkaja 30/30
kontrolli ja uus tootmisbuild läbisid. Need ei kinnita veel kasutaja Maci
jätku lõppu või Verceli paigaldust.

## Kasutuskäik

1. **Kirjuta müüjale** avab olemasoleva kontrollitud kontakti ning viib
   `/v2/messages/<conversation>?listing=<listing>` teele.
2. Koostaja küsib serverilt selle konkreetse kuulutuse eelvaate. Näha on pilt,
   pealkiri, salvestatud hinnatekst ja **Vaata kuulutust** link. **Eemalda**
   jätab sisestatud sõnumi alles ja eemaldab üksnes kaardi.
3. Saatja saadab ainult kuulutuse ID. Olemasolev serverifunktsioon kontrollib
   õigusi ja kuulutust ning salvestab selle andmed sõnumi juurde ise.
4. Mõlemad osalised näevad sama sõnumi kaarti. Kinnitatud saatmise järel
   koostaja tühjeneb ja järgmine tavaline vastus ei korda kaarti.
5. Sama osaliste paari teine kuulutus võib kasutada sama vestlust. Varem
   saadetud sõnumid säilitavad oma kuulutuse andmed.

Vestluse pealkirja all on samuti selge kuulutuse link. See kajastab vestluse
praegust konteksti ega ole vanade sõnumikaartide andmeallikas.

Varem V2 kaudu ilma manuseta saadetud tekstid jäävad tekstideks. Neile ei
omistata vestluse viimast kuulutust tagantjärele. Kaardi hinnateksti ei
teisendata ujukomaarvuks, teise valuutasse ega praeguseks kuulutuse hinnaks.

## Pooleliolev saatmine ja konto vahetus

Ebaselge saatmisvastuse korral säilib sama konto, identiteet, päringuvõti,
tekst ja kuulutuse ID. Kasutaja saab korrata sama saatmist; klient ei tee
automaatset uut saatmist. Vahepealne värskendus ei asenda manust teise
kuulutusega. Kui kaart muutub kättesaamatuks, võib selle eelvaade kaduda,
kuid ebaselge kirjutuse muutumatut ID-d ei muudeta.

Esimene serveri kinnitatud RPC-keeldumine on eraldi olukord: sõnumit ei
salvestatud, tekst jääb redigeeritavaks ning aegunud kaardi saab eemaldada.
Keeldumine pärast varasemat ebaselget tulemust ei tõenda esimese katse
ebaõnnestumist; sel juhul säilib sama korduskatse.

Konto või aktiivse identiteedi vahetus peidab eelmise koostaja teksti ja kaardi
ning keelab selle saatmise uue konto alt. Hilinenud vastus ei puhasta ega
asenda teise identiteedi vaadet. Tagasi vahetades saab pooleli tööd jätkata.
Teise kuulutuse avamine samas vestluses ei kirjuta sisestatud teksti üle:
koostaja pakub selget valikut pooleli sõnum tühjendada ja uus kaart lisada.

## Rakendus ja ühilduvus

- Serveri leht valideerib algse kuulutuse ID; kliendi `useSearchParams`
  jälgib ka aadressi puhastamist ja sama ID hilisemat uuesti avamist.
- `useListingConversation` haldab koostajat, konto seost, lugemise järjekorda
  ja saatmise korduskatset. Leht komponeerib vaate; kaart on eraldi komponent.
- Uus `getWithListings` HTTP-tegevus kasutab uut
  `get_my_listing_conversation_v2` RPC-d. Vana v1 lugeja jääb muutmata.
- V2 parser valideerib täpse kuju ning konto, identiteedi, vestluse, kursori
  ja päritolukuulutuse seosed. Baasvälju kontrollib sama v1 parser.
- Pildiallikas võib olla olemasolev kontrollitud V2 meediatee või sama
  Supabase’i projekti avaliku Storage’i URL. Muu URL või katkine pilt kuvab
  kaardil asendusteksti; vestlus ei laadi suvalist välist jälgimispilti.
- Piltidel, linkidel ja kaardinuppudel on kitsal ekraanil toimiv paigutus;
  link kasutab tavalist klaviatuuriga ligipääsetavat ankrut.

V1 automaatne värskendus, loetuks märkimine, failimanused ja ülejäänud
postkasti võimalused ei kuulu sellesse kuulutusekaardi muudatusse.

## Andmebaas

Lisandub ainult üks `SECURITY DEFINER` lugeja olemasoleva piiratud kirjutaja
rolli omandis. API käivitamise õigus on ainult `authenticated` rollil.
Lugeja kasutab olemasolevat V1 autoriseeritud sõnumilehte ning täiendab
ainult selle lehe sõnumite ID-sid nende endi salvestatud väljadega.
Valikuline koostaja eelvaade peab olema aktiivne, aegumata, avaldatud ja
kuuluma selle vestluse ühele täpsele kasutaja/identiteedi paarile.

Olemasolev terminalne kuulutuse kustutamine võib kaardi väljad tühjendada;
tekst jääb alles ning lugeja ei taasta kustutatud andmeid kviitungitest või
vestluse päisest. Ajaloolise teise kuulutuse scrub võib toimuda eraldi
vestluse praeguse päise lukust. Lisatud väljad loetakse ühest MVCC vaatest;
uut kuulutuse lukku pärast vestluse lukku ei võeta.

Täielik JSON-leping ja SQL-guard on
`supabase/repairs/20261029_listing_message_cards/README.md` failis. Tootmise
preflight nõuab varasema kontaktilahenduse tuntud parandatud seisu. Uus
lugeja paigaldatakse ühes tehingus ja kontrollitakse enne commit’i üle.
Vana lugeja, saatja, poliitikad, rollid ja kasutaja read jäävad muutmata.

Värske kohaliku arendusbaasi skeem sisaldab sama uut SQL-fragmenti pärast
V1 lugemisliidest. Provenance ja runtime’i räside register on uuendatud.
Olemasolevat kohalikku andmebaasi ei lähtestata ega migreerita vaikimisi;
selle senine kontroll ja vajadus eraldi üle vaadatud uuenduse järele säilivad.

## Kontrollid

- 29.10 varasem 23/23 Node kontroll muutmata rakendusele: uus leping ja olemasolev kontaktidiagnostika.
- 30.10 tootmisbuild `npm run build -- --webpack`: PASS koos TypeScripti ja
  leheandmete koostamisega. Kasutati sünteetilisi keskkonnaväärtusi.
- 30.10: 40/40 PostgreSQL 18.6 / PGlite 0.5.13 kontrolli piiratud paigaldajaõigustega: guard, vana lepingu
  säilimine, mõlemad osalised, iga sõnumi kaart, täpne hind, puuduv eelvaade,
  konto/identiteedi/liikmelisuse/blokeeringu piir, 50+4 lehitsemine ja scrub.
- 30.10: 30/30 jätkaja kontrolli: ajutised Git-hoidlad, kohalikud bare-remote’id,
  sünteetiline SQL-transport, katkestustest jätkamine ja täpne commit/push.
  Selles paigaldajakatses on build asendatud; päris rakenduse build tehti eraldi.
- Kohaliku skeemi 55 sisendi ja 12 runtime-kirje räside kontroll ning
  deterministlik koostamine: PASS. Olemasoleva andmebaasi lähtestamist ei lisatud.
- 29.10 varasem 14/14 brauseri kasutusolukorda muutmata rakendusele: PASS; lehe JS-vigu 0, väliseid päringuid 0.
  Kontrolliti ka esimest kinnitatud keeldumist, hilisemat keeldumist pärast
  ebaselget saatmist ning sama ID uuesti avamist vananenud serveri propsiga.
  Töölaua, saaja ja 390px mobiilivaate kuvatõmmised vaadati visuaalselt üle.

SQL-katse on ühe ühendusega sünteetiline katse. Brauseris on päris muudetud
komponendid, kuid sünteetilised konto-, ruuteri- ja API-adapterid. Päris
kasutaja sõnumeid, pilveandmebaasi või Storage’i päringuid ei tehtud. Ükski
kohalik tulemus ei kinnita ise Maci paigaldust või Verceli Ready olekut.

## Tarne ja üks jätkamiskäsk

Uus `selqiro-postkasti-kaart-jatk-20261030.zip` sisaldab `jatka.py`,
`database.py`, `previous_run.py`, eelmise täpse manifesti, sama rakenduse
lähtefailid ja parandatud guarded SQLi.

```bash
python3 -I -B "$HOME/Downloads/selqiro-postkasti-kaart-jatk-20261030/jatka.py" --publish
```

Jätkaja hoiab vana päevikut lukus ja loeb seda muutmata. Vana käik peab
olema peatunud andmebaasietapis enne lähtekoodi muutusi. Värske DB-seis peab
säilitama kuus algset piiri sõrmejälge; täpselt tuntud olemasolev lugeja
jäetakse paigaldamisel vahele. Tuntud puuduv lugeja lubab ühe parandatud
SQL-katse. Tundmatu seis peatab jätkamise.

Alles kinnitatud DB-toe järel paigaldatakse lähtekood, tehakse build ja
commit `Restore listing cards in V2 conversations` ning tavaline push.
Uus päevik ja varukoopiad jäävad
`~/Library/Application Support/Selqiro/inbox-cards-20261030/<manifest-sha>/`
alla. Algne 29.10 päevik säilib. Parandatud SQLi ei korrata automaatselt
pärast selle enda ebaselget katset ega varem kinnitatud lugeja kadumist.

Pärast `VALMIS` tulemust oota sama commit’i Verceli `Ready` olekut ja vaata
uut kaarti kuulutuse alt alustatud vestluses. Varasem kontakt/saatmine ja
kuulutuse avaldamine on vastu võetud; neid ei avata uuesti seadistusülesandena.
