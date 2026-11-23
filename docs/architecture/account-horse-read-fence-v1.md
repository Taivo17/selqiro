# Hobusekuulutuste avaliku lugemise konto-oleku piir v1

23.11.2026 Europe/Tallinn. Ette valmistatud vastu võetud alusele
`87bff3f51a01a6953c37096ed32a1017135fd304`. Maci paigaldus, SQL, uus commit/push
ja sama versiooni Vercel Ready / Production on ootel.

## Eesmärk

Hobusekuulutuste avalik otsing ja üksikvaade peavad arvestama sama konto
kättesaadavusega nagu vastu võetud avalik profiil ja tavakuulutuste lugejad.
Üks andmeallikas on senine `account_lifecycle_private.account_is_available(uuid)`.
Seda helperit ei muudeta; uut kontooleku tabelit, vahemälu ega kliendi autoriteeti
ei lisata. Praegune konto active-only alus jääb samaks.

## Kaks serveriteed

| Lugeja | Muutuse piir |
| --- | --- |
| `search_public_marketplace_v1` | Ainult `horses` haru konto sobivus enne ühist koguarvu ja lehekülge. |
| `get_public_horse_offer_v1(uuid)` | Konto sobivus ühe ID lugemisel enne avaliku detaili koostamist. |

Ühendatud otsingu alus on vastu võetud `account-listing-read-fence-v1` release.
Selle `ordinary` haru ja ühine `matched`/count/page/JSON lõpposa säilivad
baiditäpselt. Vana `20261108_horse_publication/07_public.sql` faili tervikuna
uuesti ei rakendata, sest seal on varasem ühendatud otsing.

Otsingukontroll on seotud kandidaadi `h.identity_id` võtmega LATERAL-alampäringus.
`OFFSET 0` säilitab selle piiri. Primaarvõtmed ei luba vastete paljunemist.
Memoize on planeerija võimalik valik; õiguskontroll ei sõltu selle olemasolust.
Sobimatute kirjete eemaldamine toimub serveris enne koguarvu ja lehekülge.
Valmis lehe kliendipoolset filtreerimist ega iga kaardi uut võrgupäringut ei lisata.

## Omanik ja säilivad lepingud

Eraisiku omanikukonto on `identities.user_id`; ettevõttel
`business_accounts.owner_user_id` identiteedi `business_account_id` kaudu.
Puuduv seos või tundmatu tüüp ei kasuta autorit ega ettevõtte liiget varuomanikuna.
Senine kasutajate kahepoolne blokeering hindab `horse_offers.created_by_user_id`
avaldajat. Need on erineva tähendusega kontrollid ja jäävad eraldi.

Ajutine pakkuja peitmine piirab otsingut; teadlikult avatud üksikvaatelink säilitab
senise lepingu. Avalikul üksikvaatel ei teki omaniku möödapääsu.

Säilivad `is_public`, `has_current_publication`, sündmuse/sisu räsi ja galerii
lõplikkus, efektiivne 90 × 24 tunni tähtaeg ja NULL-tähtaja tuletus, viis
pakkumisliiki, EE/EUR, otsitava hobuse asukoht ja eelarve, avalike väljade loend,
galerii järjekord ning täpse privaatse asukoha ja pilditeede puudumine.
Edukas puuduv üksikvaade tagastab toore `null`; päringuviga jääb veaks.

Ühist `horse_publication_private.is_public` funktsiooni ei muudeta. Seda kasutavad
ka profiili-, meedia- ja kontaktiteed, mille muutmine vajab oma lõpetatud lepingut.

## Kliendi kasutustee

`/v2/products` kasutab ühendatud otsingut ning hobusekaart avab
`/v2/horse-offer/[id]`. Avalik detail ja värske anonüümne jagamise metadata
kasutavad sama `get_public_horse_offer_v1` RPC-d. Kliendi kood ja ranged parserid
säilivad. Profiili kaardilt avatud detail saab uue kontrolli, kuid profiili
kaartide hankimise RPC ei delegeeri sellele ega üldotsingule.

## Tegelik ettevalmistuse tõend

12/12 uut kliendi, range parseri, anonüümse jagamismetadata ja Reacti serverrenderduse kontrolli läbisid. Kontrolliti päris rakenduskoodi sünteetiliste vastuste ja hook-olekutega; 42 lähte-/abifaili räsi säilisid. Null-vastus, päringuviga, segatud loendi järjekord/leheküljed, hind, pildid ja avalikud lingid on eraldi kaetud. See ei ole brauseri ega päris teenuse kontroll.

56/56 uut native PostgreSQL 17.6 kontrolli läbisid. Tegelikud konto-, avaldamis-, sisu- ja galeriilõplikkuse funktsioonid töötasid sünteetiliste andmetega. Kontroll hõlmab viis pakkumisliiki, omanikuseoseid, puuduvaid/piiratud kontosid, blokeerimist, peitmist, tähtaegu, vigaseid avaldamisfakte, segatud koguarve/lehekülgi, õigusi ning ühe kaitstud SQL rakendamise ja eraldi verify tulemust. Testitud 9 SQL/lepingu sisendi ja 54 toetava sisendi räsid säilivad; oma klaster on peatatud. Live-andmebaasi eelseis tuleb Macis värskelt kinnitada.

Vana/uue päringu võrdlus kasutas 2400 avaldamise lugemiskontrolli läbivat sünteetilist hobust, 1920 pilti ja 600 tavakuulutust: kõik 12 võrdlusjuhtu andsid samad aktiivsete kontode tulemused. Iga versiooni kohta mõõdeti 3 soojendatud päringut. Veel 20 000 kõrvalise konto lisamisel säilisid 5 valitud juhu tulemused ja konto helperi kutsete arvud 5/3/300/1/1. Segatud laiotsingu mediaan oli 2804,52 → 2954,86 ms (+5,36%, mõõtevahemikud kattusid); hobuste laiotsing 2775,87 → 2549,83 ms. Ühe omaniku 1600 vaste puhul oli 1600 kontrolli; ühe korra kontrollimist konto kohta ei lubata. 43 mõõtmise sisendpin’i jäid muutmata; neli setup’i loetud baas-release’i faili kontrolliti lisaks aktsepteeritud inventari vastu, neid ei lisatud tagantjärele mõõtmise pin’ide hulka. 52 811 päris pesastatud plaani säilivad kadudeta gzip’is ning 27 sisemist lugejaplaani eraldi. Need ühe kliendi kohalikud mõõtmised ei tõenda tootmiskoormust: laiotsingu avaldamiskontrollid, kaartide koostamine enne lehekülge ja hobuste FTS vajavad eraldi optimeerimist enne suuremat kasutusmahtu.

Uus täielik Next.js 16.4.6 / TypeScripti build läbis 32,45 sekundiga. Kõik 765 build’i sisendit säilisid; package.json, lukufail, sõltuvused ja rakenduskood on muutmata. Kasutati olemasolevaid täpseid sõltuvusi ja inertseid kohalikke koostamisseadeid. Valmis /v2/products, /v2/horse-offer/[id] ning /v2/profile/[slug] väljundid.

17/17 uut Maci uuendaja sihitud juhtumit läbisid 17,571 sekundiga. Ajutine Git/kohtvõrgu remote ja piiratud alamprotsessid olid tegelikud; runtime-proov, CLI, SQL ning rakenduse build’i tulemused neis runner’i juhtudes sünteetilised. Kontrolliti täpset 2154-failist alust, tundmatu seisu peatumist, ühe SQL kirjutuse ning ebaselge vastuse järel ainult lugemisega taastumise lepingut, täpset commit/push’i ja raporti säilimist. Kõik 17 runtime-faili vastavad testi pin’idele; seitse varasemat helperit säilivad baiditäpselt. See ei ole uus Maci käivitus.

SQL-katsed kasutavad tegelikke taastatud lugejaid ning olemasolevat konto helperit,
hobuse sisusnapshot'i, avaldamise ja pildi lõplikkuse funktsioone. Katseandmed,
policy/attempt/slot/object viidete alused ja avaldamisfaktide koostamine on
sünteetilised. See ei ole kogu avaldamis-, Auth-, Storage- ega HTTP-voo katse.

Jõudluse mõõtmisel on sobivuse funktsioonikutsete arv sama lugemistehingu
enne/pärast loenduri vahe. Sünteetilised ühe kliendi mõõtmised ja plaanid ei
tõenda tootmise läbilaset. Hobuste praegune otsene `to_tsvector` avaldis ei ole
olemasoleva `search_vector` GIN-indeksi avaldis. Otsingu tähendust selles õiguste
muudatuses ei vahetata. Ühendatud otsingu varasem kaartide koostamine enne
lehekülge jääb eraldi optimeerimistööks enne suuremat kasutusmahtu.

Päris brauserikontroll on ootel sama uue commit’i Ready / Production järel.
Sünteetiline transport ja Reacti serverrenderdus ei tõenda klikke, hydration'it,
pilveteenuseid ega konto sulgemist. Maci uuendaja käivitab sihitud testid ja
värske build’i; ettevalmistuse isoleeritud PostgreSQL-i komplekti Macis ei korrata.

## Rakendamine ja taastumise piir

Uus release on `supabase/releases/account-horse-read-fence-v1/`.
Eelseis peab kinnitama täpsed funktsioonide kehad/signatuurid/omanikud/õigused,
konfiguratsiooni ja vajalikud relatsioonide võtmed ning varasema vastu võetud
tavakuulutuste/profiili/konto lepingu. Ühes kaitstud tehingus asendatakse kaks
funktsiooni. Kinnitus loetakse pärast COMMIT-i ja järelseis eraldi lugemiskäsuga.
Ebaselget kirjutust ei korrata automaatselt. Tundmatu seis peatab uuendaja.

Kontode, kuulutuste, sündmuste, piltide, sõnumite ega päevikute ridu paigaldus
ei muuda. Väljastatud paketid ja eelmine edukas originaalraport säilivad.

## Konto terviku alles jääv piir

Profiili pakkumiste v1/v2 ja rubriikide otselugejad, teenused, tööd, showcase'id
ning legacy-vood vajavad oma kontrolli. Kirjutused, uus kontakt, sõnumid,
ajaloolised kaardid, avalik/omaniku meedia ja poolelioleva pilditöö lõppkinnitus
on eraldi lõpetamise tingimused. Varem antud pildid ja salvestatud metadata ei kustu.

Konto sulgemine, taastamine ja lõppkustutamine ootavad vajalike teede tervikut.
SMTP paus, üks eraisiku või ettevõtte konto, suletud AI päringuteed ning
konto tervik → esiletõstmine → reklaamid järjekord säilivad.
