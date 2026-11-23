# Tavakuulutuste avaliku lugemise konto-oleku piir v1

23.11.2026 Europe/Tallinn. Ette valmistatud vastu võetud commit’i `8dc0b3b11777b010c8486b45a3f98f0191d97d80`
peale; kasutaja Maci paigaldus, SQL ja deployment on ootel.

## Eesmärk ja üks andmeallikas

Konto sulgemise ettevalmistuses peab avalik sisu järgima sama konto kättesaadavust
kõigis vajalikes serveriteedes. Eelmises moodulis kaeti kanooniline avalik profiil.
See eraldi väike moodul katab tavakuulutuste avalikud otsingu- ja detaililugejad.
Rakenduse kasutajaliides, kontoolekud ja kasutaja sisu jäävad samaks.

`account_lifecycle_private.account_is_available(uuid)` säilib baiditäpselt.
See loeb olemasolevat privaatset kontoolekut ja Auth-kättesaadavust. Uut olekuallikat,
kliendi autoriteeti, lugemisel konto loomist ega kontooleku vahemälu ei lisata.
Olemasolev active-only piirang ja registreerimise trigger jäävad samaks.

## Neli serveriteed

| Lugeja | Muutuse koht |
| --- | --- |
| `search_public_listings_v1` | Konto sobivus `matched` kandidaadis enne koguarvu ja lehekülge. |
| `search_public_listings_v2` | Sama piir; hinnamudel v2 ja hilisem kaartide koostamine säilivad. |
| `search_public_marketplace_v1` | Ainult `ordinary` haru; `horses` haru säilib baiditäpselt. |
| `get_public_listing_detail_v1` | Esimene ühe ID lugemine, enne galerii/müüja/detailide koostamist. |

Hosted `/v2/products` kasutab ühendatud marketplace-lugejat, mille ordinary haru
ei delegeeri v2-le. Seepärast ei piisaks ainult `search_public_listings_v2` parandusest.
`getProductListings` v2-haru ja otsingu v1-haru jäävad samuti kaetuks.

## Omanik ja senised õigused

Eraisiku konto on `identities.user_id`. Ettevõtte konto tuleb primaarvõtmega
seotud `business_accounts.owner_user_id` väljast. Tundmatu identiteeditüüp,
puuduv ettevõte/omanik või kontoolek annab sobimatuse; kuulutuse autorit ega
ettevõtte liiget ei kasutata varuomanikuna. Avalikul detailil pole omaniku möödapääsu.

`user_blocks` jätkab senist `listings.user_id` autorikonto blokeerimise lepingut.
See ei muutu vaikselt ettevõtte omaniku blokeerimiseks. Vaataja ajutiselt peidetud
pakkuja piirab otsingut, kuid ei takista tahtlikult avatud otselinki. Senine aktiivse
identiteedi, avaldamisoleku ja `active_until IS NULL OR active_until > now()` nõue säilib.

## Otsing, leheküljed ja avalik vastus

Konto sobivus rakendub enne `count`, `limit` ja `offset` arvutamist. Brauseris
valmis leheküljelt kaarte ei eemaldata ning iga kaardi jaoks ei lisandu eraldi võrgupäringut.
Koguarv, järgmise lehe viit ja aknapiir käivad sama sobivate tulemuste hulga kohta.
FTS lubatud detailiväljad, lihtsõnade AND, kategooriate rada, seisukord, linna/riigi
asukohafilter, `newest` järjestus ja viigimurdjad jäävad samaks. Uut relevantsusskoori ei lisata.

Kõik sisendi piirid, väljade loendid, hinnad ja galerii piir/järjestus säilivad.
Privaatset kontoolekut või sobimatuse põhjust avalikku vastusesse ei lisata.
Edukas detaili `item: null` erineb päringuveast; integreeritud kliendiharul pole
legacy-andmete lugemisele tagasilangust. Sama RPC-d kasutav uus anonüümne jagamise
metadata lugemine saab sama piiri. Varem väljastatud metadata ja pildi-URL-id ei kustu.

## Päringuplaani ja mahu piir

12 000 sünteetilise kuulutusega vana/uue lugeja 14 võrdlusjuhtu säilitasid aktiivsete kontode tulemused. Veel 20 000 otsinguga mitteseotud konto lisamine ei suurendanud kuue valiva kontrolli sobivusfunktsiooni kutsete arvu. Esialgne kõiki identiteete läbiv lahendus asendati kuulutuse identiteedi võtmega piiratud lugemisega. Ühendatud otsingu varasem laia tulemushulga aeglus jääb eraldi optimeerimistööks enne suuremat kasutusmahtu.

Kolm otsingut seovad konto kontrolli otse kandidaadi l.identity_id võtmega LATERAL-alampäringus, mille OFFSET 0 säilitab piiri. Identiteedi ja ettevõtte primaarvõtmed väldivad tulemuste paljunemist. Märksõna 19 vaste korral mõõdeti 7 sobivuskontrolli, kategooria 12 vaste korral 12 ning ühe ID detailil 1; samad arvud säilisid 20 000 mitteseotud konto järel. 7992 sama omaniku vaste puhul vähendas plaanis nähtud Memoize kordused üheks. Memoize on planeerija valik, mitte garanteeritud korduste ülempiir ega õiguskontrolli eeldus. Tegelikes pesastatud plaanides kontrolliti FTS-i GIN-, kategooria-, identiteedi-, ettevõtte-, kontooleku- ja Auth-võtmeindekseid.

Mõõtmine näitas ka reaalset lisakulu: v2 lai otsing võttis ligikaudu 33 ms ja uuel kujul 43 ms. Ühendatud otsing koostab juba vanas teostuses tavakuulutuste kaardid, hinnad ja pildid enne lehekülje piiri. 12 000 vastega päringu vana/uue mediaan oli 4,25/4,72 sekundit; sügaval lehel 4,53/4,27 sekundit. Need on kolm sooja valimit ühe kliendiga ja ühe vana→uue järjekorraga, mitte statistiliselt tugev koormuskatse. Suurema liikluse või sisuhulga eel tuleb ühendatud otsingu koguarvu, lehekülje ja kaartide koostamine eraldi optimeerida, säilitades segatud tulemuste järjestuse, õigused ja vastuselepingu. Praegune kontroll kinnitab konto kontrolli valivat ulatust, mitte suure portaali otsingu valmisolekut.

`force_custom_plan` ja olemasolev lubatud FTS-avaldis säilivad. Täpset koguarvu
nõudev otsing peab käsitlema ka väljaspool tagastatavat lehekülge olevaid vasteid;
konto kontrolli kulu tuleb hinnata selle, mitte ainult 24 kaardi järgi. Sünteetiline
võrdlus on selle muudatuse regressioonikontroll, mitte miljonite päringute läbilaske
lubadus. Tegelik koormus, andmejaotus ja samaaegsus vajavad hilisemat mõõtmist.

PostgreSQL-i plaanide tõlgendamise alus:
https://www.postgresql.org/docs/17/using-explain.html

## Paigaldus ja tõendid

Uus eraldi release on `supabase/releases/account-listing-read-fence-v1/`.
Vanu väljastatud SQL-faile ei muudeta. Neli täpset vana funktsioonikeha, signatuurid,
omanikud, konfiguratsioon ja ACL-id on taastatud aktsepteeritud allikatest. See
tuletus peab läbima värske Maci CLI metaandmevõrdluse; see pole uus pilvevaatlus.

Kontroll kaitseb ka juba vastu võetud kontooleku ja avaliku profiili vundamenti.
Üks piiratud apply-tehing asendab nelja lugeja definitsiooni; seejärel tehakse
eraldi lugemise verify. Paigaldusel konto- ja sisuridu ei loeta ega muudeta.
Privaatsele sobivusfunktsioonile ei anta kliendi käivitusõigust. Ebaselget SQL
kirjutust automaatselt ei korrata. Maci töövoo etapid on eraldi raportis.

- 13/13 uut sihitud TypeScripti, anonüümse metadata ja Reacti serverrenderduse kontrolli läbisid; kõik 45 rakenduse sisendräsi säilisid. Kontrollitud on tegelik ühendatud otsingutee, tühja vastuse ja vea eristus ning eesti/inglise vaated. Transport ja vastused olid sünteetilised; see ei ole brauseritest.
- 37/37 lõpliku SQL-i PostgreSQL 17.6 käitumise ja metaandmete kontrolli läbisid. Parseri 18 varasemat kontrolljuhtu katavad muutmata loogikat; pärast ainult AFTER-räsi muutmist kontrolliti kolme lõplikku päris kviitungit uuesti. Konto-, õiguste-, omaniku-, blokeerimise-, peitmise-, lehekülje-, galerii- ja hobuste senise haru juhud on eraldi tõendatud.
- Värske täielik Next.js 16.4.6 / TypeScripti build läbis 33,042 sekundiga. Kõik 765 koostamissisendit säilisid. Kasutati täpseid olemasolevaid lukufaili sõltuvusi ja inertseid lokaalseid seadeid; sõltuvusi ei paigaldatud ega uuendatud. Logi SHA256 on 1ac746178e79605831e14522e0247620eb09b91ebb993639600983c1e4de9936.
- Uuendaja 14/14 uut sihitud töövoojuhtu läbisid. Lõpliku SQL-kviitungi järel kontrolliti uuesti ainult kolme olemasolevat asjakohast juhtu; kogu komplekti ei korratud. Uus kviitungi kontroll, kadunud kinnituse järel sõltumatu lugemine ja ebaselge kirjutuse automaatse kordamise keeld läbisid. Seitse varasemat Giti, protsessi, sõltuvuste ja transpordi abimoodulit säilivad baiditäpselt.

Täpsed käsud, sünteetilised sisendid, versioonid, logid, kontrollitud failiräsid ja
ülevaatused on paketi `proof/` all. Reacti serverrenderdus ei ole brauseritest.
Varasema dokumenteeritud brauserikeskkonna piiri muutumisest pole uut tõendit;
päris kasutustee kontrollitakse sama uue commit’i Ready / Production järel
HOSTED_PORTAL.md juhise järgi.

## Teadlikult järgmisteks osadeks jääv

Hobuste haru ja detail, teenused, tööd, showcase’id, otse kutsutavad profiili
pakkumiste RPC-d, legacy `get_marketplace_listings`/nearby, `discovery_listings_v1`
ning otse tabelist loetav legacy detail ei saa uut piiri automaatselt. Samuti
vajavad oma kontrolli kirjutamine, kontakt/sõnumite saatmine, ajaloolised sõnumikaardid,
välise pilditöö lõppkinnitus ja avatud brauseri vahemälu. Konto sulgemise, taastamise
ja kustutamise käsk jääb vajalike piiride terviku taha.

Kolm olemasolevat kasutajakontot ning vana kahe identiteediga konto säilivad.
Uus konto valib eraisiku või ettevõtte; ettevõtte liikmete/rollide iseteenindust
ei ehitata. SMTP ja uus sisselogimine jäävad kokkulepitud domeenietappi. Pärast
konto tervikut jätkub kuulutuste esiletõstmine ja seejärel reklaamide lisamine.
