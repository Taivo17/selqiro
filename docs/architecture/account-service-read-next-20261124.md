> 24.11.2026: kolme funktsiooni teostus on ette valmistatud; täpne leping ja kontrollid
> on account-service-read-fence-v1.md-s. Maci rakendus on ootel. Algne audit säilib allpool.

# Järgmine moodul — teenuste avaliku lugemise konto kontroll

24.11.2026. **Lähtekoodiaudit ja kavand; teostust ega paigaldajat siin ei ole.**
Järgmise paketi alus on raportiga seotud commit `0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a`,
puu `6d213969675d86eea8e2ff56b99f9a232715b3a8`, 2202 faili. Raporti ja Ready / Production
vastuvõtmine kuulub eraldi tõendisse. Selle auditi täpsed lähtefailid ja funktsioonikehade
räsid on kõrvalfailis `account-service-read-next-20261124.sources.json`.

## Üks parim järgmine samm

Valmistada ette **üks kolme funktsiooni teenuste lugemismoodul**:

1. Lisada `service_publication_private.visible_to_viewer(uuid)` olemasoleva omaniku
   ja kahepoolse blokeerimise kontrolli juurde `account_lifecycle_private.account_is_available`.
2. Lisada `get_public_profile_services_v1(text,integer)` ette üks profiiliomaniku konto kontroll.
3. Lisada sama varane kontroll `get_public_profile_services_v2(text,uuid,integer,integer)` ette.

Konto oleku ainus allikas jääb olemasolevaks `account_is_available` funktsiooniks.
Eraisiku omanik on `identities.user_id`; ettevõttel `business_accounts.owner_user_id`.
Autor, profiili koostaja, aktiivne liige ega päises valitud identiteet ei asenda omanikku.
Puuduv omanik või konto peab andma eitava tulemuse, mitte möödapääsu. Uut kontooleku
vahemälu ega kliendi kontopäringut pole vaja.

Ainult ühise helperi muutmine peidaks teenused, kuid jätaks profiiliteenuste v1/v2
vastuses `profile_available=true` ja `identity_id` alles. Seepärast kuuluvad need kaks
varast profiilikontrolli samasse väikesesse moodulisse. Sobimatu konto korral jäetakse
`identity_value=NULL`; olemasolev ümbris annab `profile_available=false`, null-identiteedi
ja tühjad tulemused. Puuduv või mitmetähenduslik slug lahendatakse endiselt enne
konto kontrolli. Sisendivead jäävad vigadeks.

## Täpsed autoriteetsed SQL-allikad

Kõik teed on praeguse lähtepuu suhtes. Koondatud `apply.sql` ja vanad lab-failid ei määra
uuemat keha; versioonid tuleb live-eelseisus uuesti täpselt kinnitada.

| Funktsioon | Praeguse keha allikas | Järgmise mooduli roll |
| --- | --- | --- |
| `visible_to_viewer(uuid)` | `supabase/repairs/20261108_service_publication/06_reads_status.sql` | Ühine täiendatav teenuse omaniku lugemiskontroll. |
| `get_public_profile_services_v1(text,integer)` | `supabase/repairs/20261109_service_profile_polish/01_service_order.sql` | Säilitada loomisaegne `created_at DESC,id ASC` järjestus ja v1 ümbris; lisada profiili eellugemine. |
| `get_public_profile_services_v2(text,uuid,integer,integer)` | `supabase/repairs/20261111_service_store_categories/02_profile_services.sql` | Säilitada rubriigipuu, koguarv, lehekülg ja range v2 ümbris; lisada eellugemine. |
| `get_public_service_v1(uuid)` | `supabase/repairs/20261108_service_publication/06_reads_status.sql` | Keha säilib; uus helperi tingimus annab sobimatu teenuse korral senise null-vastuse. |
| `search_public_services_v1(text,text,text,text,text,integer,integer)` | `supabase/repairs/20261113_provider_controls/08_search_services.sql` | Keha säilib; ka ajutiselt peidetud teenusepakkujate välistus säilib. Konto kontroll toimub enne koguarvu ja lehekülge. |
| `get_public_profile_store_categories_v2(text,text,integer,integer)` | `supabase/releases/account-profile-marketplace-read-fence-v1/profile-store-categories-v2.sql` | Juba paigaldatud profiiliomaniku konto kontroll säilib; services-haru kutsub lisaks sama viewer-helperit. |
| `is_public(uuid)` | `supabase/repairs/20261111_service_activity/01_state.sql` | Muutmata: aktiivne identiteet, published, kehtiv 365-päevane periood ja avaldamise/fotode lõplikkus. |

`visible_to_viewer` ja `is_public` keharäsid vastavad praeguse profiililugejate release’i
`expected-contract.json` sõltuvuspinnidele. Need on `postgres` omandis olevad STABLE
SECURITY DEFINER SQL-funktsioonid, fikseeritud `pg_catalog,pg_temp` otsinguteega.
Helperitel säilivad ka senised final-writer EXECUTE õigused; õigusi selle sammuga ei laiendata.

## Tegelikud kliendirajad

- **Otsing:** `/v2/services` → `V2ServicesPage` → `useServiceDiscoveryView` →
  `usePublicServiceSearch` → `searchPublicServices` → otsingu RPC.
- **Üksikvaade:** `/v2/service/[id]` → `ServiceDetailPage` → `getPublicService` → detaili RPC.
  Anonüümne jagamise eelvaade kasutab sama RPC-d lubatud avaliku võtmega.
- **Praegune avalik profiil:** `PublicProfileServicesSection` → `usePublicProfileServiceView`
  → `usePublicProfileServicePage` → `getPublicProfileServices` → v2 RPC. Teenuserubriigid
  tulevad eraldi juba kontrollitud ühisest rubriigi-RPC-st.
- **Säilitatud v1:** `getPublicServices` kasutab V2 integration-režiimis v1 RPC-d. Selle vana
  `usePublicProfileServices` hook’i importi praegustes komponendikutsujates ei leitud;
  avalik RPC jääb siiski ühilduvuse ja otsese kutsumise tõttu kontrollitavaks.
- **Vana integration-väline haru:** sama API sisaldab otse `services`/`service_images`
  lugemist. Serveri õigused on selle brauseritee sulgenud; seda haru ei esitata uue helperiga
  kaitstud ega uuesti toimivana.

Parserid eristavad detaili null-vastust, tühja lehekülge ja päringu-/skeemiviga.
Profiiliparserid juba toetavad null-identiteediga `profile_available=false` ümbrist.
Rakenduse koodi muutmiseks ei ilmnenud selle SQL-kavandi põhjal vajadust.
Otsingu ja profiililehe päringutel on vaataja/päringu põlvkonna kaitse; detaili praegune
laadimine on seotud teenuse ID ja retry-ga, mitte sama lehe vaatajavahetuse võtmega.
See audit ei tõenda juba avatud lehe automaatset tühjenemist ega päris brauserikäiku.

## Miks `is_public` säilib

`is_public` on ka `contact_snapshot`, avaliku meedia sidumise ja provider-controls
sihtteenuse lahenduse sõltuvus. Selle muutmine laiendaks sammu kontakti- ja meediateedele.
`visible_to_viewer` kasutused vaadatud praegustes SQL-kehades on detail, otsing,
profiiliteenuste v1/v2 ning teenuserubriigid. Kontakti ega kirjutava RPC kutset sellele
helperile ei leitud. Seega saab avaliku lugemise piiri lisada olemasolevasse lugemispunkti.

## Õiguste ja kontoelutsükli piir

`08_authority.sql` tühistab `services` ja `service_images` otseõigused PUBLIC/anon/
authenticated rollidelt. RLS-i vanad avaliku lugemise poliitikad üksi neid õigusi tagasi
ei anna. Avalikud reader-RPC-d on anon/authenticated jaoks; privileged definers ja
`service_role` otsene tabeliligipääs vajavad eraldi arvestust ning jäävad siinsest muudatusest
välja. Uus konto kontroll ei asenda RLS-i ega sulge kõiki privileged lugemisi.

Omaniku teenuste muutmine, staatuse/kehtivuse muutmine, avaldamise lõplik kirjutus,
uue kontakti loomine ja selle korduse kviitung, olemasolevad sõnumikaardid, meedia,
Storage’i avalikud vanad URL-id ning konto taastamine/kustutamine jäävad eraldi tööks.
Ühtegi kontot, profiili, teenust, fotot, seost või päevikut ei muudeta selle auditi käigus.
Lugemiskaitsete valmimine ei ole konto sulgemise valmisoleku tõend.

## Jõudluse nõue

Teenuse-ID, identiteedi, ettevõttekonto, account_states ja Auth kasutaja otsing peavad
jääma võtmega punktpäringuteks. Profiilislugil on olemas indeks; konto eellugemine tehakse
üks kord lahendatud profiilile, enne teenuste lugemist. Ühise viewer-helperi konto kontrolli
arv sõltub tegelikult hinnatud kandidaatidest — seda ei nimetata üheks kontrolliks kogu
otsingu kohta. Profile’i varane kontroll ja iga kandidaadi viewer-helper on eri tasemed.

Olemasolev `services_identity_status_order_idx(identity_id,status,sort_order,created_at DESC)`
ei vasta täielikult tänasele `created_at DESC,id ASC` profiilijärjestusele.
`services_public_discovery_idx(country,city,category,subcategory,created_at DESC)` on
published osaline indeks, kuid otsing kasutab ka `lower(country/city)`, suvaliste sõnatükkide
otsingut ja is_public helperit. Indeksi olemasolu ei tõenda nende plaanide kasutust.
Otsing materialiseerib sobivad kandidaadid ja arvutab täpse koguarvu enne lehekülge;
avaldamise/fotode lõplikkuse töö jääb kandidaadipõhiseks. Miljonite kirjete valmisolekut
selle kitsendusega ei väideta ega peideta tulemuslimiidi taha.

Järgmise teostuse sihitud plaanikatse peab võrdlema vana/uue reader’i sama aktiivset
väljundit, mitme teenusega üht ja mitut pakkujat, ebasobivat omanikku ning suurt kõrvalist
konto/teenuste hulka. Mõõta tuleb helperi kutseid, võtmeplaanide ridu/loops-e ja olemasolevat
kandidaaditööd; uut kõigi kontode skanni või kandidaatide korduvat kogu hulga lugemist
pole lubatud juurde tekitada. Vajadus eraldi otsingu optimeerimiseks tuleb raporteerida.

## Järgmise paketi piiratud kontrolliplaan

1. Värske täpne `0cb3484` alus, puu/index/tööpuu/remote, sõltuvused ja eelmise eduka raporti
   originaal enne kirjutusi; uuesti ei käivitata juba vastu võetud paigaldajat.
2. Live-kataloogis ainult kolm sihti ja vajalikud sõltuvused: kehad, signatuurid/overload’id,
   owner/ACL/search_path/volatility ning kasutatavad veerud/võtmed/indeksid. Tundmatu seis peatab.
3. Sünteetilised native SQL-katsed: era-/ettevõtte omanik, puuduva konto/Auth/omaniku eitamine,
   Auth keeld/kustutamismärge, mõlemat pidi blokid, omaniku enda päring ilma möödapääsuta,
   aktiivne/tühi/puuduv/mitmetähenduslik profiil, teenuse kehtivus ja finality, täpsed totals/pages,
   v1/v2 ning teenuserubriigid. Tootmise active-only olekupiirangut ei muudeta testandmete nimel.
4. Tegelikud TS-parserid/API-d: null versus tühi versus viga, sobimatu profiili mõlemad ümbrised,
   vale identiteet/duplikaadid/paginatsioon ja anonüümne preview; ainult seotud hook’i stale/abort
   juhtumid. Säiliva kontakti/meedia/writer-koodi ja õiguste täpsed pinnid.
5. Üks kaitstud kolme funktsiooni tehing, järelguard, COMMIT-järgne kinnitus ja eraldi verify;
   teadmata kirjutust ei korrata. Vajalik sihitud kontroll ja värske build; sama commit’i
   Ready järel kasutaja kontroll olemasoleva teenuse otsing → detail → profiil/rubriik → tagasi.

Auditi aluseks oleva `0cb3484` puu `CURRENT_STATE` sisaldab veel paketi ettevalmistuse
teksti; eraldi vastuvõtu overlay uuendab seda. Siinsed failipinnid kirjeldavad auditeeritud
aluspuud. `SERVICE_ACCESS` on 27.10 ajalooline teenuste/CLI kirjeldus, mitte uus
Git/SQL/Verceli tõend.
