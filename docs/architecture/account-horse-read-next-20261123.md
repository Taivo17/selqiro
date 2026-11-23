# Selle kavandi kahe lugeja lähtekood on ette valmistatud

23.11.2026. Täpne uus teostus ja kontrollid: account-horse-read-fence-v1.md. Maci paigaldus, SQL ja sama uue commit’i Ready / Production on ootel. Allpool säilib algne lähtekoodiaudit muutmata; selle not_started kirjeldus on ettevalmistuse ajalugu.

---

# Järgmine väike moodul: hobuste põhiotsing ja avalik üksikvaade

23.11.2026. Ainult lähtekoodi lugemisel põhinev audit. Lähtealus on taastatud
`87bff3f51a01a6953c37096ed32a1017135fd304`, puu
`a6f7b7522cd0e88db25caf88b8dd4e9a48c64d77`, 2154 faili. Maci raporti,
Ready / Production ja kasutaja kontrolli vastuvõtu teeb root eraldi. See audit
ei väida uut Maci, pilve, SQL-i ega brauseri vaatlust.

## Üks soovitus

Lisa olemasolev konto kättesaadavuse kontroll **hobuste üldotsingu harule ja
avalikule üksikvaatele**. Need on üks piiratud kahe serverilugeja moodul.
Tavakuulutuste juba vastu võetud kontroll jääb samaks; konto sulgemist ega uut
üldist õiguste mootorit sellesse sammu ei lisata.

| Siht | Täpne praegune lähteallikas | Muutuse piir |
| --- | --- | --- |
| `public.search_public_marketplace_v1(text,text,text,text,text,text,integer,integer,uuid)` | `supabase/releases/account-listing-read-fence-v1/search-marketplace.sql` | Ainult `horses` kandidaadi konto sobivus enne ühist koguarvu/lehekülge. |
| `public.get_public_horse_offer_v1(uuid)` | `supabase/repairs/20261108_horse_publication/07_public.sql`, üks nimetatud funktsioon | Konto sobivus ühe ID lugemisel enne avaliku detaili koostamist. |

Uus eraldi release võiks olla `supabase/releases/account-horse-read-fence-v1/`.
Vana `07_public.sql` sisaldab ka aegunud ühendatud otsingu deklaratsiooni; seda
faili tervikuna uuesti rakendada ei tohi. Uue combined-lugeja alus peab tulema
87bff3f-ga vastu võetud failist. `ordinary` haru ja ühine `matched`/count/page
ning JSON-vastus tuleb säilitada täpselt; ainult hobuste haru saab uue piiri.

## Tegelikud kasutusteed

- `/v2/products` → `searchPublicListings` → `search_public_marketplace_v1`.
  Hobuste kategooria kasutab sama serveripäringut. Puudub eraldi käivitatav
  `search_public_horses` API. Otsingukaart avab `/v2/horse-offer/{UUID}`.
- `/v2/horse-offer/[id]` → `PublicHorsePage` → `getPublicHorse` →
  `get_public_horse_offer_v1`. Komponent eristab laadimist, edukat `null`-vastust
  ja päringuviga. Omanikuandmete või tabeli otsepäringu varuteed selles lugejas pole.
- Sama lehe `generateMetadata` → `readAnonymousOfferPreview("horse", ...)`
  kasutab sama avalikku detaili RPC-d. Seetõttu saab värske anonüümne metadata
  detaili piirangu kaasa; varem väljastatud eelvaateid ega pildi-URL-e see ei tühista.
- Profiili hobusekaart suunab samale detailile. Kaardi avamine saab uue piiri,
  kuid profiili kaartide hankimine ise jääb eraldi serveriteeks.

**Profiili oluline eristus:** praegune `PublicProfilePage` kasutab
`PublicProfileListingsSection` → `usePublicProfileListingView` →
`getPublicProfileMarketplace` → **`get_public_profile_marketplace_v2`**.
See RPC loeb ordinary- ja horse-harusid ise ega delegeeri üldotsingule.
`get_public_profile_marketplace_v1` jääb samuti lähteõiguste järgi anon/authenticated
kutsutavaks; v2 säilitab selle vanade klientide jaoks. Profiili rubriigid tulevad
`get_public_profile_store_categories_v2` kaudu, millel on marketplace/services
ulatused. Need kolm otselugejat vajavad oma järgmise mooduli kontrolli.

Vana `PublicProfileHorsesSection` küll sisaldab identity-filtriga ühendatud otsingu
kutset, kuid praegusest `src`, `components` ja `app` impordiahelast selle kasutust
ei leitud. Seda ei tohi pidada praeguse profiili hobuste põhivooks. Kanoonilise
profiili kontooleku piir takistab praeguse lehe sektsioonide esmast avamist,
kuid ei asenda nende eraldi RPC-de serveri õiguskontrolli.

## Üks kontooleku allikas ja säiliv tähendus

Kasuta baiditäpselt olemasolevat
`account_lifecycle_private.account_is_available(uuid)` funktsiooni. Hobuse
omanikidentiteet tuleb `horse_offers.identity_id` väljast. Eraisiku omanikukonto
on `identities.user_id`; ettevõttel `business_accounts.owner_user_id` olemasoleva
`identities.business_account_id` seose kaudu. Puuduv seos/olek või tundmatu tüüp
ei anna sobivust. `created_by_user_id` ega ettevõtte liige pole varuomanik.

Senine kahepoolne kasutaja blokeering hindab **avaldajat**
`horse_offers.created_by_user_id`. Konto kättesaadavuse lisamine ei muuda seda
vaikselt ettevõtte omaniku blokeerimiseks. Ajutine pakkuja peitmine jääb
üldotsingu eelistuseks ega pea keelama teadlikult avatud detaililinki.
Avalikul detailil ei teki omaniku möödapääsu.

Säilivad aktiivse identiteedi nõue, `horse_publication_private.is_public`,
`has_current_publication`, kehtiva sündmuse/sisu/piltide lõplikkus ja efektiivne
90 × 24 tunni tähtaeg, sealhulgas senine NULL-tähtaja tuletus. Säilivad viis
pakkumisliiki, EE/EUR piir, otsitava hobuse asukoha ja eelarve tähendus, avalike
väljade loend, galerii järjestus/piir ning täpse asukoha ja privaatsete teede
puudumine. Õnnestunud puuduv hobune jääb **tooreks `null`-vastuseks**, mitte
uueks `{item:null}` ümbriseks.

Ühist `horse_publication_private.is_public` funktsiooni selles moodulis ei muudeta.
Seda kasutavad lisaks otsingule/detailile profiililugejad, meedia `media_binding`,
pakkuja sihi lugemine ja kirjutava kontakti `contact_snapshot`. Ühise funktsiooni
muutmine laiendaks sammu nendesse teedesse ilma nende eraldi lõpetamiseta.

## Leheküljed ja otsingu maht

Sobivus rakendub enne `UNION ALL`, koguarvu ja `LIMIT/OFFSET`-it. Säilita
`created_at DESC, content_type, numeric_id DESC, horse_id DESC`, arvtekstina
`total_count`, `has_more`, `next_offset`, aknapiir ning limiidid 1–60/0–100000.
Brauseris valmilt lehelt hobuste eemaldamine annaks vale koguarvu ja lehekülje.

Uus konto kontroll peab olema seotud konkreetse kandidaadi `h.identity_id`
võtmega. Kõigi kontode sobivuse eelnev läbikäimine, kontode vahemälu ning
kaardipõhine uus võrgupäring ei sobi. Tavakuulutuse LATERAL/OFFSET 0 kogemus
on lähtepunkt; hobuste tegelik plaan tuleb eraldi mõõta. Memoize ei ole
õiguskontrolli eeldus ega garanteeritud korduste ülempiir.

Hobuste olemasolevad indeksid hõlmavad identiteedi/oleku, tüübi, linna, tähtaja
ja `search_vector` GIN-indeksit. Avalik lugeja aga kasutab **teistsugust otsest
`to_tsvector` avaldist**; `search_vector` indeksi olemasolu ei tõenda selle avaldise
indeksikasutust. Neid avaldisi ei asendata selles õiguste muudatuses: väljade ja
otsitava hobuse märksõnade tähendus erineb. Avaldamise lõplikkuse kontroll teeb
ka sündmuse, sisuräsi ja galerii tööd; seda kulu tuleb plaanis näha.

Enne väljastamist on vajalik piiratud vana/uue **päris lugeja** võrdlus
kehtivate sünteetiliste hobuste ja segatud tavakuulutustega: valiv märksõna,
pakkumisliik/identiteet, üks ID, sama omaniku palju vasteid, anonüümne ja
autenditud vaataja ning peitmine/blokeering. Lisa 20 000 mitteseotud
kontot/identiteeti ja kontrolli, et uus konto kontroll ei hakka neid läbi käima.
Funktsioonikutsete arvestus olgu sama tehingu enne/pärast delta.

Eelmise 12 000 tavakuulutuse võrdluse hobuste fixture oli tühi: see ei ole
hobuste mahu tõend. Ühendatud laiotsingu varem mõõdetud 4,25/4,72 sekundi
kaardikoostamise kulu jääb eraldi kohustuslikuks optimeerimiseks enne suuremat
liiklust/sisuhulka. Selle konto mooduli edu ei tähenda miljonite otsingute
läbilaske kinnitamist.

## Vajalik kitsas kontroll ja rakenduse piir

1. Sünteetilise PostgreSQL-i juhud: aktiivne era- ja ettevõttekonto; puuduv
   olek/omanik, Auth blokeering/kustutamismärk, tundmatu tüüp; ettevõtte omaniku
   ja avaldaja erinevus mõlemas suunas. Praegust active-only piirangut ei lõdvenda.
2. Ühe segatud lehe piiril eemaldatav hobune: täpne koguarv, järjestus, järgmine
   leht ja ordinary vastuste täielik säilimine. Kogu konto sobivus toimub enne page'i.
3. Kehtiv sündmus ja pildid, katkine sündmuseräsi/galerii, suletud/peatatud/aegunud
   hobune, NULL-tähtaja senine käitumine; viis pakkumisliiki ja avalike väljade piir.
4. Anonüümne/autenditud/omanikust vaataja, mõlemapidine avaldaja blokeering,
   ainult otsingut piirav peitmine, ebaõige identity-filter ning edu-null vs päringuviga.
5. Tegelike kliendiparserite ja metadata transpordi väike sihitud kontroll:
   sobimatu hobune ei ava varupäringut, tehnilist viga ei esitata avaliku hobusena,
   aktiivse kirje täpsed väljad ja segatud lehekülg säilivad. Rakenduskoodi ei
   muudeta ilma selle auditiga seotud konkreetse vajaduseta.
6. Uus piiratud eelseis peab kinnitama kahe sihi kehad, signatuurid, omanikud,
   ACL-id/konfiguratsiooni ja vajalikud võtmed ning säilitama juba vastu võetud
   ordinary/profiili/konto vundamendi. Ainult kaks asendusdeklaratsiooni ühes
   kaitstud tehingus; eraldi verify; ebaselget kirjutust ei korrata.

Pärast sihitud kontrolli ja uut build'i: üks selle sammu commit/push, sama commit'i
Ready / Production ning olemasoleva hobuse otsingu, üksikvaate, pildi ja profiililt
avamise tegelik lugemiskontroll. Vanade pakettide või laiade testide kordus pole
selle auditi soovitus. Kontosid, kuulutusi, vestlusi ega pilte ei kustutata.

## Alles jäävad lõpetamise tingimused

Eraldi jäävad profiili pakkumiste/rubriikide otselugejad, teenused, tööd,
showcase'id ja legacy-vood; kõik kirjutused, uus kontakt/sõnumid, ajaloolised
sõnumikaardid, avaliku/omaniku meedia ning poolelioleva pilditöö lõppkinnitus.
Varem väljastatud metadata, avatud brauseri olek ja juba saadud pildid ei kustu.
Konto sulgemine, taastamine ja lõppkustutamine jäävad vajalike piiride terviku
taha. SMTP paus ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.

Täpsed praegu loetud lähtefailide SHA-256/Git blob räsid, kahe funktsiooni
deklaratsioonid ja säilitatavate combined-osade räsid: `account-horse-read-next-20261123.sources.json`.
