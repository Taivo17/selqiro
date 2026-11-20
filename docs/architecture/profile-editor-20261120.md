# Minu profiil: avaliku teksti ja asukoha muutmine

20.11.2026. See dokument kirjeldab eraldi ettevalmistatud profiiliredaktori paketti. Kinnitatud lähtebaas on `d6540333c6a1eace53bfac616c1041a8bd238806`; uus Maci käik, uus commit ja tootmisse jõudmine vajavad oma raportit. Kohalik test ei ole live-teenuse kontroll.

## Vastuvõetud alus

Varasem profiili lugemisprivaatsuse parandus on vastu võetud algse eduka raporti ning sama commit'i `Ready / Production` ekraanipildi põhjal. Kella 19:31 Eesti aja järgi kogutud uus salvestamise kataloog kinnitab sama 1900-faililise lähtepuu ja andmebaasi lugemisprivaatsuse järelseisu. Koguja tegi ühe metadata-päringu; kasutajate profiilisisu ei eksporditud. Kõigi 100 vaadeldud rutiini keha kontrollsumma seostati säilinud kinnitatud lähtekoodiga.

Eelmiste ebaõnnestunud privaatsuskatsete failipaigutuse ja järjestuse probleemid on eduka `d654033` väljastusega lahendatud. Uus pakett ei ava neid päevikuid kirjutamiseks ega taaskäivita vanu pakette. Varasemad lähtefailid, raportid ja väljastused säilivad.

## Kasutaja teekond

„Minu alas”, profiilivalikus ja vanas päises on link **Minu profiil**. Ühtne redaktor avaneb aadressil `/v2/my-area/profile`. Vana `/profile` suunab sellesse vaatesse. Vanast „Minu alast” eemaldatakse konkureeriva asukohavormi sidumine.

Vorm näitab, kelle profiili muudetakse, kas see on eraisiku või ettevõtte profiil, ning olemasolevat avaliku profiili linki. Muudetavad väljad on järgmised.

| Väli | Piir ja käitumine |
| --- | --- |
| Avalik nimi | Kohustuslik, kuni 100 märki; uuendatakse ühes tehingus nii identiteedi kui avaliku profiili nime. |
| Kirjeldus | Valikuline, kuni 2000 märki; reavahetused säilivad ja ühtlustatakse. |
| Veebileht | Valikuline HTTP(S)-aadress, kuni 2048 märki; kasutajanime/parooli sisaldav aadress ja ohtlikud skeemid ei sobi. |
| Riik | Valikuline, kuni 100 märki; täpse ettevõtte asukoha avaldamiseks kohustuslik. |
| Linn või piirkond | Valikuline, kuni 120 märki; täpse ettevõtte asukoha avaldamiseks kohustuslik. |
| Asukoha nähtavus | Peidetud või linn/piirkond. Ettevõttel lisaks täpne avalik külastusaadress. |
| Ettevõtte külastusaadress | Valikuline, kuni 240 märki; avalik ainult täpse nähtavuse teadliku valikuga. |

Eraisiku vorm ei küsi tänava- ega korteriaadressi. Server ei luba eraisiku salvestuses täpset nähtavust ega eraldi aadressiteksti. Eraisiku selgesõnalisel salvestusel eemaldatakse tema profiilirealt varasemad täpsed koordinaadid ja aadress. Vormi avamine iseenesest andmeid ei muuda.

Riik, linn/piirkond, nimi ja kirjeldus on vabatekst. Seda teksti ei esitata automaatselt aadressidest puhastatuna: kui kasutaja kirjutab täpse koduaadressi linnaväljale või kirjeldusse, ei saa üldine vormikontroll seda kindlalt linnaks teisendada. Abitekst palub eraisikul täpset koduaadressi mitte lisada.

Ettevõtte aadress võib jääda omaniku vormis alles ka peidetud või linnapõhise nähtavuse korral. Avalik lugeja annab selle välja ainult ettevõtte `exact` nähtavusega. Olemasolev tundmatu nähtavuse väärtus loetakse peidetuks; nime või kirjelduse muutmine ei avalda selle tõttu asukohta. Asukohateksti muutmisel tühjendatakse vanad koordinaadid, et need ei viitaks eelmisele asukohale. See pakett ei lisa geokodeerimist ega kaarditeenust.

Välislink avaldatakse eristatavalt koos teatega, et selle sihtlehe turvalisust Selqiro ei kinnita. Link kasutab eraldi vahelehte ning `noopener`, `noreferrer`, `ugc`, `nofollow` ja `no-referrer` atribuute. Salvestamine ei laadi sihtlehte serveris alla ega väida, et selle sisu on kontrollitud.

## Õigused ja salvestusleping

Vorm kasutab kahte kitsast RPC-d: `get_my_profile_editor_v1` ja `save_my_profile_editor_v1`. Mõlemad kontrollivad iga päringu ajal tegelikku sisseloginud kasutajat, oodatud aktiivset identiteeti ja omanikuõigust. Eraisiku identiteet peab kuuluma kasutajale. Ettevõttel peab kasutaja olema aktiivse ettevõtte omanik ja aktiivne liige. Profiili tüüp ning muu autoriteet loetakse serveris, mitte ei usaldata brauseri vormi.

Salvestuse `p_patch` on täpselt seitsme tekstivälja objekt. Lisaväljad, valed tüübid, ülemõõduline tekst, keelatud juhtmärgid ja lubamatu aadress lükatakse tagasi. Pilt, kaanepilt, konto liik, omanik, liikmesus, tasuline tase, taseme aegumistähtaeg, profiili püsilink ja auditiväljad ei ole kasutaja kirjutatavad vormiväljad.

Olemasolevat profiili seob `profile_revision` UUID. Salvestus nõuab loetud versiooni; teises aknas vahepeal salvestatud rida annab konflikti. Võrreldakse ka kasutajat ja aktiivset identiteeti. Lukustamine ning sama tehingu nimeuuendus hoiavad ühe salvestuse tervikuna koos. Profiili uuendamise trigger muudab versiooni ka siis, kui rida muudetakse mõne muu lubatud serveritee kaudu.

Puuduva profiilirea lugemine ei loo uut rida. Esimene selgesõnaline salvestus loob selle ainult `null` algversiooniga ja annab puudumisel uue juhusliku profiililingi. Olemasolev mitte-tühi link säilib. Teine sama algversiooniga salvestus ei saa juba loodud rida üle kirjutada.

Avalike profiilide ja õiguste tabelite kliendi laiad kirjutusõigused suletakse. Säilivad vajalikud kitsad algse rea sisestused ning oma keele/aktiivse identiteedi valik koos olemasolevate RLS- ja triggerikontrollidega. Vana laia profiilikirjutaja, vana asukohakirjutaja ning kliendi Premium-kutse loomise/lunastamise tee suletakse. Nende vanad vormikutsed eemaldatakse. See ei muuda kasutajate praegust kontotüüpi ega olemasolevaid tasemeväärtusi. Administraatori serveriteed ja teised teenuserollid jäävad oma olemasoleva kontrolli alla.

## Katkestused, identiteedivahetus ja ebaselge vastus

Brauser seob päringu konkreetse seansi ja identiteediga. Väljalogimine või identiteedi vahetus eemaldab vana vormi kasutusõiguse. Vana hiline vastus ei muutu uue identiteedi profiili andmeteks. Sama identiteedi ajutise kontrolli ajal säilitatakse mustand; uue omaniku konteksti vana mustandit üle ei kanta.

Salvestuse kinnitus peab tagastama oodatud kasutaja ja identiteedi, uue versiooni ning samad normaliseeritud salvestusväljad. Ajalimiit või kahtlane vastus ei tähenda automaatselt, et kirjutus ebaõnnestus. Vorm saab tulemuse uuesti lugeda. Muudetud versioon ja vastav sisu kinnitavad salvestuse; erinev värske sisu annab konflikti. Automaatset salvestuse kordamist ei ole.

Vormi enda lahkumislingid ja lehe sulgemine hoiatavad salvestamata muudatuste korral. See pole kogu rakenduse navigeerimist asendav mustandisüsteem. Vorm ei salvesta isikuandmeid püsivasse brauserimällu ega lisa automaatsalvestust.

## Uuendaja ja kontrollitõendid

Uuendaja kontrollib kogu kinnitatud lähtepuud, indeksit, `main` haru ja remote'i; varasema eduka väljastuse täpset algset raportit; viimase salvestamise koguja algseid result/catalog-faile ja kolme kontrollitud ZIP-liiget; kinnitatud Supabase CLI faile ning värsket andmebaasi metadata-seisu. Koguja manifesti loetakse ZIP-ist, seda ei nõuta ega looda algses kaustas.

Pärast lähtefailide paigaldamist käivitatakse tegelikud rakenduse sihitud testid ja täielik Next.js/TypeScript build. Üks SQL-tehing on võimalik alles nende edu ning uute lähte/remote/CLI/tõendikontrollide järel. Andmebaasi leping kontrollib täpset tuntud enne- ja järelseisu ning teenusesidumise säilimist. Ebaselge kirjutuse järel tehakse ainult sõltumatu lugemine. Commit ja tavaline mitte-sundiv push järgnevad kinnitatud SQL-tulemusele. Ebaselget push'i kontrollitakse remote'i lugemisega, mitte pimesi kordamisega.

Paketi `kontrollid` sisaldab kohalike katsete sisendeid, tulemusi ja allikakontrollsummasid. Rakendustestid käivitavad tegelikke transpileeritud mooduleid sünteetiliste vastustega. SQL-katsed kasutavad eraldatud sünteetilist PostgreSQL/PGlite keskkonda, mille versioon on raportis. Uuendaja juhtvoo katsed kasutavad ajutist kohalikku Git-hoidlat ja kontrollitud testprogrammi. Need ei kasuta kasutaja tegelikku kontot, andmebaasi ega maksesüsteemi.

Tegelik kinnitatud Supabase on PostgreSQL 17.6. Kohalik SQL-mootor võib sellest erineda; versioonipiir on tõendites selgelt kirjas. Täielik build kasutab olemasoleva lock-failiga sobivaid sõltuvusi ja mittetöötavat kohalikku ühendusseadistust. Täpse uue ZIP-i kontroll tõendab paketi terviklust; kasutaja brauseri tulemus ja Verceli `Ready / Production` võetakse vastu pärast käivitamist.

## Edasine töö

Pärast selle väljastuse vastuvõttu järgneb ühtne profiilipildi/logo lisamine, vähendamine, asendamine ja eemaldamine. Seejärel saab sama pilti ning avaliku profiili linki kasutada sõnumites. Praegune pakett ei kustuta vanu pilte ega muuda pakkumiste või sõnumite sisu.

Lihtsam registreerimine eraisiku/ettevõtte valikuga, konto sulgemine ja kustutustähtajad, ettevõtte üleandmine, reklaami hinnakiri ning reklaami/esiletõstmise iseteenindus on eraldi tööetapid. Konto all oleva identiteedimudeli tehniline valmidus säilib. Tasulise AI lisamist ei avata; tavapakkumiste jaoks ei looda uut tasulise konto eeltingimust. Reklaamidele ja esiletõstmisele jääb kokkulepitud fikseeritud pakettide ning riigipõhise erihinna valmiduse suund.
