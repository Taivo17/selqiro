# Töökuulutused eraisikule ja ettevõttele

## Otsus ja lähtekoht

21.11.2026 palus kasutaja jätkata eraisikute töökuulutustega. Kõik kolm olemasolevat kontot on tema loodud ja teisi testijaid veel ei ole. E-posti kinnitamise aktiveerimine jääb selqiro.com kasutuselevõtu etappi, enne väliste kasutajate kaasamist. See muudatus ei seadista Authi, SMTP-d ega domeene.

Paketi ainus vastu võetud lähtecommit on `cd35d1878157a1730d489241b283881b28740a33` (1976 jälgitavat faili). See on kasutaja Maci turvauuenduse raporti ja sama commit’i Verceli Ready / Production ekraanipildi alusel vastu võetud seis. Next.js 16.4.6, Sharp 0.35.5 ja lukufail jäävad samaks. Eraldiseisev e-posti ettevalmistuse koopia ei kuulu sellesse lähtepuusse.

## Kasutaja töövoog

Töö jääb üheks jaotiseks. Nii eraisik kui ka ettevõte saab lisamisel valida:

| Valik | Sisu | Tasu |
| --- | --- | --- |
| Otsin töö tegijat | Konkreetne töö, näiteks lume lükkamine, puude ladumine, aia parandamine või muru niitmine | Soovi korral kogu töö eest või senise ajavahemiku alusel |
| Otsin töötajat | Töötaja otsimine koos seniste töösuhte tüübi ja tööaja väljadega | Senised tunni, päeva, nädala, kuu ja aasta valikud |

Eraisiku uue tühja vormi algvalik on töö tegija otsimine, ettevõttel töötaja otsimine. Mõlemad võivad valikut muuta. Olemasoleva kuulutuse või pooleli jäänud salvestuse taastamine kasutab selle salvestatud sisu, mitte profiili algvalikut.

Tööotsa korral peidetakse töösuhte tüübi ja tööaja väljad; varasem tööaja väärtus tühjendatakse. Töötaja otsimisele tagasi minnes tühjendatakse ainult sellele valikule sobimatu „kogu töö eest” tasuperiood. Kirjeldust, summat ega valuutat ei kirjutata ümber.

Avalikus töökaardis ja üksikvaates näidatakse tegeliku avaldaja nime ning märget Eraisik või Ettevõte. Eraisikult ei küsita ettevõtte nime. Asukoha senine riigi ning linna/piirkonna voog säilib. Tööotsad on leitavad senise tööliigi filtri kaudu. Ka eraisiku avalik profiil näitab tema avalikke töid. Avalik jagamislink ja kontaktiteekond kasutavad samu töökuulutuse marsruute ja kontrollitud andmevälju.

Valik „tööots” või „töökoht” kirjeldab portaali sisu. See ei kinnita lepingu õiguslikku liiki ega vabasta avaldajat kohalikest kohustustest. Senist riigipõhist avaldamise tingimuste kontrolli ei laiendata ega nõrgendata.

## Andmeleping ja ühilduvus

Olemasoleva töösisu 13 võtit ja avalike RPC-de signatuurid jäävad samaks. Lisandub kaks lubatud väärtust:

- `employmentType: "task"` – konkreetse töö tegija otsimine.
- `salaryPeriod: "task"` – tasu kogu töö eest, lubatud ainult tööotsa korral.

Tööotsa `workingTime` peab olema `null`. Kontroll kehtib nii kliendi validaatoris, serveri normaliseerimises kui ka tabeli piirangus. Summad jäävad täpseteks kümnendstringideks; valuuta täpsus ja vahemiku kontrollid säilivad. Kõik varasemad lubatud töösuhte tüübid ja tasuperioodid jäävad alles.

Avaliku vastuse `employer` objekt saab välja `identity_type`, mille väärtus loetakse tegelikust identiteedist (`private` või `business`). Uus parser aktsepteerib ka varasemat kolme väljaga objekti; puuduva tüübi puhul märki ei oletata. Tundmatu tüüp või üleliigne privaatne väli lükatakse tagasi.

Seniste mutatsioonide päringusisendeid ja kviitungeid ei migreerita ega normaliseerita uuesti. Täpse korduskatse, päringuvõtme, toimingu, identiteedi ja revisjoni kontrollid jäävad alles. Vana kehtiva töökuulutuse salvestatud päringu saab samade baitidega taastada.

See ei ole eri brauseriversioonide nullkatkestusega väljalase: varem avatud range parser ei pruugi tunda uut `task` väärtust ega avaliku vastuse `identity_type` välja. Pärast uue commit’i Ready / Production tulemust tuleb avatud leht värskendada. Seniste päringute serveripoolne idempotentsus on sellest eraldi ja säilib.

## Õigused, nähtavus ja kontakt

Töökuulutus kuulub endiselt aktiivsele identiteedile. Eraisiku puhul kontrollitakse identiteedi omanikku; ettevõtte puhul säilivad aktiivse ettevõtte ja liikmesuse kontrollid. Ühise avaldamise volituskontrolli ja lukustamise ümber ei ehitata alternatiivset otsekirjutamise teed.

Avalik töö eeldab kehtivat avaldamisolekut, kehtivusaega ja avalikku profiili. Konto blokeeringud, ajutine avaldaja peitmine, profiili nähtavus ning anonüümse ja sisselogitud lugeja eristus jäävad samasse serveripoolsesse voogu. Eraisiku kontakt suunatakse tema identiteedi omanikule; ettevõttel säilib ettevõtte omaniku seos. Kontakti loomine kontrollib endiselt mõlemapoolseid blokeeringuid ja keelab iseendaga vestluse. Olemasolevate vestluste töökuulutuse konteksti ei kirjutata tagantjärele ümber.

Tööde ühe kalendrikuu kehtivus, omanikuloend, muutmisrevisjonid, pausile panemine, sulgemine, pikendamine ja riigiga seotud tingimustele nõusolek jäävad kehtima. Tabelite ega privaatsete abifunktsioonide õigusi brauserile ei avata.

## Väljastamine ja kontrollitulemuse piir

Uus serverimuutus asub ainult `supabase/repairs/20261121_personal_jobs` all. Varasemaid väljastatud SQL-faile ei muudeta. Selle kausta README kirjeldab tegelikku kataloogipõhist eelkontrolli, ühte tehingut ja järelkontrolli.

Uuendaja seob paketi lubatud lähtepuu, turvauuenduse originaalraporti, olemasoleva remote’i, paigaldatud runtime’i ja seotud Supabase projekti lepinguga. Enne lähtekoodi muutmist tehakse värske andmebaasi lugemiskontroll. Sihitud klienditestide ja uue build’i järel kontrollitakse seisu uuesti; alles siis rakendatakse üks piiratud SQL-tehing. Ebaselget kirjutamise tulemust ei parandata pimesi kordamisega: sama käivituse päevik ja uus lugemine peavad kinnitama täpse järelseisu. Commit ja push on lubatud alles kinnitatud tulemuse järel.

Kohalikud kontrollid kasutavad tegelikke TypeScripti mooduleid, Reacti renderdust, sünteetilisi võrguvastuseid ja eraldi PostgreSQL-i testkeskkonda. Täpsed testiloendid, arvud ja build’i tulemus on väljastatud paketi `kontrollid` kaustas ning jooksvas üleandmisjuhendis. Need ei tõenda kasutaja Macis käivitamist, hosted-SQL tehingut, sõnumi saatmist ega brauseri visuaalset sobivust. Need etapid kinnitatakse uue käivitusraporti ja kasutaja portaali kontrolliga.

## Järjepidevus

Aluse kolm jooksvat üleandmisfaili on baiditäpselt säilitatud `docs/continuity/history/personal-jobs-base-cd35d18-20261121` all. Jooksva juhendi lähteandmed on `docs/continuity/CURRENT_STATE.json`; Markdowni juhendi genereerib senine `scripts/continuity/render_current_handoff.py`.

E-posti ettevalmistuse ZIP on eraldi, avaldamata töö. Selle tervet varasema aluse lähtepuud ei tohi selle töökuulutuste muudatuse peale kopeerida. Hiljem tuleb ainult vajalik e-posti delta sobitada siis kehtiva lähtekoodiga ning domeeni, saatja ja tagasisuunamise seaded uuesti kontrollida.
