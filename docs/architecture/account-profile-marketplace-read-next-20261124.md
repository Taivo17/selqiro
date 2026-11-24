> 24.11.2026: selle kavandi kolme lugeja teostus on ette valmistatud. Täpne leping ja
> kontrollid on account-profile-marketplace-read-fence-v1.md-s. Maci rakendus on ootel.
> Allpool säilib algne lähtekoodiaudit muutmata.

# Järgmine väike moodul: profiili kuulutused ja avalikud poerubriigid

24.11.2026 Europe/Tallinn. Lähtekoodiaudit, teostus pole alanud.
Alus on Maci raportist sõltumatult taastatud `ac5521a7e944ebfb3710ea97b9913cc91b9130ee`,
puu `3466f08a7134bd6fb8b334b7520924f85cfad394`, 2177 faili. Kõik selle auditi
44 lähtefaili vastavad aktsepteeritud inventari SHA-256 ja Git blob räsidele.
Raporti, SQL-i ja kasutaja piltide vastuvõtt on eraldi tõend; siin ei tehtud uut
Maci, Giti, andmebaasi ega brauseri vaatlust.

## Üks soovitus

Lisa olemasolev konto kättesaadavuse kontroll **profiili kuulutuste v1/v2
lugejatele ja sama profiili avalike poerubriikide lugejale**. Kolm eraldi
väljakutsutavat RPC-d moodustavad ühe väikese järgmise sammu. Uut konto
andmeallikat, avalikku API versiooni ega kasutajavaadet pole selleks vaja.

| Siht | Praeguse definitsiooni lähtefail |
| --- | --- |
| `get_public_profile_marketplace_v1(text,uuid,integer,integer)` | `supabase/repairs/20261109_service_profile_polish/02_profile_marketplace.sql` |
| `get_public_profile_marketplace_v2(text,uuid,integer,integer)` | `supabase/repairs/20261110_horse_store_categories/02_profile_marketplace.sql` |
| `get_public_profile_store_categories_v2(text,text,integer,integer)` | `supabase/repairs/20261111_service_store_categories/03_public_categories.sql` |

Nende kolme deklaratsiooni samasisulised `changes.sql` ja `apply.sql` koopiad
on baiditäpselt võrreldud. Hilisemat asendusdeklaratsiooni lähtepuust ei leitud.
Uus piiratud release võiks olla `supabase/releases/account-profile-marketplace-read-fence-v1/`.
Ajaloolisi release-faile ei muudeta ega rakendata tervikuna uuesti.

## Miks just see piir

Praegune `PublicProfilePage` ootab avaliku profiili laadimist ja ei kuva sektsioone
puuduva profiili korral. See kaitseb selle lehe kasutusvoogu, kuid **ei anna
eraldi RPC-dele serveri õiguskontrolli**. Kõik kolm sihti loevad ise profiili ja
sisu ning nende praeguses kehas konto sobivuse kontroll puudub.

Tegelik kuulutuste tee on `PublicProfileListingsSection` →
`usePublicProfileListingView` → `usePublicProfileMarketplace` →
`getPublicProfileMarketplace` → `get_public_profile_marketplace_v2`.
V1 on senise SQL-i järgi jätkuvalt anonüümsele ja autentitud kasutajale kutsutav,
kuigi praegusest rakendusest selle kutset ei leitud. Selle vana kliendi leping
tuleb samuti konto piiriga katta.

Rubriigid tulevad `usePublicProfileStoreCategories` kaudu. Sama lugeja teenindab
**marketplace- ja services-ulatusi**. Konto kontroll tuleb sellel profiilitasandil
rakendada mõlemale ulatusele. Teenuse avalikkuse ja vaataja sobivuse senised
funktsioonid ning teenuse sisu lugejad selles sammus ei muutu. See ei kinnita
veel teenuste kontoelutsükli tervikut.

Vana `PublicProfileHorsesSection` pole praeguse profiililehe impordiahelas.
Üldotsingu uus hobuste kontroll ei kata profiili kaardiloendit: profiili RPC-d
ei delegeeri üldotsingule ega üksikvaatele.

## Ühe profiili konto kontroll

Säilita kõigepealt olemasolev sisendivalideerimine ning täpselt ühe aktiivse
identiteedi leidmine `ip.slug=p_seller_slug` järgi. Senine kuni kahe kandidaadi
lugemine ja mitmetähendusliku slugi tagasilükkamine jäävad enne uut kontrolli.
Kui kaks kandidaati oleksid olemas, ei tohi ühe sobimatus panna teist vaikimisi
profiiliks valima.

Pärast ainsa identiteedi leidmist lahenda selle omanik: eraisikul
`identities.user_id`, ettevõttel `business_accounts.owner_user_id` vastava
`business_account_id` kaudu. Tundmatu tüüp, puuduv omanik või puuduv kontoolek
ei anna sobivust. Avaldaja, looja ega ettevõtte liige ei ole varuomanik.
Kasuta muutmata `account_lifecycle_private.account_is_available(uuid)` helperit.

Ühe profiili päring võimaldab omanikukontot kontrollida **enne sisuloendi ja
rubriikide CTE-sid ühe korra**, mitte iga kuulutuse või rubriigi kohta. See on
teostuse nõue, mida tuleb tegelike plaanide ja kutsete arvuga kontrollida.
Puuduvad konto paranduskirjutused, realukud, uued üldised kontovahemälud ja
kaardipõhised brauseripäringud.

Sobimatu konto korral muutub sisemine `identity_value` väärtuseks `NULL`.
Senine vastus annab siis `profile_available=false`, `items=[]`, `total_count="0"`,
`has_more=false`, `next_offset=null` ja `window_limit_reached=false`.
Rubriikide ümbrises on lisaks `identity_id=null`. Sisendi slug, kategooria,
limiit ja nihe säilivad. **Toorest `null`-vastust siia ei lisata**: see oleks
profiililehtede rangete parserite jaoks teine leping.

Kanoonilise profiilipäise legacy-slugi varuteed, ettevõtte staatuse või omaniku
blokeerimise reegleid ei kopeerita siin vaikselt nende lugejate senise lepingu
asemele. Uus piir on konto kättesaadavus; ülejäänud nähtavus jääb seniseks.

## Säilivad sisu- ja rubriigilepingud

| Osa | Säiliv tähendus |
| --- | --- |
| Tavakuulutus | Aktiivne olek ja rangelt tulevane `active_until`; NULL-tähtaeg jääb profiilil välja. Blokeeringu teine osapool on `listings.user_id`. |
| Hobune | Senine `is_public`, avaldamise sündmus, sisuräsi, galerii lõplikkus ja efektiivne tähtaeg. Blokeeringu teine osapool on `created_by_user_id`. |
| Ajutine peitmine | Need profiili otselugejad ei kasuta üldotsingu ajutist pakkuja peitmist; teadliku profiilikülastuse käitumine säilib. |
| Marketplace v1 | Valitud poerubriigiga vastuses on ainult tavakuulutused. Hobused osalevad ainult ilma rubriigifiltrita. |
| Marketplace v2 | Hobuste ja tavakuulutuste rubriigiseosed tulevad eraldi kanoonilistest tabelitest; valitud rubriik ja järeltulijad peavad kuuluma vaadatavale identiteedile. |
| Avalikud rubriigid | Kogu vastava nähtava sisusektsiooni seotud rubriigid ja nende sama identiteedi esivanemad; mitte ainult hetkel näidatud tulemuste leht. |
| Teenuste rubriigid | Senine `service_publication_private.is_public` ning `visible_to_viewer` säilivad. Konto piir rakendub ühisele profiilile enne neid. |

Marketplace'i ühisjärjestus jääb `created_at DESC, content_type, numeric_id DESC,
horse_id DESC`; rubriigid jäävad `sort_order ASC NULLS LAST, created_at ASC
NULLS LAST, id ASC` järgi. Ühine koguarv ja lehekülg arvutatakse serveris.
Limiit on sisul 1–60, rubriikidel 1–100; nihe mõlemal 0–100000.
Viie hobuse pakkumisliigi hinnad, EE/EUR ja avalike väljade grammatika säilivad.

V1/V2 parserid kontrollivad täpset ümbrist, müüja slugi, kirjete arvu ja
lehekülge. Rubriigiparser seob identiteedi küsitud profiiliga. Rubriikide API
loeb kõik lehed ja keeldub muutunud koguarvust, korduvatest ID-dest või
puudulikust puust. Päringuviga jääb veaks; omaniku päringut varuteena ei lisata.
Hook'ide vaataja/profiili/filtri/lehe võtmed ja katkestus säilivad.

## Metaandmed ja järgmise teostuse kontroll

Tagastatud hobuste paketi `expected-contract.json` **ei hõlma** neid kolme
funktsiooni, rubriikide nelja tabelit ega teenuste sobivuse sõltuvusi.
Selle sammu õnnestunud Maci raport ei tõenda nende tänaseid andmebaasikehi.
Järgmise release'i ootused tuleb tuletada kontrollitud allikatest ning
eraldatud koostamisest, seejärel kinnitada Macis värske piiratud eelseisuga.
Kasutajaridu, sisu ega e-poste selleks eksportida pole vaja.

Eelseis peab katma kolm täpset funktsiooni koos võimalike ülekoormuste,
signatuuride/vaikeväärtuste, keelte, omanike, ACL-ide ja seadistustega ning
kasutatavad rubriigiseosed, võtmed/indeksid ja teenuste lugemissõltuvused.
Juba vastu võetud konto-, profiili-, tava- ja hobuselugejate leping säilib.
Tundmatu seis peatab enne kirjutust. Kolm asendust tehakse ühes kaitstud
tehingus; COMMIT-i järel loetakse kinnitus ja eraldi järelseis. Ebaselget
kirjutust automaatselt ei korrata.

## Vajalikud sihitud katsed

1. Aktiivne era-/ettevõttekonto ning puuduv kontoolek, omanik või sobiv tüüp;
   Auth keeld/kustutamismärk; ettevõtte omaniku ja avaldaja erinevus mõlemas suunas.
2. Kõigi kolme RPC otsene anonüümne/autenditud/omaniku kutse; puuduva ja
   mitmetähendusliku slugi käsitlus; sisendivead; mõlema rubriigiulatuse täpne
   tühi vastus, kui konto ei ole kättesaadav.
3. V1/v2 rubriigierinevus, võõra identiteedi vigased seosed, esivanemad,
   rekursiooni lõppemine, segatud sisu koguarvud ja järgmine leht.
4. Tavakuulutuse NULL-tähtaeg, hobuse avaldamise/piltide lõplikkus,
   avaldaja blokeering ning ainult otsingule mõjuv peitmine; teenuste
   rubriikidel senise aegumise ja vaataja kontrolli säilimine.
5. Päris parserid ja väike API/hook-kontroll: sobimatu profiili tühi ümbris,
   vea ning tühja tulemuse eristus, muutunud rubriigilehed ja vana vastuse peitmine.
6. Piiratud SQL paigalduse triivi/atomaarse vea/COMMIT-järgse kinnituse katsed,
   ainult kolme funktsiooni muutus ja uus build. Uue commit'i Ready / Production
   järel profiili eelvaade, laiendus/rubriik/leht, kaardilt detailile ja tagasi;
   sama rubriigi-RPC tõttu ka kitsas teenuserubriikide avanemise kontroll.

## Maht ja alles jääv piir

Mõõda tegelike vanade/uute profiililugejate võrdlust kehtivate sünteetiliste
tava- ja hobusekirjetega ning teenuserubriikidega. Aktiivsete kontode JSON peab
säilima. Kontrolli plaanidega ühe profiili konto lookup'i, sama tehingu helperi
kutsete delta't, puuduvaid/sobimatuid profiile, palju ühe müüja kirjeid,
rubriigi esivanemaid ja hilisemaid lehti. Veel 20 000 mitteseotud konto,
identiteedi ja sisuseose lisamine ei tohi tekitada nende üldist läbikäimist.

Praegune profiilipäring koostab materialiseeritud harudes kaardid ja hobuse
lõplikkuse enne lehekülge; rubriigipäring hindab kogu sobivat konteksti.
Senine hobuste laiotsingu mõõtmine ei tõenda selle profiilimooduli tootmiskoormust.
Konto kontrolli lisamine ei lõpeta suure mahu otsingu optimeerimise vajadust.

Teenuste/tööde/showcase'i eraldi lugejad, legacy-vood, tabelite otseõigused,
kirjutused, kontakt/sõnumid, ajalugu, meedia ja lõplik avaldamine jäävad oma
etappidesse. Lähtekoodis säilib näiteks anon/authenticated `SELECT` õigus
`listing_store_categories` tabelile; baseline sisaldab ka avalikku
`store_categories` lugemispoliitikat. Nende tegelik RLS/ACL ja sulgemise mõju
vajavad eraldi kontrolli. Kolm RPC-d ei tähenda kõigi avalike teede lõpetamist.

Konto sulgemist, taastamist ega kustutamist ei avata selles moodulis. Säilib
üks uus konto eraisiku VÕI ettevõttena, olemasoleva kahe identiteediga konto
andmete säilitamine, SMTP paus ning konto tervik → esiletõstmine → reklaamid.

Täpsed lähtefailide ja funktsioonide räsid ning teostuseta tõendipiir on
`account-profile-marketplace-read-next-20261124.sources.json` failis.
