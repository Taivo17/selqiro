# Rakendatud ja vastu võetud — 23.11.2026

Commit 87bff3f: üks SQL rakendamine, eraldi verify, testid/build ja push. Sama commit’i Ready / Production ning lehtede avanemine on kasutaja kinnitatud. Täpne vastuvõtt: account-listing-read-accepted-20261123.md. Allpool säilib selle mooduli varasem ettevalmistus; selle ootel-kirjed on ajalugu.

---

# Kavandi teostus on ette valmistatud

23.11.2026. Selle nelja lugeja moodul ja sihitud kontrollid on nüüd ette valmistatud. Kehtiv teostusleping on `account-listing-read-fence-v1.md`; Maci/SQL/Verceli sammud on ootel. Allpool säilib varasem kavand.

---

# Järgmine väike moodul: tavakuulutuse avalik otsing ja üksikvaade

23.11.2026. Ainult lähtekoodi lugemisel põhinev audit ja järgmise töö piir.
Ühtegi lähtefaili, väljastatud paketti, andmebaasi ega kasutaja kontot ei muudeta.

## Üks soovitus

Lisa olemasolev konto kättesaadavuse kontroll **tavakuulutuste kolme
otsingulugeja ja ühe avaliku üksikvaate lugeja** sisse. Kasuta juba lisatud
`account_lifecycle_private.account_is_available(uuid)` funktsiooni muutmata.
See on üks piiratud tavakuulutuse lugemise moodul; uut üldist õiguste mootorit,
kasutajaliidest ega konto sulgemise toimingut pole selleks vaja.

Oluline allikast leitud seos: portaali `/v2/products` otsing kasutab hosted-režiimis
`search_public_marketplace_v1` kombineeritud lugejat. Selle `ordinary` haru loeb
kuulutusi ise ega kutsu `search_public_listings_v2` funktsiooni. Ainult v2 lugeja
muutmine jätaks põhiotsingu katmata.

## Neli täpset sihti

| Funktsioon | Praegune täielik lähtekeha | Selle mooduli muutus |
| --- | --- | --- |
| `public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)` | `supabase/repairs/20261113_provider_controls/05_search_ordinary_v1.sql` | Lisa konto sobivus `matched` kandidaadi tingimusse enne koguarvu ja lehekülge. |
| `public.search_public_listings_v2(text,text,text,text,text,text,integer,integer)` | sama kausta `06_search_ordinary_v2.sql` | Sama piir; v2 hinnamudel säilib. |
| `public.search_public_marketplace_v1(text,text,text,text,text,text,integer,integer,uuid)` | sama kausta `07_search_marketplace.sql` | Muuda ainult `ordinary` haru sobivust enne ühist `matched`, koguarvu ja lehekülge. Hobuste haru jääb baiditäpselt samaks. |
| `public.get_public_listing_detail_v1(text)` | `supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql`, funktsiooni deklaratsioon | Lisa sobivus esimesse ühe kuulutuse lugemisse enne müüja, galerii ja detailide koostamist. Säilita vastuse `item: null` leping. |

Loo uus eraldi release, näiteks `supabase/releases/account-listing-read-fence-v1/`.
Vanad migration/repair/release failid jäävad muutmata. See tabel nimetab allikad,
millest võetakse täpsed praegused kehad; see ei ole vana paigalduse kordamiskäsk.

## Tegelikud klienditeed

- `/v2/products` → `V2ProductDiscoveryPage` → `ListingSearchPage` →
  `usePublicListingSearch` → `searchPublicListings.ts`: hosted-integratsiooni puhul
  kombineeritud marketplace RPC; teises harus v1 RPC. Vea korral ei valita teist
  andmevoogu ega filtreerita kogu tulemust brauseris.
- `getProductListings.ts` säilinud integreeritud haru kasutab v2 RPC-d.
  Seda ei tohi ekslikult nimetada praeguse põhiotsingu ainsaks lugejaks.
- `/v2/listing/[id]` → `useListingDetail` → `getListingById.ts`: integreeritud
  harus üks `get_public_listing_detail_v1` RPC. Edukas puuduv kirje jääb tühjaks
  vaateks, tehniline viga veaks. Selles harus puudub legacy lugemisele tagasilangus.
- Sama detaili RPC-d kasutab serveri `readAnonymousOfferPreview`, mille kaudu
  tuleb värskelt loetav jagamislehe metadata. Kasutaja sessiooni või omaniku
  päringut see ei kasuta. Varem väljastatud metadata/piltide kadumist ei väideta.

Täpsed allikate ja kutsujate failiräsid on `source-evidence.json`-is.

## Omanik ja säilivad reeglid

Konto sobivus peab järgima juba avalikul profiilil kasutatud seost:
eraisikul `identities.user_id`, ettevõttel `business_accounts.owner_user_id`.
Olemasoleva `identities` liitmise kõrvale sobib ettevõtte primaarvõtme järgi
üheselt piiratud liitmine. Tundmatu tüüp, puuduv ettevõte/omanik või puuduv
olekurida annab sobimatuse; varuomanikuks ei võeta kuulutuse autorit ega liiget.
Ära lisa eraldi konto oleku tabelit, vaikimisi aktiivset olekut ega parandust lugemisel.

**Säilita konto blokeerimise senine tähendus eraldi:** nendes tavakuulutuse
lugejates kontrollib `user_blocks` praegu `listings.user_id` autorikontot.
Uue konto oleku kontrolli lisamine ei muuda seda vaikimisi ettevõtte omaniku
blokeerimiseks. Brauseri aktiivne identiteet ei määra avaliku kuulutuse omanikukonto
kättesaadavust. Puudub avaliku detaili omaniku möödapääs.

Säilivad kõik olemasolevad sisendi piirid, `listing_actor_uid_hosted_v1`/v1
`auth.uid()` valik, aktiivse identiteedi nõue, avaldamise olek ning NULL-lõpptähtaja
senine lubamine otsingus ja detailis. Ajutine pakkuja peitmine jääb ainult
otsingusse; see ei sulge tahtlikult avatud detaililinki.

Otsingus jäävad samaks lubatud detailiväljade FTS-abifunktsioon, lihtsõnade AND,
kategooria/alamkategooria/täpse kategooria piirid, seisukord ja linna/riigi
asukohafilter. Praegune järjestus on `newest`, mitte uus relevantsusskoor.
Säilita kuupäeva/ID viigimurdjad ja kombineeritud otsingu content-type/ID järjestus,
suured koguarvud tekstina, `has_more`, `next_offset`, aknapiir ning 1–60 / 0–100000
leheküljepiirid. Uus tingimus rakendub enne lugemist/count/limit/offset; valmis
leheküljelt kaartide eemaldamine rikuks tulemuste koguarvu ja lehekülgi.

Avalik väljade loend, täpse aadressi/koordinaatide puudumine, hinnamudel, galerii
piir ning piltide järjestus jäävad samaks. SQL kontrollfunktsiooni põhjust ega
privaatset kontoolekut ei lisata avalikku vastusesse.

## Suure kasutusmahu jaoks vajalik piir

Uus kontroll jääb samasse serveripäringusse. Ei lisandu brauseri päringut iga
kaardi kohta, üle kõigi kontode tehtavat sobivusloendit, kontode vahemälu ega
kliendipoolset tulemuste peitmist. Säilita `force_custom_plan`, praegused
FTS/filtri tingimused ja olemasolevate indeksite kasutatavus.

Kuid `account_is_available` on `SECURITY DEFINER` funktsioon: iga hinnatav
kandidaat võib lisada funktsioonikutse ja kaks konto võtmeotsingut. Selle
primaarvõtmete varasem kasutatavuse tõend ei tõenda miljonite otsingute läbilaset.
Täpset koguarvu nõudev `matched` CTE käsitleb ka väljaspool parajasti tagastatavat
lehekülge olevaid vasteid. Planeerija ei pea WHERE-tingimusi tekstijärjekorras hindama.

**Enne selle mooduli väljastamist on vaja piiratud võrdlevat päringuplaani kontrolli**
esinduslike sünteetiliste tavakuulutustega: tühi päring, valiv märksõna, valiv
kategooria, paljud sama omaniku kirjed ning anonüümne/autenditud vaataja koos
peitmise ja blokeeringuga. Võrdle vana/uue lugeja tegelikke plaane ja tööd,
eelistatult eristades abifunktsiooni kutsete mõju. Veendu, et konto/ettevõtte
primaarvõtmed ning külmutatud `listings_public_keywords_v1_gin` jäävad kasutatavaks.
Kontrolli ka detaili ühe ID lugemist. Mõõtmine ei pea olema suur koormustest;
selge regressiooni korral tuleb selle piiratud teostus parandada enne avaldamist.

## Eeldused ja sihitud kontroll

Root kinnitab eraldi uue `8dc0b3b` raporti, täispika commit'i/puu, SQL järelseisu,
Ready / Production ja kasutaja pildid. Selle auditi lähtealus on varasem
`4b60782` täielik baas pluss väljastatud profiilipaketi 30-failine payload;
oodatud uus jälgitavate failide arv on 2130. Audit ise ei tee värsket Maci või
pilvevaatlust ega kinnita uut juurutamist allikafailide põhjal.

Tulevane uus paigaldus peab enne kirjutust kinnitama nende nelja sihi täpsed
kehad, signatuurid/ülekoormused, omanikud, konfiguratsiooni ja ACL-id ning senise
konto abifunktsiooni ja vajalike võtmete säilimise. Varase detailiallika kommentaar
„closed candidate” ei tühista sama release'i hilisema `60_preview_authority.sql`
anon/authenticated õiguste andmist. Allikatuletus ja tegelik värske eelseis on
eraldi tõendid. Abi-funktsioonile ei anta selleks otsest kliendi käivitusõigust.

Vajalikud uued eraldatud kontrollid katavad aktiivse era/ettevõttekonto, puuduva
oleku/omaniku, Auth blokeeringu/kustutamismärgi, erineva autori ja ettevõtte
omaniku mõlemad suunad, säilinud peitmise/blokeerimise, lehekülje piiril eemaldatud
kirje koguarvu ning segatud hobuse/tavakuulutuse järjestuse. Detail ja värske
anonüümne metadata peavad sobimatu konto korral jääma tühjaks. Aktiivsete kontode
vastused ja olemasolevad ranged kliendiparserid peavad säilima. Laiu varasemaid
paigaldusi ega testikomplekte ei korrata.

## Teadlikult järgmisteks mooduliteks jääv

Hobuste haru ja detail, teenused, tööd, showcase'id, otse kutsutavad profiili
pakkumiste RPC-d, legacy `get_marketplace_listings`/nearby, `discovery_listings_v1`
voog ja otse tabelist loetav legacy detail ei saa seda piiri automaatselt.
Samuti ei kaeta veel kirjutamisi, kontakti/saatmist, ajaloolisi sõnumikaarte,
välise pilditöö lõppkinnitust, avatud brauseri vahemälu ega varem väljastatud
avalikke pildi-URL-e. Konto sulgemise/taastamise/kustutamise käsk jääb nende
vajalike piiride terviku taha. SMTP paus ning konto tervik → esiletõstmine →
reklaamid järjekord säilivad.
