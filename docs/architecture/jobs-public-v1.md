# Töö, jagamine ja pakkumiste värvid — V1

Kinnitatud suund: 16.11.2026. Rakenduse ettevalmistuse, Maci, andmebaasi ja
Productioni tegelik seis on ainult `docs/continuity/CURRENT_STATE.json`-is.

## Tooteotsus

Töö on esimesest versioonist avalik otsinguvalik. Üks tööpakkumine ilmub
ettevõtte profiilis, tööotsingus ja oma jagatava lingi kaudu. Kasutaja 16.11
otsus asendab 15.11 plaani hoida töö esialgu ainult profiilis ja otseviitel.
Varem väljastatud plaanipakki ei muudeta.

Avaldaja on aktiivse ettevõtte identiteediga kasutaja. See on autorluse ja
õiguste seos, mitte tasuline Business-tase. Tavaline avaldamine, otsing,
jagamine, kontakt ja pikendamine ei nõua Energy ostu.

## Tuttav avaldamine

Vorm kasutab olemasolevat aktiivset identiteeti, keelt, asukoha esitusviisi,
täpset rahasumma/valuuta alust ning avaldamistingimuste registrit. Põhiväljad
on ametinimetus, töö kirjeldus ja töövaldkond. Lisaks saab kirjeldada riiki,
asukohta, kohapeal/kaugelt/hübriidina töötamist, töösuhte tüüpi, töökoormust
ja tasuvahemikku koos valuuta ning perioodiga.

Kasutaja vajutab ühte nuppu „Avalda tööpakkumine”. Serveri ettevalmistusena
salvestatud mustand ja eraldi avaldamine kasutavad kaht püsivat päringutunnust.
Tavapärane kinnitatud salvestus jätkub sama tegevuse raames avaldamisega.
Mustand ei ole kohustuslik eraldi kasutajaetapp. Katkestuse järel kontrollitakse
kviitungit lugemisega ning järgnev kirjutus vajab kasutaja selget jätkamist.

Riikide olemasolev soovitusloend ei ole lubatud riikide piir. Riigi stabiilne
kahetäheline kood ning kasutajale kuvatav nimi on eri asjad. Vaba sisestus
võimaldab ka teisi koode. EN on kasutajaliidese põhikeel ja fallback; ET on
teine keel. Pakkumise teksti ega ettevõtte nime ei tõlgita automaatselt.

Töö tasuvahemik ei ole müügikuulutuse hind. Summa liigub täpse kümnendtekstina,
valideeritakse olemasoleva valuutaregistri järgi ja ei läbi JavaScripti
ujukomaarvuks teisendamist. Puuduv tasuvahemik on lubatud. Uut CV-hoidlat,
kandidaatide haldust, automaatset kandideerimist või fotolaadijat ei lisata.

## Üks autoriteetne tööpakkumine

`public.jobs` hoiab kanoonilist töö UUID-d, ettevõtte identiteeti, sisu,
staatust, revisjoni ning serveri seatud aegu. Töö ei ole koopia teenuse või
müügikuulutuse tabelis. Jagatud aluse taaskasutus toimub identiteedi,
õiguste, tingimuste, raha, sõnumite ja kasutajaliidese väikeste moodulite kaudu.

Brauseril pole tööde tabelisse otsekirjutamise õigust. Avalikud lugemised ja
omaniku käsud on selge sisendi ning väljundiga RPC-d. Server kontrollib igal
kirjutamisel kontot, aktiivset identiteeti, ettevõtte liikmesust ja omandit.
Revisjoni võrdlus kaitseb kahe vahelehe ja hilinenud kinnituse eest.

Päringutunnus on seotud tegeliku konto, identiteedi, toimingu ja kogu muutumatu
sisendiga. Sama tunnuse teine sisu on viga. Kviitung ja kirjutus kinnitatakse
ühes tehingus. `get_my_job_request_v1` on ainult lugemine: teadmata tulemust
ei lahendata uue töö loomise ega automaatse korduskirjutusega. Ajalooline
kviitung ei asenda praeguse omanikurea värsket lugemist.

## Nähtavus ja üks kalendrikuu

Avaldamisel määrab server `published_at` ja ühe UTC kalendrikuu võrra hilisema
`active_until` tähtaja, kasutades kuu lõpu loomulikku kohandust. See pole
fikseeritud 30 päeva ega sõltu avaldaja brauseri ajavööndist.

Avalik detail, profiil ja otsing nõuavad avaldatud staatust, tulevikus olevat
tähtaega, aktiivset ettevõtte identiteeti ning olemasolevaid vaataja
kontoblokeeringu reegleid. Ajutine 24 tunni pakkuja peitmine filtreerib ainult
avastamisotsingut. See ei muutu otseviite või teadlikult avatud profiili
üldiseks ligipääsukeeluks.

Omanik saab pakkumist peatada, lõpetada, muuta ja pikendada. Aegumine rakendub
lugemise ajal; aegunud sisu eemaldamine avalikust otsingust ei oota taustatööd.
Sisu, töö UUID ja varasemad vestlused säilivad.

Pikendus kontrollib täpset revisjoni ja varem loetud tähtaega. Uus tähtaeg on
hilisem väärtustest „praegune tähtaeg” ning „praegu + üks kalendrikuu”. Nii ei
lühenenda varane pikendus olemasolevat tähtaega ega kuhja korduv vajutus kuid.
Pikendus ei muuda algset avaldamisaega, otsingukohta, sisu muutmisaega ega
peatatud/lõpetatud staatust. Aegunud pakkumise avalikuks taastamine vajab
vastavat omaniku tegevust.

## Avalik otsing ja profiil

`/v2/jobs` pakub märksõnaotsingut ja tööle kohaseid filtreid. Server rakendab
avalikkuse, konto blokeeringud, peitmise ja filtrid enne lehekülje võtmist.
Avalik järjestus on `published_at DESC, id DESC`; kursor säilitab ka võrdse
avaldamisaja korral kindla järjekorra. Lehekülg on piiratud, järgmine kursor
antakse ainult siis, kui leidub järgmine tulemus. Sügavat OFFSET-pagineerimist
ega kogu tabeli brauserisse laadimist ei kasutata.

Tühi portaal, filtritele vastete puudumine ja laadimisviga on eraldi seisud.
Tühi töövaade selgitab võimalust ja pakub lisamist. Filtritega nulltulemus
pakub filtrite muutmist; laadimisviga pakub uuesti lugemist. Näidistöid ei
esitata päris avaldatud pakkumistena.

Marsruudid:

| Vaade | Tee |
| --- | --- |
| Avalik tööotsing | `/v2/jobs` |
| Ühe töö avalik detail | `/v2/job/[id]` |
| Omaniku tööpakkumised | `/v2/my-area/jobs` |
| Lisamine | `/v2/my-area/jobs/new` |
| Muutmine | `/v2/my-area/jobs/[id]/edit` |

## Jagamine kõigil pakkumistel

Ühine jagamise moodul koostab pakkumise liigi ja identifikaatori põhjal puhta
kanoonilise avaliku lingi. Kopeeritavasse URL-i ei kanta üle brauseri päringu-
parameetreid, fragmente, seansiandmeid ega omaniku muutmisvaadet.

Kasutaja vajutus avab toetatud seadmel Web Share jagamisvalikud. Tühistamist
ei nimetata veaks ega eduka jagamise tõendiks ning see ei käivita varjatult
kopeerimist. Muul juhul saab lingi kopeerida; edu näidatakse alles clipboard'i
lubaduse õnnestumisel. Kui kopeerimine pole kättesaadav, saab nähtava lingi
käsitsi valida. Rakendus ei avalda kasutaja eest sotsiaalmeediapostitusi.

Serveri sotsiaalse eelvaate meta kasutab ainult anonüümset, ühe avaliku
pakkumise lugemist. Avaldamata või kättesaamatust pakkumisest ei tagastata
omaniku sisu. Autoriseerimise, seadistuse või lugemise vea puhul kasutatakse
geneerilist Selqiro metaandmestikku. Privaatset tokenit, service-role võtit ega
tabeli otsepäringut selleks ei kasutata. Metaandmete olemasolu ei tõenda ühegi
sotsiaalvõrgu tegelikku eelvaadet või välise deployment-kaitse puudumist.

## Ühised värvid ja vestlus

`src/shared/marketplace/offerTheme.ts` on pakkumise toonide ühine allikas.

| Pakkumise liik | Aktsent | Kasutus |
| --- | --- | --- |
| Tavakuulutus ja hobusepakkumine | Merevaigukollane | Lisamine/avaldamine, liik, kontekstikaart |
| Teenus | Türkiisroheline | Lisamine/avaldamine, liik, kontekstikaart |
| Tööpakkumine | Sinine | Lisamine/avaldamine, liik, kontekstikaart |

Värviga käib kaasas loetav pakkumisliigi nimetus. Sõnumimullide enda/teise
poole paigutus ning toon jäävad saatjat eristama. Kogu vestluse varasemaid
mulle ei värvita jooksva pakkumiskonteksti järgi ümber.

Tööga seotud kontakt kasutab olemasolevat konto- ja identiteedipõhist kanalit,
õiguskontrolli, blokeeringuid ja vastusekaitseid. Kontakt ei saada automaatselt
esimest sõnumit. Töö on eraldi UUID-põhine kontekst; seda ei teeselda numbrilise
müügikuulutuse ID-na. Vestluse uus lugemis-RPC on additiivne v2-wrapper ja vana
v1 leping säilib. Iga ajaloolise sõnumi pakkumiskaart jääb selle sõnumi juurde,
ka siis, kui sama osapoolte vestlus läheb hiljem teisele pakkumisele.

## Rakendamine ja tõendid

Uus SQL asub eraldi `supabase/repairs/20261116_jobs_public/` all. Vanu
väljastatud migratsioone ega pakke ei muudeta. Uuendaja kontrollib tegelikku
Maci/Giti alust, teeb vajalikud uue kliendi kontrollid ja build'i, seejärel
ühe lisava SQL-tehingu ning sõltumatu lugemiskontrolli enne commit/push'i.
Auth-skeemi olemasolevaid hallatud õigusi ei jagata ümber.

Kadunud SQL-vastus tähendab teadmata tulemust. Jätk loeb täpset paigaldatud
lepingut; tuvastatud sama paigalduse korral läheb edasi, ebaselge või puuduva
tulemuse korral peatub. Vana paigaldust ei korrata pimesi. Täpne tõendipiir,
kontrollitulemused ja järgmine tegevus jäävad ühe seisujuhi juurde.
