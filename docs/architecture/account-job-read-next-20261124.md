> 24.11.2026: kahe funktsiooni teostus on ette valmistatud; täpne leping ja kontrollid
> on account-job-read-fence-v1.md-s. Maci rakendus on ootel. Algne audit säilib allpool.

# Järgmine moodul: avalike tööpakkumiste konto kättesaadavus

24.11.2026 Europe/Tallinn. Piiratud lähtekoodiaudit pärast teenuste lugemismoodulit.
Lähtealus on `a9d86e63ab667545598da8e40ee2a2d0c7365df3`, puu
`e5e7d7d2253c7c89ff09bbd84d3e501674c2de90`, 2227 jälgitavat faili.
See dokument on järgmise sammu kavand; uut tööpakkumiste parandust pole siin
rakendatud ega uut live-andmebaasivaatlust tehtud.

## Üks soovitus

Lisa olemasolev konto kättesaadavuse kontroll avaliku tööpakkumise lugemisele
kahe väikese SQL-funktsiooni kaudu. See lõpetab tööde otsingu, üksikvaate ja
profiili tööloendi sama piirangu, mis on juba ehitatud avalike profiilide,
kuulutuste, hobusepakkumiste ning teenuste lugemisele.

| Muudetav funktsioon | Täpne vastutus |
| --- | --- |
| `jobs_private.visible_to_viewer(uuid)` | Lisa senise omaniku ja kahepoolse blokeerimise kontrolli juurde sama omaniku `account_lifecycle_private.account_is_available(uuid)`. |
| `public.get_public_profile_jobs_v1(text,integer,jsonb)` | Kontrolli lahendatud profiili kanoonilise omaniku kontot enne tööde päringut; sobimatu konto korral sea `identity_value=NULL`. |

Need on järgmise paketi ainsad kavandatud SQL-kehade muudatused. Avaldamise,
omaniku halduse, uue kontakti ja konto oleku muutmise teed vajavad eraldi samme.

## Mida praegune lähtekood tõendab

### Ühine helper katab värsked detaili- ja otsingupäringud

`supabase/repairs/20261121_personal_jobs/03_visibility.sql` ridadel 12–23
lahendab omaniku eraisikul `identities.user_id` ning ettevõttel
`business_accounts.owner_user_id`. See nõuab olemasolevat omaniku ID-d ja
rakendab kahepoolset kasutajablokeeringut. Kontooleku helperit selles veel ei
kutsuta. Töö autor, profiili koostaja, ettevõtte liige ega vaataja aktiivne
profiil ei asenda kanoonilist omanikku.

`supabase/repairs/20261116_jobs_public/04_reads.sql` ridadel 11–15 kutsub
`get_public_job_v1` nii `jobs_private.is_public(j)` kui ka
`jobs_private.visible_to_viewer(j.identity_id)`. Konto kontroll ühises helperis
annab sobimatu konto puhul senise null-vastuse, avalikku RPC keha muutmata.

`supabase/repairs/20261121_personal_jobs/04_reads.sql` ridadel 27–62 kasutab
`search_public_jobs_v1` sama helperit enne järjestust ja lehe piiri. Säilivad
päringutekst, kategooria-, riigi-, linna- ja tööliigifiltrid, aegumise kontroll,
vaataja peidetud pakkujad, `published_at,id` kursor ja üle ühe lehe kandidaadi
põhjal arvutatav `has_more`. Konto kontrolli ei lisata kliendis pärast lehe
saamist, sest see muudaks lehe suurust ja kursori käitumist.

### Profiili ümbris vajab eraldi varast kontrolli

Sama faili ridadel 1–25 lahendab `get_public_profile_jobs_v1` kõigepealt
ühemõttelise aktiivse eraisiku või ettevõtte profiili identiteedi. Tööde
filtreerimine toimub hiljem. Ainult ühise helperi muutmisel võiks sobimatu
konto profiili päring endiselt tagastada `identity_id` koos tühja tööloendiga.

Lisa konto kontroll pärast slugi ühesust ja enne kandidaate. Konto puudumise
või sobimatuse korral peab alles jääma olemasolev kättesaamatu profiili ümbris:
`identity_id:null`, `items:[]`, `has_more:false`, `next_cursor:null`; slugi,
lehe piiri ja `read_at` väljad säilivad. Puuduva või mitmetähendusliku slugi
ning vigase sisendi senine käitumine säilib. Sobimatust kontoolekust ei
väljastata avalikule lugejale privaatset põhjust.

### Kliendileping lubab seda juba

`src/entities/job/model/jobParsers.ts` ridadel 41–65 lubab profiilivastus
null-identiteeti ainult tühjade tulemustega. Lehe piiri, aegumise, järjekorra,
korduvate ID-de ning `has_more`/kursori kontroll jääb rangeks. Uut skeemivälja
ega parseri lõdvendamist audit ei vaja.

`src/entities/job/api/jobClient.ts` ridadel 80–95 eristab detaili null-vastust,
päringu viga ning kehtivat töökuulutust. `getProfileJobs` saadab endiselt slugi
ja ootab kasutaja valitud profiili ID-ga kooskõlalist vastust.
`src/features/jobs/components/JobDetailPage.tsx` ridadel 16–36 eristab
laadimist, viga ja kättesaamatut pakkumist ning pakub tagasiteed vestlustesse
ja tööotsingusse. Null-vastus ei tõenda kindlat „suletud“ põhjust.

`src/features/jobs/model/usePublicJobs.ts` ridadel 8–16 seob lugemise vaataja
võtme, slugi/profiili või otsinguga; `useJobPage.ts` katkestab vana päringu ja
peidab teise võtme vastuse. `PublicProfileJobsSection.tsx` ridadel 9–18 peidab
edukalt loetud tühja tööde sektsiooni. Need on lähtekoodi leiud, mitte selles
auditis uuesti läbi mängitud brauserikatsed.

### Kategooriasõnastik ja jagamise eelvaade

`get_job_categories_v1` (`supabase/repairs/20261116_jobs_public/04_reads.sql`,
read 6–10) loeb ainult `jobs_private.categories` sõnastikku. Seal ei ole
konto järgi arvutatud tööde arve või profiiliandmeid; sellele eraldi konto
väravat ei lisata.

`src/server/sharing/anonymousOfferPreview.ts` ridadel 47–79 kasutab töö
jagamise eelvaate jaoks sama `get_public_job_v1` avalikku päringut. Uus värske
päring pärib konto piirangu automaatselt. See ei tõenda välise jagamisteenuse
vahemälu ega varem avaldatud pildilingi kohest kadumist.

## Autoriteetse SQL-allika kontroll

Auditi 11 kasutatud praeguse tööfunktsiooni lähtekeha SHA-256 vastab faili
`supabase/repairs/20261122_job_owner_read_lock/catalog-pins.json`
`after_facts.functions` vastavale kehale. Selle viimase tööde kataloogi
järelseisu sõrmejälg on
`0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef`.

| Funktsioon | Kontrollitud keha SHA-256 |
| --- | --- |
| `jobs_private.visible_to_viewer(uuid)` | `2bc37565f1d2c8c536d81e9db15acd62d23401e558dbead351c30a0f858731a1` |
| `get_public_profile_jobs_v1(text,integer,jsonb)` | `390f8a41223be4f848205d0ffc0a8ff93edfebd429deb89ef5293bfb43568853` |
| `get_public_job_v1(uuid)` | `1ddb3ffada58508462c32b63a0cb566a5582cd22682fa8c6b1ed86053f3020df` |
| `search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb)` | `ec3d96fe4dc460cef8bd646d8ae376e06e8a0f7320508451d83f711879495fc3` |

Täielikud 11 definitsiooni metaandmed, ACL ning 27 loetud lähtefaili suurused
ja SHA-256 on kaasas failis `account-job-read-next-20261124.sources.json`.
See võrdlus kinnitab failides oleva autoriteetse versiooni valiku. Tänane
teenuste raport ei ole uus tööde kataloogi vaatlus: järgmise Maci uuendaja
eelkontroll peab päris tööde kataloogi ja muutumatud sõltuvused uuesti täpselt
võrdlema. Tundmatule eelseisule uut SQL-i ei rakendata.

## Piirid, mida järgmine moodul säilitab

`jobs_private.is_public(public.jobs)` säilitab avaldatud oleku, tähtaja,
identiteedi, avaliku slugi ning era-/ettevõtte avaliku sisu eelduse. Seda
kutsub ka `jobs_private.contact_snapshot`, mistõttu selle muutmine laiendaks
lugemismuudatuse uue kontakti õigustesse. Järgmine moodul jätab selle keha
muutmata.

Säilivad hiljem parandatud `jobs_private.public_fields` ja profiilipildi
lugemine, Minu ala `get_my_jobs_v1` lukuvaba lugemine, kirjutamise kontrollid,
revisjonid, kviitungid, kalendrikuu tähtajad, täpsed tasusummad, tingimuste
nõusolekud ja ajaloolised sõnumikaardid. Olemasolevaid rolle, liikmesusi ega
legacy kahe identiteediga konto andmeid ümber ei ehitata. Tavakasutajale
uusi meeskonnaõiguste valikuid ei lisata.

## Järgmise rakenduse vajalik tõend

- Üks kahe funktsiooni kaitstud tehing: täpne värske eelseis, muutumatud
  sõltuvused ja ACL, COMMIT-järgne kinnitus ning eraldi lugemisega järelkontroll.
- Eraldatud PostgreSQL-is aktiivne eraisiku ja ettevõtte kanooniline omanik,
  puuduv või sobimatu konto-/Auth-kirje, keelu ajapiir, omaniku puudumine,
  mõlemasuunaline blokeering, peidetud pakkuja ja avaldamise/kehtivuse piirid.
- Detaili, otsingu ja profiili tegelikud vastused läbi muutmata rangete
  parserite; tühi/null-vastus, vigane vastus, kursor, lehe suurus ja konto või
  vaataja vahetuse järel vana vastuse peitmine.
- Piiratud vana/uue tööpäringu mahuvõrdlus koos kandidaatide ja erinevate
  omanike arvu ning tegelike plaanidega. Lehe piirarv ei tõenda iseenesest,
  et õiguskontroll hindab ainult sama palju kandidaate.
- Vajalik sihitud kontroll ja värske build; sama Maci commit'i Ready /
  Production järel olemasolev tööotsing → üksikvaade → pakkuja profiili tööd
  → tagasi. Kontrolli tarbeks päris sisu ega kontosid ei kustutata.

Teenuste eelnev mahuvaatlus (5500 kandidaadi filtrita otsingu mediaan
566,67 → 1105,46 ms) jääb kehtivaks eraldi piiriks. Seda arvu ei kanta üle
tööde päringule mõõtmise ega jõudluslubadusena. See on põhjus teha järgmises
moodulis konkreetne mahu- ja plaanikontroll enne suurt mahtu puudutavat väidet.

## Konto sulgemine on endiselt järgmiste etappide taga

`supabase/releases/account-state-foundation-v1/foundation.sql` read 5–17
lubavad kontoolekuna ainult `active`. Avalike lugemiste katmine ei ava veel
konto sulgemist, taastamist ega kustutamist.

Enne sulgemist vajavad eraldi kontrolli kirjutamise ja lõpliku avaldamise
teed, tegutseja ja saaja konto, vestlused, meedia ning vanad avalikud URL-id,
kehtivad sessioonid, värske autentimine ja sulgemise/taastamise võistlusolukorrad.
Lõplik kustutamine on eraldi andmeliikide, säilitamise ja tegeliku eemaldamise
protsess. Kontrollitud plaan on
`docs/architecture/account-lifecycle-verification-plan-v1.md`, read 111–144.

Selle auditi käigus loeti allikaid ja võrreldi räsisid. Rakenduskoodi, SQL-i,
Maci hoidlat, kontosid ega pilveteenuseid ei muudetud; teste või build'i ei
korratud. SMTP ja e-posti kinnitamise kokkulepitud paus säilib. Pärast konto
elutsükli terviku valmimist jätkub töö kuulutuste esiletõstmise ja reklaamidega.
