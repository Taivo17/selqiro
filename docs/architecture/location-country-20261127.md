# Asukohaotsing valitud riigi piires

27.11.2026, Europe/Tallinn. **Tooteleping ja järjestatud rakendusplaan.**
Asukoha uus teostus ei ole veel tootmisse paigaldatud. Viimane vastu võetud
rakenduse commit on `7c53643012545c7dfa99ba976e6f2613e3c3a201`.

ASUKOHT-1 metaandmete raport on vastu võetud ja profiili asukohavaliku
teostus ette valmistatud. Selle lepingu ning tegeliku kontrollipiiri leiab
[ASUKOHT-1 teostusest](profile-location-v1-20261127.md). Kasutuselevõtu
juhis on [HOSTED_PORTAL.md](../continuity/HOSTED_PORTAL.md).

## 1. Otsused ja nende päritolu

Kasutaja 27.11 täpsustused on praeguse asukohatöö alus. Need asendavad
26.11 arhitektuuri automaatse üle riigipiiri laienemise ja vanade kuulutuste
asukohtade tuletamise ettepanekud. Vana audit jääb ajalooliseks kooditõendiks.

| Küsimus | Kinnitatud piir |
| --- | --- |
| Kust otsitakse? | Kasutaja valitud riigist. Ülemaailmne otsing jääb hilisemaks. |
| Mis on linn või asukoht? | Otsingu keskpunkt, mille ümber tulemused järjestuvad. Linnapiir ei ole filter. |
| Mida tähendab otsinguringi laienemine? | Järgmised lähimad sobivad tulemused samas riigis. |
| Kuidas kohta valitakse? | Nii riigi kui ka asukoha puhul trükkides avanevad sobivad soovitused. |
| Kust tuleb uue pakkumise esialgne koht? | Aktiivse profiili kord salvestatud põhiasukohast; pakkumise juures saab seda muuta. |
| Kas teenusel võib olla ajutine koht? | Jah, käsitsi määratav ja ajaliselt piiratud, põhiasukohta asendamata. |
| Kes võib avaldada täpse koha? | Ainult ettevõte, teadlikul valikul. Eraisik võib teenust pakkuda ligikaudse kohaga. |
| Kas vanad kuulutused tuleb teisendada? | Ei. Automaatset asukohtade täitmist ega vanade pakkumiste ümbertöötamist ei tehta. |
| Kuidas töö püsib järjepidev? | Üks aktiivne etapp ja üks seisukirje. Järgmine etapp algab pärast eelmise vastuvõttu. |

Ajutise koha algus/lõpp, tehnilised andmeväljad, teenindusala ning allpool toodud
vastuvõtukatsed on selle kokkuleppe teostusettepanekud. Need ei tähenda, et
vastavad funktsioonid juba töötavad või et kõik detailid oleksid varem kokku lepitud.

## 2. Riik piirab, keskpunkt järjestab

| Valik | Tulemus |
| --- | --- |
| Eesti + Valga | Valga lähedased sobivad Eesti pakkumised, seejärel kaugemad Eesti pakkumised. Läti pakkumised jäävad välja. |
| Soome + Helsingi | Helsingi lähedased sobivad Soome pakkumised, seejärel kaugemad Soome pakkumised. |
| Eesti + Paide | Paidele lähimad sobivad Eesti pakkumised, seejärel järgmised kaugused. |
| Jaapan + Tokyo | Sama loogika Jaapani piires; kohanimede teised kirjasüsteemid peavad säilima. |
| Ainult riik, keskpunkt valimata | Kogu valitud riigi tavavaade, selgelt näiteks „Uuemad enne”. Lähedust ega kilomeetreid ei väideta. |
| Valitud riigis sobivaid tulemusi pole | Aus tühi tulemus. Riik ei vahetu ja naaberriigi pakkumisi ei lisata automaatselt. |

Kasutajale sobib selgitus: **„Lähimad enne · Otsime ainult Eestis.”**
Valitud koht kuvatakse täielikult, näiteks „Valga, Valgamaa, Eesti”.
Kui kasutaja soovib otsida Lätist, vahetab ta riigi ja valib seal keskpunkti.

Otsing ei pea tegema peidetud 5/10/25/50 km hüppeid. Server filtreerib
valitud riigi ja kõik muud sobivuse tingimused ning järjestab sobivad
kirjed kauguse järgi. Järgmine leht jätkab järgmiste lähimate tulemustega.
See annab soovitud laieneva otsingu ilma juhuslike raadiusehüpeteta.

Riik kontrollitakse pakkumise kinnitatud avaliku asukoha järgi, mitte
profiili keele, kasutaja kodakondsuse või ettevõtte registriaadressi järgi.
Kohavaliku riigikood ja punkt peavad olema ühe kontrollitud koha osad.
Esimene versioon ei luba kliendil vabateksti riigikoodiga suvalist punkti ümber sildistada.

## 3. Riigi ja asukoha valimine

Kaks ühist välja kuulutustes, teenustes ja töös:

1. **Riik.** Trükkides pakutakse toetatud riike. Näiteks „Soo…” leiab Soome;
   nimekujud „Soome”, „Suomi” ja „Finland” viitavad ühele riigikoodile `FI`.
2. **Linn või piirkond.** Soovitused piirduvad valitud riigiga. Lisaks nimele
   näidatakse piirkonda ja riiki, et samanimelisi kohti eristada.

Riikide nimede otsing kasutab täielikku versioonitud kohalikku riigiloendit
koos keelepõhiste nimetuste ja aliastega. Iga tähe jaoks ei kutsuta välist
geokodeerijat. Millised riigid või turud lubavad konkreetset pakkumisliiki,
jääb eraldi seniseks tootereegliks; ühine riigiloend ei ava hobuste turgu automaatselt.

Koha soovituste allikas peab lubama autocomplete'i ning vajalike kohatunnuste
ja avalike punktide salvestamist. Olemasoleva avaliku Nominatimi päringutee
350 ms trükkimisvoogu ei võeta muutmata üle: selle avaliku teenuse poliitika
keelab autocomplete'i. Pakkuja valik, kasutustingimused ja võimekus on
ASUKOHT-1 konkreetne sõltuvus, mitte põhjendus teiste moodulite alustamiseks.
Tasulist lepingut ega võtmeid selle kavandiga ei looda.

Asukohavaliku kindlad reeglid:

- Riigi muutmine tühistab eelmise valitud koha ja poolelioleva kohapäringu.
  Soome valikul ei tohi Paide koordinaadid salaja alles jääda.
- Nime käsitsi ümberkirjutamine tühistab vana valiku. Uus tekst ei ole
  kinnitatud asukoht enne konkreetse soovituse valimist.
- Riigipiir rakendub päringule ja tagastatud tulemuse serverikontrollile.
  Üksnes „Finland” lisamine otsingutekstile ei ole riigipiir.
- Täpitähed, kirillitsa ja Jaapani kirjamärgid säilivad. Võimalusel toetatakse
  nii Tokyo kui ka 東京 nimekuju; ASCII-puhastust ei kasutata kohanimede identiteedina.
- Aeglane varasem päring ei tohi uuemat valikut üle kirjutada. Valik töötab
  klaviatuuri, puute ja ekraanilugejaga.
- Päringu tõrge ei vali suvalist esimest vastet ega kasuta vaikimisi
  profiili või Eesti keskpunkti. Säiliv varasem valik kuvatakse ausalt.
- Koordinaat `0` on arv, mitte puuduv väärtus. Puuduv koht ei ole `(0,0)`.

## 4. Profiili põhiasukoht, otsingukoht ja pakkumise koht

| Koht | Eesmärk | Mida selle muutmine mõjutab? |
| --- | --- | --- |
| Aktiivse profiili põhiasukoht | Mugav vaikimisi riik ja asula uuele pakkumisele | Järgmisena alustatavaid uusi pakkumisi |
| Otsingu keskpunkt | Koht, mille lähedalt kasutaja praegu otsib | Selle otsingu tulemusi; ei muuda profiili ega avaldatud pakkumisi |
| Pakkumise enda koht | Kauba kättesaamise, tegeliku töö või teenuse osutamise koht | Seda konkreetset pakkumist |
| Teenuse ajutine koht | Teenuse avalikult teatatud koht kindla ajavahemiku jooksul | Selle teenuse ajutist leitavust; põhiasukoht säilib |

Näide: põhiasukoht on Paide. Uus jalgrattakuulutus saab esialgu Paide.
Kui jalgratas asub Tartus, valib avaldaja kuulutusel Tartu. Profiil jääb
Paidesse. Hilisem profiili muutmine Helsingiks ei vii jalgratast Helsingisse.

Asukoht kopeeritakse ainult **puutumata uue mustandi alguses**. Taastatud
mustand, pooleliolev avaldamiskäsk või kasutaja juba muudetud asukoht on
profiili uue lugemise suhtes ülimuslikud. Aktiivse profiili vahetusel ei tohi
eelmise profiili hiline vastus või mustand uue profiili pakkumist mõjutada.

Otsingu viimane teadlik valik võib säilida rubriikide vahel ja tagasi liikudes.
Kui varasemat otsinguvalikut pole, võib nähtavaks algvalikuks pakkuda
aktiivse profiili riiki/asulat. Seda ei salvestata profiili muudatusena.
Käsitsi kohavalik ei nõua seadme asukoha luba; GPS ei ole selle esimese etapi eeldus.

Avaldamisel on üle võetud koht nähtav ja muudetav. Peidetud profiiliaadress
ei muutu eeltäitmise kaudu avalikuks täpseks aadressiks. Ettevõtte täpse
aadressi avaldamiseks jääb eraldi teadlik valik ka siis, kui aadress on profiilis olemas.

## 5. Täpsus ja kauguse aus tähendus

Eraisiku avalik otsingukoht on valitud asula või piirkonna esinduspunkt.
Eraisiku täpset tänava- või kodukoordinaati ei koguta selle funktsiooni jaoks
ega peideta üksnes ümardatud kauguse taha. Avalik järjestus ja kaugus arvutatakse
samast ligikaudsest avalikust punktist. Server tõkestab eraisiku täpse koha saatmise.

Ettevõte võib valida avaliku täpse tegevuskoha, kuid ettevõtte staatus ei ole
ise aadressi avaldamise nõusolek. Õigust hinnatakse aktiivse profiili ja
serveri omanikuõiguse järgi. Eraisiku ja ettevõtte pakkumised on mõlemad otsitavad.

Kaardile sobib „Umbes 12 km Paide keskpunktist”, mitte „12 km sinust”, kui
kasutaja valis Paide käsitsi. Arv on esialgu geograafiline vahemaa, mitte
sõidutee, sõiduaeg või lubatud kohalejõudmise aeg. Ligikaudse asulapunkti
korral ei kuvata meetritäpsust. Piiratud maksimumkauguse valik võib tulla hiljem;
kui see lisatakse, ei tohi otsing seda automaatselt ületada.

Kaugtööd ei järjestata ettevõtte peakontori kauguse järgi. Selle eraldi
kuvamine ja riigipõhine sobivus lahendatakse tööotsingu ühendamise etapis.

## 6. Ajutine teenusekoht: eraldi neljas etapp

Väikese pakkuja jaoks piisab ühest ajutisest asukohakirjest ühe teenuse kohta.
Selle kasutamiseks ei ole vaja sõidukipargi, töötajate rollide ega GPS-jälgimise moodulit.

Näide on **illustratsioon**, mitte päris saadavuse väide:

> Puksiiriteenus. Põhiasukoht: Järvamaa.
> Ajutine koht: Tallinn, Gonsiori tänav.
> Aeg: 27.11.2026 kell 15.00–18.00, Tallinna aeg.

Siin on 18.00 näidis-lõppaeg; kasutaja näites oli määratud ainult 15.00.
Lahenduses tuleb sisestada kehtivuse lõpp, et eilne teade ei jääks tänaseks asukohaks.

- Enne 15.00 võib koht olla nähtav „Tallinnas alates 15.00”, kuid seda ei
  kasutata veel praeguse lähedusena. Otsing kasutab seni kinnitatud põhikohta.
- Ajavahemikus `algus <= serveri aeg < lõpp` kasutatakse aktiivset ajutist
  avalikku punkti. Sama teenus ei ilmu põhi- ja ajutise koha tõttu topelt.
- Lõpu järel või varasel tühistamisel ajutine koht enam ei kehti. Kuvatakse
  põhiasukoht, kui see on olemas, ilma väiteta, et sõiduk on sinna jõudnud.
- Uue ajutise kirje salvestamine asendab eelmise. Täiendavate sõidukite ja
  mitme tulevase peatuse ajakava jääb hilisemaks.
- Salvestatakse algus ja lõpp üheselt määratavate ajahetkedena ning koha
  ajavöönd. Teise ajavööndi kasutajale näidatakse, millise koha kellaaega mõeldakse.
- Kehtivust kontrollitakse serveris lugemisel; üksnes taustakoristus või
  brauseri kell ei ole aegumise piir. Vahemälu ei tohi ajutist kohta üle lõpu näidata.

Ettevõtte jaoks võib ajutine koht olla avalik tänav või aadress, kui see on
teadlikult valitud. Eraisiku jaoks on sama teenus võimalik asula/piirkonna
täpsusega: näiteks „Ajutiselt Paides kuni 18.00”. Täpset tänavat eraisikule ei avata.

Teenuse **asukoht**, **teenindusala** ja **saadavus** on eri asjad. Lähedal
olev puksiir ei pruugi olla vaba. Põhiasukoht Järvamaal ei tohiks peita
teadlikult Tallinna ajutise koha valinud teenust vana põhiala tõttu.
Enne selle etapi teostust määratakse, kuidas teenuse ajutine teenindusala
või aus „Küsi saadavust” kasutustee toimib. Piiriülest teenindusala ei tuletata
automaatselt ettevõtte registririigist ega asukohast.

Valitud riigi piir kehtib ka aktiivsele ajutisele pakkumiskohale. Näiteks
Eesti ettevõtte kontrollitud ajutine koht Helsingis kuulub Soome otsingusse
ainult siis, kui vastav teenus ja selle turureeglid seda lubavad.

Ajutine asukoht ei uuenda teenuse avaldamise tähtaega, ei taasta peatatud
teenust ega muuda ajaloolist avaldamiskviitungit. Praegune teenuse sisuhetktõmmis
on kinnitusega seotud; dünaamilise asukoha lisamisel tuleb seda sidet säilitada.
Eraldi asukohakirje oma revisjoni ja kehtivusega on hinnatav teostusviis,
mitte juba rakendatud andmebaasiskeem.

## 7. Vanad kuulutused jäävad ümbertöötamisest välja

Uus lähedusotsing kasutab ainult uue lepingu kaudu valitud ja salvestatud
asukohti. Vanade kuulutuste tekstist ei tuletata koordinaate ning vanu
mitte-NULL punkte ei loeta automaatselt kontrollitud asukohaks.

Vanade kuulutuste detail, omaniku haldus ja senine avaldamisolek säilivad.
Need võivad jääda senisesse või riigi üldvaatesse ilma kauguseta, kui olemasolev
riigiandmestik seda võimaldab. Neid ei panda uue lähedusloendi ette nullkaugusega.
Kui lähedusotsingu jaoks kinnitatud asukohti veel pole, ütleb vaade seda täpselt
ja pakub selgelt eraldi riigi üldvaadet; see ei väida, et kogu riigis kuulutusi pole.

Hilisem omaniku teadlik asukoha lisamine vanale kuulutusele võib olla eraldi
töö. Selleks ei tehta praegu tagantjärele täitmist ega nõuta vanade kuulutuste parandamist.

## 8. Üks aktiivne tööjärg

Tööseisu ainus lähtekoht on `docs/continuity/CURRENT_STATE.json`.
`docs/99_V2_HANDOFF_NEXT_CHAT.md` genereeritakse sellest. Käesolev fail on
asukoha tooteleping, mitte teine iseseisev staatuste register.

| Etapp | Tulemus ja lõpetamise tingimus |
| --- | --- |
| ASUKOHT-1 — ühine alus | Ühine riigiloend ja kohavalik, serveris kinnitatud koha/riigi/täpsuse leping ning aktiivse profiili salvestatav põhiasukoht. Profiili salvestus, uus lugemine, riigivahetus, identiteedi vahetus ja privaatsus on kontrollitud. |
| ASUKOHT-2 — uued pakkumised | Uus kuulutus, teenus ja töö kasutavad profiili põhiasukoha ühekordset koopiat; muudatus on pakkumisekohane ja salvestub õigesti. Senised avaldamise kviitungid/kehtivus säilivad. |
| ASUKOHT-3 — otsing | Üks riigipiiriga kaugusjärjestus serveris ning sama kasutuskäitumine kuulutuste, teenuste ja töö otsingus. Valga/Soome/lehekülgede kontrollid läbivad. |
| ASUKOHT-4 — ajutine teenusekoht | Käsitsi ajutine koht, algus/lõpp/tühistamine, ettevõtte täpsus ja eraisiku ligikaudsus; aegumine ning põhikoha kuvamine on kontrollitud. |

Iga etapp liigub seisudes **kavand → ette valmistatud → kohalik kontroll →
rakendatud → sama versioon tootmises → vastuvõetud**. Vaid ühest seisust
teise jõudmiseks olemasolevat tõendit arvestatakse. „Build läbis” ei tähenda
automaatselt „tootmises kontrollitud”. Valmis etapi käske ei käivitata uuesti
lihtsalt uude vestlusse kolimise pärast.

ASUKOHT-1 vahetu tehniline ettevalmistus:

1. Üks piiratud ainult lugemise kontroll kehtiva profiili/omaniku/revisjoni
   lepingu ja ruumiandmete võimekuse kohta. Kataloog/õigused/funktsioonide
   kuju; kasutajate aadresse ega vanade kuulutuste ridu ei ekspordita.
2. Kohasoovituste allikas, mis lubab nõutud autocomplete'i ja salvestust.
   Pakkuja või maksumuse valik esitatakse konkreetselt, kui see vajab kasutaja otsust.
3. Kooskõlaline lisatav/asendatav leping ja ühine UI praeguse V2 profiili jaoks.
   Vana V1 kirjutus-RPC jääb suletuks; olemasolevat täpsete võtmetega parserit
   ei lõhuta lisaväljade tagastamisega enne vastava kliendi kasutuselevõttu.
4. Valmisolek ja regressioonikontrollid ainult selle etapi riskide ulatuses.
   ASUKOHT-2–4 teostust selle kõrvale ei alustata.

## 9. Vastuvõtu põhijuhtumid

| Etapp | Kontroll | Oodatud käitumine |
| --- | --- | --- |
| 1 | Eesti/Valga ning Läti vastus | Läti soovitust ega valikut server ei kinnita. |
| 1 | Soome/Hel… | Valik on Soome koht; tekstiline vihje üksi ei piisa. |
| 1 | Riigi või kohateksti muutmine | Vana punkt ja hilised päringuvastused ei jää uue sildi taha. |
| 1 | Tokyo/東京, täpitähed, nullkoordinaat | Nimi säilib; arv 0 ei muutu puuduvaks. Riigi/koha valideerimine kehtib endiselt. |
| 1 | Eraisiku käsitsi saadetud täpne aadress/punkt | Server keeldub; pelgalt UI peitmisest ei piisa. |
| 1 | Profiili vahetus ja hiline vastus | Eelmise identiteedi koht ei kirjuta uut profiili üle. |
| 2 | Profiil Paide, uus pakkumine Tartu | Ainult pakkumise koht muutub; järgmine uus pakkumine kasutab profiili Paidet. |
| 2 | Muudetud/taastatud mustand + profiili värskendus | Kasutaja tehtud valik ega pooleliolev käsk ei kirjutata üle. |
| 2 | Vanad pakkumised | Ei täideta, teisendata ega liigutata. |
| 3 | Eesti/Valga; Valka on lähedal | Kõik läheduslehed jäävad Eestisse. |
| 3 | Soome/Helsingi; lähimaid vähe | Järgmised tulemused on kaugemad sobivad Soome pakkumised. |
| 3 | Kategooria/märksõna/töö liik + teine leht | Kõik filtrid ja nähtavus kehtivad enne kaugusjärjestust ja lehekülge. |
| 3 | Võrdne kaugus, edasi/tagasi, filtri muutmine | Stabiilne viigimurdja, kontekstiga seotud kursor; filtri muutmisel uus otsing. |
| 3 | Puuduv kinnitatud punkt | Kaugust ei leiutata; üldvaade ja lähedusvaade on ausalt eristatavad. |
| 4 | Ajutine koht tulevikus, aktiivne ja aegunud | Kolm seisundit on eristatavad; ajutine punkt kehtib ainult oma ajavahemikus. |
| 4 | Teenus peatatud, konto kättesaamatu või blokeering | Ajutine koht ei tee teenust otsingus lubatavaks. |
| 4 | Ettevõtte täpne / eraisiku ligikaudne koht | Avalik punkt ja kaugus vastavad lubatud täpsusele. |

Serveri lähimad-enne päringu tehnilised detailid valitakse ASUKOHT-3-s
tegeliku andmebaasivõimekuse järgi. Valitud riik, kategooria, märksõna,
töö liik, avaldamise lõppkinnitus, aegumine, konto olek, peitmine ja
blokeeringud rakenduvad enne tulemuslehte. Brauseris ainult juba laaditud
lehe sortimine ei täida kogu andmestiku lähedusotsingu nõuet.

## 10. Kontrollitud lähteallikad

- Kitsas profiili ja ajutise koha audit: `location-country-20261127/profile-location-findings.md`.
- Selle auditi 30 kontrollitud lähtefaili räsid: `location-country-20261127/profile-location-audit.json`.
- Varasem üldine V1/V2 audit asub kontrollitud Git-aluses:
  `docs/architecture/location-search-20261126/`. Selle 26.11 tootesuund
  asendub riigipiiri ja vanade kirjete osas käesoleva kokkuleppega.
- V1 profiili eeltäide: `app/my-page/hooks/useLocation.ts`, `app/sell/page.tsx`.
- V2 profiili ja praeguste kirjutuste piir:
  `src/features/profile-editor/`, `supabase/repairs/20261120_profile_editor/apply.sql`.
- Ajutiste teenuste ajalooline kavand: `docs/architecture/live_services.md`.
- Avaliku Nominatimi kasutuspiirid, kontrollitud 27.11.2026:
  <https://operations.osmfoundation.org/policies/nominatim/>.
- PostGIS-i geograafilise kauguse ühik ja tähendus, kontrollitud 27.11.2026:
  <https://postgis.net/docs/ST_Distance.html>.

Avaliku Nominatimi autocomplete'i keeld puudutab OSMF-i avalikku teenust,
mitte kõiki teiste pakkujate või ise hallatud geokodeerijaid. PostGIS-i
`geography` kaugus on meetrites mõõdetav geodeetiline vahemaa; see ei ole
maanteemarsruut. Need välised allikad ei tõenda Selqiro tootmise konfiguratsiooni.
