# Teostuse ettevalmistus on valmis

23.11.2026. Selle kavandi väike serverimuudatus on nüüd ette valmistatud ja sihitult kontrollitud. Kehtiv teostusleping on `account-public-profile-fence-v1.md`; Maci käik ja pilve rakendus on veel ootel. Allpool säilib varasem kavand ajaloo ja ulatuse põhjendusena.

---

# Järgmine väike moodul: avaliku profiilikaardi konto-oleku piir

Koostatud 23.11.2026. See on ainult lugemisel põhinev rakendusotsus; lähtekoodi,
pilve ega väljastatud pakette siin ei muudeta.

## Otsus

Järgmine moodul lisab konto olemasolu ja aktiivsuse kontrolli **avaliku profiili
põhilugejasse `get_store_by_slug`**. Sama piir rakendub selle lugeja kaudu juba
praegu `get_public_profile_media_v1` meediaprojektsioonile. Uus privaatne
kontrollfunktsioon ning ühe olemasoleva lugeja piiratud muudatus on piisav.

See on esimene avaliku lugemise piir, mitte veel konto sulgemine ega kõigi avalike
andmete peitmine. Sulgemise/taastamise nuppe, uut sisselogimist, rollihaldust või
konto sisu eelvaate süsteemi siia ei lisata.

## Praegune alus ja mida see muudab

Vanem konto elutsükli audit jääb ülejäänud osas kehtima. Uus asjaolu on päriselt
paigaldatud konto oleku alus: vanema lähtepuu `034211d` ja r2 payload'i tulemus
on `4b607828d0b153b84166ba963fdb4e77337e11f0`. Parent on kontrollinud kasutaja
lõpparuannet: üks andmebaasi rakendamine, build ja push on kinnitatud; kasutaja
Verceli Ready/Production ning Minu konto vaate tõendid on saabunud.

Paigaldatud `account_lifecycle_private.account_states` hoiab olekut `active`,
positiivset revisjoni ja Auth konto välisvõtit `ON DELETE RESTRICT`.
Algoleku loomine on eraldi tehtud; lugemine ei tohi puuduvat rida luua ega võtta
seda vaikimisi aktiivsena. Praegune tabel piirab oleku väärtuse ainult `active`-ga.

`account-state-foundation-20261122.md` Edasine järjekord näeb ette avalike lugejate,
kirjutamiste, kontaktide/sõnumite ja välise pilditöö lõppkinnituse katmise enne
sulgemise käsku. Käesolev lõik järgib seda otsust. SMTP ja ettevalmistatud
registreerimine jäävad senisesse selqiro.com etappi.

## Täpne teostuspiir

1. Lisa privaatne, ainult lugev `account_lifecycle_private.account_is_available(uuid)`.
   Funktsioon tuletab kättesaadavuse olemasolevast Auth kontost ning autoriteetsest
   olekureast: olek on `active`, revisjon kehtib, Auth konto ei ole kustutatud ega
   parasjagu blokeeritud. Null/puuduv konto või olekurida annab `false`.
   Säilita konto oleku lugejaga kooskõlaline Auth-kättesaadavuse kontroll.
   Kasuta turvalist `search_path`-i, täielikke skeeminimesid ja `STABLE`-lugemist;
   abifunktsioonile ei anta anon/authenticated/service_role otsest käivitusõigust.
2. Muuda ainult `get_store_by_slug` sobivuse lõppfiltrit. Konto ID on eraisikul
   `identities.user_id`, ettevõttel `business_accounts.owner_user_id`; olemasolev
   valitud rea `block_account_id` kannab seda seost. Tundmatu tüüp või puuduv
   omanik ei tohi sobivaks osutuda. Aktiivse profiili valik ja ettevõtte liikmete
   loend ei määra avaliku profiili konto olekut.
3. **Säilita täpselt valik enne sobivust:** olemasolev materialiseeritud `selected`
   CTE leiab esmalt kanoonilise `identity_profiles.slug` vaste, seejärel legacy
   `profiles.store_slug` vaste ning võtab ühe kandidaadi. Konto kontroll tuleb
   alles valitud kandidaadi lõppfiltrisse. Kättesaamatu kanooniline vaste ei tohi
   avada teise konto legacy-aliast. Ära vii uut filtrit CTE sisse ega muuda sortimist.
4. Säilita olemasolev vastuse kuju, asukoha privaatsus, identiteedi/ettevõtte oleku
   tingimused, mõlemasuunaline blokeerimine, meedia projektsioon ja õigused.
   Sobimatu konto korral tagastab lugeja tühja tulemuse, mitte konto privaatse oleku.
5. `get_public_profile_media_v1` keha ei vaja muutmist: see küsib kanoonilise slugi
   kaudu `get_store_by_slug` tulemust ja kontrollib sama identiteedi ID-d; vasteta
   tagastab `NULL`. Seda delegatsiooni kontrollitakse täpse paigaldatud definitsiooni
   ja sihitud katsega. Olemasolev klient kuvab profiili puudumise vaate; uut
   kasutajaliidest selle serveripiiri jaoks vaja ei ole.

Uued ja vanad kontod kasutavad sama olekurida. Profiilita konto haldus jääb
iseseisvaks; avaliku profiili puudumine ei takista Minu konto vaadet. Ühe konto
mõlemad ajaloolised identiteedid kasutavad sama omanikukonto kontrolli ilma uue
mitme profiili kasutajateekonnata.

## Garantii piir

Pärast seda lõiku arvestavad **kanoonilise avaliku profiilikaardi lugemine ja selle
meediaprojektsioon** konto kättesaadavust. Ühtegi päris kontot ei suleta ega
kustutata. Kõik kolm praegust aktiivset kontot peavad jääma seniselt nähtavaks.

Otse kutsutavad kuulutuste/teenuste/tööde/showcase'i RPC-d, otsing ja vood,
`get_identity_profile_public`, legacy kaardid, ajalooliste sõnumite kuvamine,
kirjutamised ning kontaktid jäävad järgmisteks adapteriteks. Eriti ei delegeeri
profiili pakkumiste lugejad üldjuhul `get_store_by_slug`-ile. Varem väljastatud
avalikud pildi-URLid ei muutu selle filtriga kasutuskõlbmatuks. Konto sulgemise
tegevust ei saa lubada enne nende ülejäänud piiride terviklikku valmimist.

## Konkreetne uus failikomplekt

Kõik SQL failid lähevad uude release'i; ühtegi vana parandust ega väljastatud
räsikaitsega pakki ümber ei kirjutata.

| Fail | Eesmärk |
| --- | --- |
| `supabase/releases/account-public-profile-fence-v1/account-availability.sql` | Üks privaatne konto kontrollfunktsioon ja selle õigused. |
| `supabase/releases/account-public-profile-fence-v1/public-profile.sql` | `get_store_by_slug` säilitatud leping koos lõppfiltri lisaga. |
| `supabase/releases/account-public-profile-fence-v1/preflight.sql` | Praeguse olekualuse, kahe avaliku lugeja ning vajalike omanikuviidete täpne eelseis. |
| `supabase/releases/account-public-profile-fence-v1/apply.sql` | Üks piiratud tehing; loob helperi ja asendab ainult ühe lugeja. |
| `supabase/releases/account-public-profile-fence-v1/verify.sql` | Uue helperi, lugeja, säilinud sõltuvuse ja õiguste järelseis. |
| `supabase/releases/account-public-profile-fence-v1/source-pins.json` | Sisendfailide ja olemasolevate sihtdefinitsioonide kinnitatud räsid. |
| `supabase/releases/account-public-profile-fence-v1/expected-target.json` | Lubatud järelseisu leping. |
| `supabase/releases/account-public-profile-fence-v1/README.md` | Ulatus, eeldused ja tõendi piir. |
| `tests/account-public-profile-v1/fixtures.sql` | Eraldatud sünteetilised era/ettevõtte/legacy-slugi juhud. |
| `tests/account-public-profile-v1/database.test.mjs` | Piiri ja säilinud privaatsuse sihitud andmebaasi kontroll. |
| `tests/account-public-profile-v1/profile-read.test.cjs` | Olemasoleva kliendi tühi profiil, media NULL ja meedia tehnilise vea eristus. |
| `docs/architecture/account-public-profile-fence-v1.md` | Selle väikese lõigu leping ja katmata teed. |

Lisaks muutuvad pärast sisulist sammu ainult tavapärased seisufailid
`docs/continuity/CURRENT_STATE.json`, sellest genereeritud
`docs/99_V2_HANDOFF_NEXT_CHAT.md`, `docs/continuity/HOSTED_PORTAL.md` ja
`docs/selqiro-dev-log.md`. Uuendaja on eraldi uus väljalase sama säilitava
raporti- ja paigalduslepinguga. Rakenduse olemasolevaid vaateid, sõltuvusi,
registreerimist ega olekualuse triggerit ei ole vaja muuta.

## Vajalik tõend ja kättesaadav lähtekood

**Lähtekood on selle lõigu ettevalmistamiseks piisav.** Uut kasutajafailide pakki,
kontode loendit, paroole ega andmebaasi sisu väljavõtet pole vaja küsida.
`get_store_by_slug` ja `get_public_profile_media_v1` täielikud seni viimased kehad
on vastuvõetud allikas olemas; olekualuse täielik SQL on r2 payload'is. Selle
mooduli jaoks ei ole teadmata funktsioonikeha, mida tuleks enne kohaliku töö
alustamist kasutajalt hankida.

Järgmise rakendaja tavapärane värske eelseis peab enne SQL kirjutamist kinnitama
just nende sihtide tegelikud definitsioonid, omanikud/ACL-id ning olekualuse
säilimise. Kohalik lähtekood ei tõenda iseenesest pilve hetke definitsiooni.
Tundmatu erinevus peatab paigalduse; seda ei parandata üldise uuestipaigaldamisega.

Sihitud katsed: aktiivne era- ja ettevõttekonto; puuduv olekurida; Auth puudumine,
kustutamise/blokeeringu märk; puuduv omanik; kehtiv legacy-alias; kättesaamatu
kanooniline vaste koos teise konto sama legacy-aliasega; säilinud blokeerimine ja
asukoha privaatsus; media RPC sama identiteedi kontroll ning `NULL` tulemus.
Negatiivsed juhud on ainult eraldatud andmebaasifixtuurid. Tegelike kasutajate
olekuid ei muudeta. Praegust `active`-ainuväärtuse tabelipiirangut katse jaoks ei
nõrgestata; tulevased suletud olekud ja sulgemise võidujooksud katsetatakse koos
nende tegeliku olekuülemineku lisamisega.

Vajalik build ja brauseris kontroll keskenduvad olemasolevale profiilivaatele ning
aktiivsete profiilide säilimisele. Lõpetatud paigaldusdiagnostikat ega laiu vanu
kontrolle ilma uue põhjuseta ei korrata.

## Allikad

Täpsed failiräsid on vastuvõtupaki failis `evidence/next-module-source-evidence.json`.

- r2 payload: `docs/architecture/account-state-foundation-20261122.md`, eriti
  konto oleku alus ja Edasine järjekord.
- r2 payload: `docs/architecture/account-model-lifecycle-20261122.md` ning olemasolev
  `account-lifecycle-audit-20261122.md`; lihtsa konto ulatus ja säilinud piirid.
- r2 payload: `supabase/releases/account-state-foundation-v1/foundation.sql` ja
  `functions.sql`; päris olekualuse ja Auth-kättesaadavuse leping.
- base: `supabase/repairs/20261120_profile_media/apply.sql`, media lugeja alates
  reast 1113 ja `get_store_by_slug` alates reast 1147.
- base: `src/entities/profile/api/getPublicProfileBySlug.ts`; kanoonilise RPC
  kasutus ning media NULL/tehnilise vea erinev käsitlus.
- base: `src/features/public-profile/model/usePublicProfile.ts` ja
  `components/PublicProfilePage.tsx`; olemasolevad vea, laadimise ja tühja profiili
  vaated. Üksnes visuaalset meedia fallback'i ei kasutata õiguskontrollina.
