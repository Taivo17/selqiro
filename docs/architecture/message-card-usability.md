# Sõnumimullid ja tervikuna avatavad pakkumiskaardid

## Otsus — 18.11.2026

Kasutaja soovis enda ja vastaspoole sõnumite selgemat toonierinevust ning
töökaardi avamist kogu kaardilt. Muudatus puudutab kolme esitlusfaili.

Saatja ja pakkumise tüüp on kaks eraldi tunnust. Sõnumimulli taust näitab
saatjat, selle sees oleva pakkumiskaardi värv pakkumise tüüpi. Ajalooline
sinine töökaart jääb siniseks ka siis, kui sama vestlus jätkub kollase
tavakuulutuse teemal. Taust ei sõltu viimati avatud pakkumisest.

| Element | Taust või tekst |
|---|---|
| Saabuv sõnum, vasakul | #f1f3f5 |
| Enda sõnum, paremal | #d4ebdc |
| Sõnumi tekst | #17231b |
| Kellaaeg | #526158 |
| Tavakuulutuse ja hobusepakkumise kaart | Olemasolev amber-teema |
| Teenuse kaart | Olemasolev teal-teema |
| Töökaart | Olemasolev blue-teema |

Teksti sRGB-kontrast taustadega on 12,932–14,605:1, kellaajal 5,208–5,882:1.
Saatja eristamiseks säilivad vasak/parem paigutus ja olemasolevad
ligipääsetavussildid. Taustade omavaheline kontrast ei ole teksti kontrasti
kriteerium; arvud ei asenda tegelikku visuaalset kontrolli.

## Kaart on päris link

JobCard on ühine tööotsingule ja avaliku profiili tööde jaotisele. Üks
Next Link ümbritseb kogu valget kaarti, pealkirja, metaandmeid ja servavahesid.
Sisemist pealkirjalinki enam pole; pole ka pesastatud linke ega onClick-
navigeerimist. Article ja h3 säilivad, URL on endiselt /v2/job/{content_id}.
Klaviatuuril on üks fookuspeatus; native link toetab Enterit, keskmist
hiirenuppu ja uuel vahelehel avamist. Kogu kaart saab hõljumisvarju ja
nähtava sinise fookusraami. Pealkiri muutub samas olekus sinisemaks.

ConversationListingCard oli juba enne parandust terviklink. Sellele lisandub
selgelt kogu laiust hõlmav pind, osutuskursor, hõljumisvari ja pakkumise
värviga fookusraam. Sama komponent katab tavakuulutuse, hobusepakkumise,
teenuse ja töö. Olemasolevad ohutu URL-i/pildi kontrollid, pildivea käitlus,
aria-label ja prefetch=false säilivad. Vaata pakkumist jääb nähtavaks vihjeks.

Fookus ei liigu sõnumi tervele mullile; ainult seesolev pakkumiskaart on link.
Vestluse päise osaleja, tagasinupp ja menüü jäävad eraldi toiminguteks.
Varju üleminek arvestab vähendatud liikumise eelistust.

## Kontrolli ja muudatuse ulatus

Täielik build seob tõendi lõplike lähtefailidega. Tegelikest komponentidest
valmis staatiline HTML-näidis sünteetiliste andmetega. Kavandatud brauseri-
kontrollid hõlmavad kaardi tabamisala, klaviatuuri, värve ning töölaua ja
kitsa vaate paigutust, kuid need jäid käesolevas keskkonnas tegemata:
brauseri käivitus ja kohaliku faili avamine olid tõkestatud (BLOCKED).
Staatiline renderdus ei ole läbitud brauserikatse. Hosted Auth/RPC-d,
sõnumitransporti ega Productioni deploy’d ei kontrollitud. Täpne tulemus
ja failiräsid on väljaande kontrollid/ all.

Andmeskeem, päringud, saatja tuvastus, blokeerimine, õigused, identiteedi
valik, sõnumi saatmine, vestlusajalugu, pakkumiste kehtivus ja jagamine
ei muutu. Olemasolevaid päris sõnumeid ei saadeta ega kustutata. Uusi
sõltuvusi ega esitlusklasside peegeldamiseks ühikteste ei lisata.
