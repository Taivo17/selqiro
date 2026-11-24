# Jälgitavate uudised — lähtekoodi audit ja kavand

24.11.2026 · **Kavand, mitte paigaldatud funktsioon.** Auditeeritud alus on `e336a5b9d02845c688def778babeac0f1e3fec95`, puu `7734a70aa174b25b2ce5cc85aca3c0fa4e628624`. Failide räsi- ja mahupinnid ning täpsemad tõendiviited on kaasas failis `followed-news-plan-20261124.sources.json`. Selle auditi jooksul lähtekoodi ei muudetud ning teste, build’i, brauserit ega andmebaasipäringuid ei käivitatud. Aluse vastavuse kontrollib eraldi vastuvõtuaruanne.

## Eesmärk ja järjekord

Kasutaja määratles **Uudised** kohana, kus ta näeb enda jälgitavate poodide/profiilide uusi kuulutusi ja teateid. See kuulub Selqiro põhifunktsioonide hulka. Käimasolev konto elutsükli töö jääb esimeseks; uudiste tuum tuleb seejärel **enne kuulutuste esiletõstmist ja reklaame**. Eraisiku aktiivse töökuulutuse puudumine testandmetes ei vaja uudiste kavandamiseks uue kuulutuse loomist.

## Mida lähtekood praegu teeb

| Osa | Tõendatud lähtekoodiseis |
| --- | --- |
| V2 päise „Uudised” | `V2Header.tsx` suunab `/v2` avalehele. Eraldi `app/v2/news` teekonda pole. |
| V2 „Jälgi” | `PublicProfilePage.tsx` nupp on ilma sündmusekäsitlejata. V1 poe lehel on jälgimise staatuse lugemine ja kirjutus olemas. |
| Profiili viimased teated | „Täna lisandus uus murutraktor” ja „Kevadhooaja hoolduse ajad avatud” tulevad samas komponendis kõvakodeeritud massiivist. Need pole tõend päriselt avaldatud teadete kohta. Quick Update on samuti kohatäitja. |
| V1 `/feed` | Loeb tavalisi aktiivseid kuulutusi jälgitavate profiilide järgi. Teenuste, tööde, hobusepakkumiste ega oma teadete voogu see leping ei sisalda. |
| Jälgimiste mudel | `store_follows` sisaldab konto- ja profiili-IDsid ning jälgijaprofiili/sihtprofiili paari. Seos on profiili ulatusega. |
| Lehitsemine | `legacyDiscoveryFeed.ts` toob kõik jälgitavate IDd brauserisse, kasutab `.in(...)`, 30-realisi offset-lehti ja ainult `created_at DESC` järjestust. Võrdse aja viigimurdja puudub. |
| Oleku vahetamine | Legacy scope/pager juba tühistab vananenud konto/profiili päringuid ja hoiab laadimised järjekorras. Seda põhimõtet tasub säilitada. Eraldi jälgimismuudatuse invalideerimist loetud failides pole. |
| Tühi vaade ja vead | `/feed` ei kasuta hooki veaseisundit; null jälgimist ja null sobivat postitust annavad sama tühja vaate. |

Allikad: `components/v2/layout/V2Header.tsx`; `src/features/public-profile/components/PublicProfilePage.tsx`; `app/feed/page.tsx`; `app/store/[slug]/page.tsx`; `src/entities/listing/api/legacyDiscoveryFeed.ts`; `src/features/legacy-discovery/model/*`; `supabase/migrations/20260722173530_baseline_20260722.sql`.

## Piirid, mida enne taaskasutust kontrollida

Säilitatud baseline SQL-i `get_identity_store_follow_status_v2` võtab jälgiva profiili ID argumendina ilma oma-konto kontrollita. `toggle_store_follow_identity` tuletab jälgija aktiivse profiili, kuid sihtkonto võtab `identity_profiles.created_by_user_id` väljast ning pöörab olemasoleva oleku vastupidiseks. Seetõttu pole automaatne sama käsu kordamine ohutu viis soovitud olekut säilitada. Need on **lähtekoodileiud**, mitte värske tootmiskataloogi või rikkumise tõend.

Praeguste avalike kontopiirangute kanooniline omanik on eraisikul `identities.user_id`, ettevõttel `business_accounts.owner_user_id`. Looja või liige ei asenda ettevõtte omanikku. Uus jälgimise ja uudiste leping peab kasutama sama omaniku, konto saadavuse ning blokeerimiste loogikat. Õiguste reeglid tuleb rakendada ka serveris.

`11_legacy_feed.sql` vaade arvestab peidetud pakkujaid ja mõlemapoolset blokeeringut, kuid loetud definitsioonis puudub `account_is_available` kontroll. Baseline `get_feed_identity_profiles` loeb antud IDde järgi nimesid, slug’e ja avatare otse. Uuemate avaliku profiili/kuulutuse RPC-de parandamine ei tõenda automaatselt nende legacy-teede katvust. Need lugemisteed kuuluvad konto elutsükli allesjäänud ülevaatusse.

Vana päise uudistemärk kasutab konto/omaniku IDsid ja kõigile sama brauseri `feed_last_viewed_at` võtit. Seda ei saa võtta valmis V2 profiilipõhise lugemismärgina.

## Üks järgmine väike teostusetapp

**Pärast konto elutsükli töö lõpetamist ühendada V2 „Jälgi / Jälgin” olemasoleva jälgimismudeliga kontrollitud serverilepingu kaudu.** See on uudiste esimene sõltuvus, mitte kogu uudiste töö lõpp.

Server kontrollib autentitud kontot, oodatavat aktiivset profiili ja selle ligipääsu; sihtprofiili kanooniline konto peab olema kättesaadav. Kirjutus väljendab soovitud olekut, mitte pimedat toggle’it, ning korduskatse/konflikt peab olema määratletud. Vastus tagastab tegeliku lõppseisu. V2 nupp kasutab eraldi entity/API mudelit ja feature hook’i. Ükski päringu õnnestumine ei tohi muuta vahepeal teisele kontole või profiilile liikunud vaadet.

Sisemine profiili ulatus säilib olemasolevate andmete hoidmiseks. Uue kasutaja üks eraisiku või ettevõtte profiil jääb lihtsaks kasutuseks; uut mitme identiteedi või ettevõtteliikmete toodet ei lisata. Jälgitav võib olla eraisiku või ettevõtte avalik profiil.

## Uudiste esimese terviku kavand

- **Oma V2 teekond.** Õhuke `/v2/news` leht, päriselt ühendatud päiselink, andmed entities/API ja mudelite kaudu, laadimine hook’is ning väikesed komponendid. Vana lehe loogikat ei kopeerita uude suurde route-faili.
- **Päris jälgitav sisu.** Server ühendab enda lubatud jälgimised kanooniliste avalike kuulutustega; tavalised kuulutused ja hobusepakkumised jäävad oma olemasolevatesse tabelitesse. Tüübistatud avaliku turuplatsi projektsioon annab sobiva lähtekoha. Iga jälgitava profiili kohta eraldi päringut ei tehta.
- **Piiratud stabiilne voog.** Näiteks 30 kaarti ja üks lisarida järgmise lehe tuvastamiseks. Kursor: esimese avaldamise aeg koos sisutüübi ja kanoonilise ID üheselt määrava järjestusega. Jälgimised liidetakse serveris; kõiki siht-IDsid ega globaalset koguloendust brauserisse ei tooda. Indeksid ja päringuplaan vaadatakse üle tegeliku lepingu järgi, mõõtmata jõudluslubadusi ei anta.
- **Uus avaldamine on üks sündmus.** Muutmine, hinnamuutus, pikendamine, aktiveerimine ja esiletõstmine ei tekita samast kuulutusest uut uudist. V2 tavaline avaldamine seab loomise ja avaldamiskviitungi aja koos; loetud muutmine/pikendamine seda loomisaega ei muuda. Hobuse avaldamine säilitab varasema `published_at` väärtuse. Ajalooliste kirjutajate ja andmete täpne ajareegel tuleb enne uut lepingut kinnitada, mitte lihtsalt kõiki `created_at` välju avaldamisajaks nimetada.
- **Omaniku päris teated.** Üks salvestatud profiili teadete moodul: ajalugu ning sama teate aktiivne Quick Update. Aktiivse teate puudumisel ülemist plokki ei näidata. Praegused näidispostitused asenduvad päris andmete või ausa tühja vaatega. See järgib juba kirja pandud Updates/Quick Update ühtse süsteemi otsust.
- **Selged olekud.** Sisselogimata kasutaja, jälgimisteta kasutaja, jälgitavad ilma sobiva sisuta ning laadimisviga on erinevad vaated. Jälgimise, konto, profiili või pakkujakontrolli muutumine tühistab vana voo. Avalikkus, konto saadavus, blokeeringud ja peitmised rakenduvad enne lehe piiramist; detaili ja meedia kontrollid säilivad.

Uudiste tuuma valmiskriteerium hõlmab **jälgimist, uusi kuulutusi ja omaniku avaldatud teateid**. Ainult vana `/feed` lingi avamine või töötav jälgimisnupp ei täida kasutaja eesmärki. Meili-/push-teavitused, üldine sotsiaalvõrk, AI ja maksed ei kuulu sellesse esimesse tervikusse. Teenuste, tööde või tootenäidiste sündmused lisanduvad hiljem eraldi selge tüübilepinguga.

## Tõendite piir

Audit kirjeldab ettevalmistatud lähtepuud. Valmis teadetemoodulit ei leitud loetud V2 komponendist ega suunatud route/entity/SQL nimeotsingutest; sellest ei järeldu kõigi tootmisandmebaasi objektide puudumine. Enne järgmist andmebaasimuudatust on vaja värsket piiratud ainult lugemise kataloogi: follow tabeli õigused/indeksid, tegelikud RPC kehad, kasutatavad omanikuseosed ja avaldamisaja leping. Selle auditi ajal ei paigaldatud ühtegi uudiste muudatust.
