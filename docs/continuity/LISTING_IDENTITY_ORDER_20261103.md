<!-- SELQIRO_IDENTITY_ORDER_R3_OBSERVED_BASE_20261103 -->
# R3 — täielikult mõõdetud Maci lähtebaas, 03.11.2026

14:50:55 Europe/Tallinn tehtud koondraport katab kõik 973 kandidaadirada ning kõik 950 tegeliku HEAD-i ja indexi faili. Main on puhas; HEAD on 04d7081ce51c6da106f726b21dfbfc21e4576f2e. Enne/pärast snapshoti räsid on võrdsed, kõik tööpuu allikad vastavad Giti blob'idele. Lugemata või piirangu tõttu kopeerimata faile pole. Kõik 22 payloadi vana baasi nõuet sobivad: 14 olemasolevat faili ja 8 uut rada.

R1/r2 peatuse põhjustas arhiivikoopia segiajamine tegeliku hoidlaga. Puudu on 13 vana kontaktiparanduse arhiivifaili ja kaks ajaloodokumenti. Üks olemasolev CONTACT_DIAGNOSTICS_20261029.md erineb: Maci 5227-baidises variandis pole arhiivis hiljem lisatud 278-baidist viiteplokki. Kasutaja tegelik fail säilib muutmata ja on uues manifestis täpselt seotud räsiga 2234841be6c04a7261386c42d408aad0648dd565289a803d6efc1915ad8b5cc5.

Puuduvat vana SQL-kataloogi ei lisata Maci. Praegune skeemikoostaja ja sõnumikaardi/vestluse testifixtuurid kasutavad olemasolevat accepted-contact-fix.sql koopiat; koondraport kinnitab selle päris olemasolu HEAD-is/indexis/tööpuus ning õige aaed2129… räsi. Puuduvad arhiivifailid säilivad üleandmises eraldi ajalugu/offline-only-source all. See ei ole andmebaasi muutus ega uus SQL-käivitus.

R3 source/ taastab 950 tegeliku faili baasi ning lisab sama 22 faili muudatuse, milles 8 on uued; tulemuses on 958 faili. Manifestis on 936 tegelikult olemasolevat kõrvalfaili täpsete räsidega ja 22 täpset payloadi baasikontrolli. R2 HOSTED_PORTAL.md valikuline puudumine on eemaldatud, sest nüüd on olemasolev baas kinnitatud. Puuduvad 15 arhiivirada ei ole paigaldatavad ega kustutatavad failid. Kõik rakenduskoodi ja testide baidid ning uuenda.py täitmisloogika on r1/r2-ga samad.

Koondraport tõendab kohalikku seisu ja kohalikke kinnitatud remote-sihtkohti; võrgu remote-main’i ega pilveseisu ei loetud. Muutmata paigaldaja vaatleb enne kirjutust uuesti main/HEAD-i, täielikku indexit/tööpuud ja kõiki failiräsisid ning nõuab värsket remote-main’i võrdsust. B0a04f jääb tema põlvnemisankruks, mitte tänase HEAD-i oletuseks. Uus manifest loob uue päeviku; r1/r2 väljastused ja peatunud päevikud säilivad.

Varasemad 119+4 rakendustesti, 13 brauserirühma / 20 konteksti ning build on muutmata rakenduskoodi tõend; neid ei korratud. R3 sihitud katsete täpne tulemus on üleandmise kontrollid/r3/verification.json-is. Tegelik Maci build, uus commit/push, Verceli Ready ja kasutaja vastuvõtt on järgmine samm.

## R2 ja R1 ettevalmistuse kirjeldus — säilitatud ajalugu

<!-- SELQIRO_IDENTITY_ORDER_R2_20261103 -->
# R2 — puuduv ajaloodokument, 03.11.2026

Kasutaja r1 raport kinnitab `actual_sha256: null` faili `docs/continuity/INBOX_V1_REVIEW_20261029.md` kohta. Siht oli `/Users/taivo/selqiro`, vaadeldud HEAD `04d7081ce51c6da106f726b21dfbfc21e4576f2e`, algus 13:25:46 Europe/Tallinn. Peatus tekkis esimeses lähtefailide kontrollis enne varukoopiaid, projektifailide kirjutamist, buildi, stagingut, commit'i ja push'i. Eraldi tulemuspäevik loodi ning kohalikku Giti loeti; `commands: []` ei tähenda, et ühtegi käsku ei täidetud.

Põhjus oli tarne lähte-eelduses: assistendi üleandmiskoopia sisaldas muutmata auditidokumente, mida edukas eelmine põhipildipakk ei paigaldanud ega kontrollinud. Nende olemasolu Macis ei olnud tõendatud. Puuduvat auditidokumenti ei ole vaja selle kliendiparanduse jaoks luua.

R2 jätab välja ainult 67 muutmata `docs/**/*.md` räsikontrolli, mille rada ei olnud varasema eduka põhipildipaki guard- ega payload-loendis. 884 ülejäänud räsikontrolli jäävad täpselt samaks: kõik SQL-id (ka docs/database all), JSON-id, rakenduskood, paketid, seadistused, testid ja varem seotud dokumendid. Kõik 22 muudetava faili baasikontrollid säilivad. Ühe erandi täpne laiendus on juba kavandatud `HOSTED_PORTAL.md`: selle tuntud baasi kõrval võib dokumendi luua, kui see puudub nii tööpuust, HEAD-ist kui indexist. Olemasolevat tundmatut sisu ei kirjutata üle.

Tegelik kogu HEAD/index salvestatakse enne kirjutamist ja nõutakse puhast tööpuud. Hiljem lubatakse üksnes täpset 22 faili muudatust. Seetõttu säilivad ka räsiloendist välja jäetud, kuid Macis päriselt olemasolevad jälgitud dokumendid; nende pooleliolev või paigalduse ajal tehtud muudatus peatab jätku. Varem kontrollitud rakenduskood ja paigaldaja Python-kood on muutmata. R2 muudab manifesti ning viit jätkudokumenti. Väljastatud r1 arhiive ega selle peatunud päevikut ei muudeta.

Kontrollid: rakenduse varasemad 119+4 Node-kontrolli, 13 brauserirühma / 20 konteksti, lõplik build ja 20 paigaldajakatset säilivad oma algse kuupäeva ning lähteräsidega. R2 lisakatsed puudutavad ainult muudetud dokumendipiiri ja täpse manifesti paigaldamist ajutises Gitis; üleandmispaki `kontrollid/r2/verification.json` ja toorlogi on nende eraldi tõend. R2 Maci/build/commit/push/Ready on veel kinnitamata. Vana pakki ega SQL-i ei korrata.

## R1 ettevalmistuse kirjeldus ja tõend

# Kuulutuse põhipildi järjekord ja identiteediga seotud vorm — 03.11.2026

## Miks see muudatus

Kasutaja kinnitas 02.11, et olemasoleva foto põhipildiks valimine toimib. Ta soovis valitud foto esimeseks ning teatas, et Taivo Garaaži identiteedil jääb kuulutuse lisamine lukku, kuigi Milline Vedu ning eraldi ühe identiteediga konto toimivad.

Kontrollitud 01.11 lähtekood taastas sama identiteedi varasema avaldamise tulemuse ja keelas vormiväljad. Järgmise kuulutuse nupp oli alles pika vormi lõpus. Vorm ise oli konto-, mitte identiteedipõhine. See on koodis tuvastatud sobiv selgitus; selle ettevalmistuse käigus ei vaadeldud kasutaja live-brauseri sisemist seisu.

Katkenud vestluse assistendi lõpuväited ei sisaldanud taastatavaid uusi koodifaile ega tõendeid. Seetõttu on see uus kontrollitud teostus, mitte väide katkestatud kandidaadi baitide taastamisest. Algse ZIP-i 993 manifestikirjet ning CRC kontrolliti; vana pakk jääb üleandmises muutmata kujul alles.

## Teostus

- `ListingCreateForm` koondab kinnitatud tegutseja ja konto elueaga mustandite kogu. `ListingCreateIdentityForm` kuvab ühe identiteedi väljad.
- `listingCreateDraft` määratleb ühe algse kohaliku vormiseisu; `listingCreateDrafts` hoiab identiteedipõhiseid kirjeid. `useListingCreateDraft` kaitseb hiliseid vanu muutmiskäske põlvkonna ja tegutseja järgi.
- Identiteedikirje säilitab tegeliku `HorseDraftSession` objekti. Seetõttu ei kao salvestatud mustandi ID, edit_revision, baseline, liigulukk ega hiline kinnitatud loomise vastus vahetamisel ära.
- `useOrdinaryPublication` kontrollib konto ja identiteedi kooskõla. Kõva kontekstimuutus peatab vanad käsud sünkroonselt ning sunnib nähtavat piiri uuesti renderdama ka siis, kui tavaline focus-kontroll juba käis. Sama tegutseja focus-kontroll ei vaheta välja fotovaliku DOM-i.
- Lõpetatud või pooleliolev avaldamine ei näita pikka lukustatud uut vormi. Lõpptulemus või jätkamistegevus on kohe päise järel. Käimasolevat katset ei asendata automaatse uuega.
- `reset(onReset)` võtab sama konto/identiteedi Web Lock'i ning võrdleb kinnitatud lõpptulemuse requestKey'd. Teise katse päevik säilib. Sobiva päeviku eemaldamine ja selle saatmise kohaliku sisestuse lõpetamine toimuvad samas sünkroonses sammus.
- Saatmise hetkel seotakse puhastuse õigus konkreetse mustandiväärtusega. Hiljem saabunud fotovalik või uus tekst jääb alles. Teksti ja File-objekte ei lisata avaldamise localStorage-päevikusse.
- `orderManagedListingImagesForDisplay` teeb ainult stabiilse kuvamisjärjekorra. Algne ordinal, URL, failitõend ning serveri CAS-leping ei muutu. Nupp saadab endiselt algse ordinal'i.

## Kontrollid ja tõendi piir

119 sihitud Node-kontrolli ning 4 põhipildi kuvamise kontrolli läbisid. Brauserikatse kasutab tegelikku lehte, hooke, seansse ja API-mooduleid 1440/390/320 px laiuses; ainult SDK vastused ja HTTP on sünteetilised. Kontrollitud on ka hiline vastus, identiteedi vahetus samas sündmuses, hobuse loomise hiline kinnitus, olemasoleva mustandi uuendus, reset aeglase focus-kontrolli ajal ja uuema foto säilimine. Üks varane brauserikatse parandati DOM-ist eemaldamise asemel nähtavuse kontrolliks; see oli katse ebatäpne eeldus. Tõendid on üleandmispaki `kontrollid` ja `browser-check` kaustas selgete kuupäevade ja lähteräsidega.

Uus paigaldaja läbis 20 sihitud katset ajutise päris Giti ja kohaliku bare-remote'iga; npm build oli neis sünteetiline. Eraldi tegelik praeguse kandidaadi build läbis sünteetiliste keskkonnaväärtustega. Esimene build kompileerus, kuid lõpuvisuaali samaaegne muutus muutis lähtevalve negatiivseks; selle logi säilib eraldi ning lõpptõendiks on järgnev muutumatu lähtekoodiga build.

See ei ole Maci, GitHubi, päris telefoni, tootmise, andmebaasi, Storage'i ega Verceli kontroll. Uus rakendamine ja vastuvõtt tulevad kasutaja järgmise käigu kaudu. Vana andmebaasi paigaldajat või SQL-teste ei korratud.

## Alles jäävad piirid

Avatud lehe mustandid ei ole uus püsiv autosalvestus. Lehe sulgemine või täielik taaslaadimine ei taasta File-objekte. Säilinud avaldamispäeviku serveri katse on taastatav, fotod võib vajadusel uuesti valida.

Varasem nurkjuhtum: kui juba saadetud katse päevik kustutatakse väliselt ja kontroller seejärel taasluuakse, ei ole varasema ainult mälus olnud remoteIntent'i taastamine tagatud. See tarne ei lisa uut püsikihti ega väida taastamist puuduva/katkise päeviku korral; selle lahendamine kuulub avaldamise kogu elutsükli jätkutöösse.

Hobuste avaldamine ühisesse otsingusse, avaldatud fotode lisamine/asendamine/eemaldamine ning hosted failide lõppkoristus ja mahu vabastamine on jätkuvalt lõpetamata. Tavalise osalemise vabadus ning Energy/maksete tuum enne V2 avalikku avamist säilivad.

## Üks järgmine tegevus

Uue paigalduspaketi käivitamine, selle tegeliku result.json/commit/push'i ülevaatus, sama commit'i Verceli Ready ning kasutaja brauserivastuvõtt. Pärast seda jätkub kuulutuste terviku arendus; uut dokumentatsiooni-only ringi ega vana teenuseseadistust ei alustata.
