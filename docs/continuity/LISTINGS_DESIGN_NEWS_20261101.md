# Kuulutused, kujundus ja uudisvoog — 01.11.2026

## Otsus ja tõendi piir

Kasutaja 01.11 täpsustus muudab tööjärjekorda: esimene lõpetatav tervik on
kuulutused koos hobusekuulutustega. Kujundust lihvitakse iga valmiva funktsiooni
juures; lõppu jääb kogu portaali ühtluse kontroll. Varasem järjekord, kus hobused
olid teenuste järel, ei ole enam kehtiv.

See checkpoint sisaldab lähtekoodi lugemist ja tööplaani uuendamist. Uut
rakenduskoodi, andmebaasimuudatust, andmete kustutamist, Maci paigaldust,
commit/push'i ega Verceli avaldamist selle käigus ei tehtud.

Allikas taastati 30.10 kohalikust lähtekoopiast ning kahe vastu võetud 31.10
paketi täpsetest failidest. Mõlema paketi kõik lähteräsid ja kaitstud failid
sobisid (vastavalt 16 payload-faili / 75 kaitset ja 11 / 82). Taastamine ei ole
värske Maci tööpuu ega tootmisandmebaasi vaatlus. Järgmine kooditarne peab enne
kirjutamist kontrollima tegelikku kasutaja tööpuud.

31.10 kasutaja kinnitas fotode lisamist arvutis ja telefonis. Ekraanipiltidel
on ka varem tõrkunud Viofo foto vestluses ning terminalis foto paranduse VALMIS
ja commit `b0a04fccbf354f0480a4b6eb8dd176b3c55383a8`. Klaviatuuri kohal nähtav
kirjutusväli, kuulutusekaart ja suurte fotode vähendamine jäävad vastu võetud
aluseks. Vanu paigaldajaid ega samu vastuvõtukatseid ei korrata ilma uue veata.
Verceli värsket API-olekut ei loetud; kasutaja tegelikku tulemust ei märgita
seetõttu uuesti ootel olevaks.

## Kujundus töö käigus

| Sisuliik | Kinnitatud senine värv | Kasutus |
| --- | --- | --- |
| Kuulutused, sh hobused | Merevaik / soe kollakas-oranž | Avalik otsing, detaili rõhutus, lisamine, Minu ala ja profiili kuulutused |
| Teenused | Türkiis / sinakasroheline | Teenuste vaated ning sama sisuliik Minu alas ja profiilil |
| Tootenäidised | Indigo / sinakaslilla | Näidiste vaated ning sama sisuliik Minu alas ja profiilil |
| Töö | Varasemat täpset tooni kontrollitud allikast ei kinnitatud | Hoida eristatavana; sinine on võimalik uus ettepanek, mitte tõend vana kujunduse kohta |

Ühtne värvimäärang peab jõudma kõigisse sama sisuliigi vaadetesse. Säilitada
pehmed sektsioonitaustad, toonitud servad/pealkirjad ja valged sisukaardid.
Aktiivset asukohta näitavad ka tekst ning valitud menüüolek. Telefoni kitsas
vaates ei tohi rõhutused ja veerised vähendada põhjendamatult sisu ruumi.

Värvi kadumise konkreetne põhjus on uue otsingukomponendi neutraalne ümbris:

- `components/v2/products/V2ProductDiscoveryPage.tsx` kasutab `ListingSearchPage`-i.
- `src/features/product-discovery/components/ProductResultsSection.tsx` sisaldab vana merevaigutooni paneeli.
- `src/features/public-listing-search/components/ListingSearchPage.tsx` tulemuste ümbris seda ei kasuta.
- `src/features/public-profile/components/PublicProfileListingsSection.tsx`, `PublicProfileServicesSection.tsx` ja `PublicProfileProductShowcasesSection.tsx` säilitavad vastavalt merevaigu, türkiisi ja indigo.
- `components/v2/my-area/V2MyAreaPage.tsx` peidab integreeritud režiimis osa teenuste/näidiste plokke. Nende taastamine on ka andmete ja funktsiooni ühendamise töö; seda ei lahenda lihtsalt värvi või lüliti muutmisega.

## Hobused ühises kuulutuste voos

Kasutaja valib sama kuulutuse lisamise tegevuse ja sobiva kategooria. Hobuse
korral ilmuvad vajalikud eriväljad ning põhjalikumad avaldamistingimused ja
kinnitused. Mustandi salvestamine jääb võimalikuks. Tulemuseks on kuulutus
samas portaalis: ühine otsing ja filtrid, detail, müüja profiil, Minu ala,
salvestamine, vestluse alustamine ning sõnumiga kaasnev kuulutusekaart.

Eraldi hobuportaali ega teist kasutaja lisamisteekonda ei tehta. Sisemine
andmetüüp jääb eristatavaks: `horse_offers` ei muutu automaatselt tavalisteks
`listings` kirjeteks. Tüübiga viited peavad toetama nii kuulutuse numbrilist ID-d
kui hobusepakkumise UUID-d. Hobuse müük ja ostusoov säilitavad eri tähenduse:
ostusoovi eelarvet ei esitata müügihinnana ega otsingupiirkonda hobuse asukohana.

Olemasolev seis:

- `src/features/listing-create/components/ListingCreateForm.tsx` sisaldab hobuse erivälju samas vormis, kuid kasutaja valib veel eraldi sisuvariandi. Kategooriast lähtuv esitlus tuleb lõpuni ühendada.
- `src/features/listing-create/components/HorseOfferPublicationGate.tsx` salvestab nõustumisi, kuid ütleb õigesti, et avaldamine pole ühendatud.
- `src/features/my-area/components/MyAreaListingsSection.tsx` ja `get_my_marketplace_items_v3` juba koondavad mõlemad tüübid.
- `supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql` avalikud otsingu-, detaili- ja profiilivaated on veel tavakuulutuste ulatusega.
- `src/server/listing-publication/contact/contactListing.ts` kasutab tavalise kuulutuse viidet. Hobuse avaldamisnupu ühendamisest üksinda ei piisa.

## Uudiste tähendus

Uudised näitab nende profiilide värskeid avalikke postitusi, keda parajasti
valitud identiteet jälgib. Uudised saab oma V2 vaate; see ei vii avalehele.
Jälgimise lõpetamine ja identiteedi vahetamine peavad kajastuma voos. Tühja voo
vaade selgitab jälgimist ning juhatab profiilide leidmiseni.

`app/feed/page.tsx` V1 lahendus loeb `store_follows` seoseid aktiivse identiteedi
järgi ning pärib jälgitavate aktiivseid, aegumata kuulutusi uusimad ees. See on
kasutatav alus, kuid ei tõenda kõigi avalike postituste üldise voo valmimist.
Muud avalikud sisuliigid tuleb ühendada nende tegelike avaldamisvoogudega;
näidisandmeid ega privaatset sisu ei esitata päris uudistena.

`components/v2/layout/V2Header.tsx` suunab praegu nii Uudised kui Töö aadressile
`/v2`. Seega on parandada ka Töö lingi käitumine: tegelik siht või selge
mittetoimiv olek. Töö täismooduli lisamine pole selle märkuse automaatne nõue.

## Päris logod ja aktiivne identiteet

V1 sõnumid ja avalik profiil loevad `identity_profiles.avatar_url` välja.
Profiili salvestamine uuendab samuti seda välja. V2 sõnumi `identity_card` ja
identiteedivaliku RPC loevad `identities.avatar_url` välja. Väljade erinevus
selgitab koodis, kuidas profiilil võib logo olemas olla, kuid V2 näitab initsiaali.
Tootmisridade sisu selles vaatluses ei loetud.

Allikad: `app/messages/page.tsx`, `app/messages/[conversationId]/page.tsx`,
`app/profile/page.tsx`, `supabase/migrations/20260722173530_baseline_20260722.sql`
(`get_identity_profile_public`, `get_my_identities`, `save_my_active_identity_profile`)
ja `supabase/repairs/20261030_messaging_restore/changes.sql` (`identity_card`).

Parandus peab ühendama olemasoleva profiililogo postkastis, vestluse päises,
saatja reas ning identiteedivalikus. Algustäht jääb varuvariandiks, kui logo
puudub või ei avane. Säilitada autentimine, identiteediõigused ja lubatud
fotoaadresside kontroll; logo pärast ei avata piiramatut välist URL-i.

Läbiv nõue: nähtav nimi/logo ning toimingu tegelik identiteet peavad kattuma.
Kuulutuse loomine/haldamine, sõnumi saatmine, jälgimine ja uudisvoog lähtuvad
valitud identiteedist. Identiteedi vahetamisel ei avaldata ega saadeta vana
mustandit uue identiteedi nimel. Sama kehtib teises brauseriaknas vahetamisel.

## Järgmine tööjärjekord

1. **Kuulutuse põhivoog.** Lisamine ja fotod, otsingust leidmine, detail, muutmine (ka pildid), olekud, eemaldamine ja failide lõppkoristus/mahu vabastamine. Taastada samades vaadetes merevaigutoon ja ühtne menüüolek. Praegune `IntegratedListingEditPage.tsx` ütleb, et avaldatud pilte muuta ei saa; `multipartPublicationImages.ts` hoitud koristusharu tagastab veel `pending` ja teadmata failiarvu.
2. **Hobused sama terviku sees.** Ühendada olemasolev vorm, reeglistikuversioonid/kinnitused, pildid ja avaldamine, seejärel ühine otsing/detail/profiil/haldus/kontakt/kaart. Kontrollida kogu müüja ja ostja teekonda arvutis ning telefonis. Etappi ei loeta lõpetatuks ainult mustandi salvestamise põhjal.
3. **Kuulutuse suhtlus ja profiil.** Ühendada päris logod kõigis vastavates kohtades ning kontrollida identiteedivahetust ja eemaldatud kuulutuse viidet. Vastu võetud sõnumifotode ja klaviatuuri käitumine jääb aluseks.
4. **Uudised ja ülejäänud sisuliigid.** Aktiivse identiteedi jälgitavate avalik voog; teenused, tootenäidised ning nende Minu ala/profiili kooskõla. Avaldamata moodulite lingid ei tohi matkida toimivat sihti.
5. **Ülejäänud kokkulepitud V2 käivitustööd.** Uue kasutaja konto ja taastamine, õigused/haldus, Energy/maksed ning kokkulepitud AI abi. Need järgnevad põhivoogudele; Energy/makse tuuma ei tõsteta vaikimisi avaliku käivitamise järgsesse aega. Lõpus terviku funktsionaalne ja visuaalne kontroll.

Kujunduse nähtavad lisapuudused: kasutajavaatesse jäänud tehnilised checkpoint-
tekstid, profiili näidisuudised ja asukohaplokk ning segakeelsed kategooriad/
tühjad olekud vajavad puudutatava vaate valmimisel päris andmeid või ausat
tühja olekut. Hinnast puuduvat valuutat ei oletata EUR-iks.

## Testandmete tingimuslik eemaldamise luba

01.11 kasutaja lubab eemaldada kõik vanad testkuulutused ja testsõnumid, kui
need tekitavad probleemi. See on uus, tingimuslik luba ning asendab nende
objektide varasema üldise kustutamiskeelu selles ulatuses.

Enne teostust peab olema teada konkreetne põhjus, kirjete ulatus ning seotud
failide/viidete sõltuvused. Luba ei laiene kontodele, identiteetidele, logodele,
teenustele, tootenäidistele, tööpäevikutele ega muudele failidele. Ainult nende
eemaldatavate testobjektide juurde kuuluvate kasutuseta piltide koristus saab
kuuluda samasse piiritletud töösse. Sama antud luba ei küsita uuesti, kui
konkreetne tegevus sellesse ulatusse mahub.

Praegu kustutamist ei tehta: värvi kadumine ja logode allikaerinevus on
teostuse puudused, mida testandmete eemaldamine ei paranda. Koristuse õnnestumist
ei tohi järeldada üksnes kadunud reast või nullväärtusega koondloendurist.

## Täpsed taastamise viited

- `selqiro-sonumid-parandus-20261031.zip`: SHA-256 `af991b3df8482682e1137527360a93363e5a855e088a320631a97360941636dd`.
- `selqiro-foto-telefon-20261031.zip`: SHA-256 `93d09aa2234b02a0fccd63c881a03d0add827a5adc139de2431e2fc7c9fa60f9`.
- Foto paranduse manifest: `18d961ee6c39805294aa6c3137573ea8800b154073bcd21fc788f29fabf4004f`.
- 01.11 uus tööplaan on praegu assistendi lähtekoopia dokumentides ja kasutaja kokkuvõttes; seda ei esitata Maci/GitHubi tehtud muudatusena.
