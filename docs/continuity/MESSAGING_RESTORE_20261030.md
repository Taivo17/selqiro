# V1 sõnumite kasutusloogika taastamine V2-s

> Hilisem jätk 30.10.2026: kasutaja telefoni pildid näitavad uuendatud vestlusvaate kasutamist.
> Kuulutusekaardi/klaviatuuri ja fotovaliku paranduse kehtiv juhis on
> [MESSAGING_MOBILE_FIX_20261030.md](MESSAGING_MOBILE_FIX_20261030.md).
> Allolev SQLi/Storage’i paigalduskäik on varasema tarne ajalugu; seda telefoniparanduseks ei korrata.

Seis: 30.10.2026. Tegelik Maci `result.json` on loetud. Parandatud lähteviitega
jätk läbis lähtekontrolli ja peatus ainult lugemisega andmebaasi eelkontrollis.
See dokument kirjeldab Supabase’i toetatud poliitikaõigust arvestavat jätkupakki;
selle Maci lõpptulemus ja uue Verceli deployment’i Ready pole veel kinnitatud.

## Vastu võetud eelnev tulemus

Kasutaja kuvatõmmised kinnitavad kuulutuse 197 avaldamist, vestluse 38 avamist,
sõnumi jõudmist ostjalt müüjale ning kuulutusekaarti mõlema osalise V2 vaates.
Varasem kaardipaigaldaja peatumine on ajalugu, mitte praegune kordamisülesanne.
Vana kontaktiparandajat, kaardiuuendajat ega kontoaktiveerimist uuesti ei käivitata.

Viimane terminalipilt kinnitab kaardijätku DB/build/commit/push VALMIS ja commit’i
`cbd475757690db7bd1faf8784cd43359f45d5be9`. Algne sõnumipakett peatus seejärel
`SOURCE_GUARD_CHANGED` juures. Selle täpse kontrollijärjekorra järgi ei olnud DB,
Storage, lähtefailide paigaldus, build ega commit/push veel alanud.

Tarnitud failide ahela võrdlus leidis ühe eksliku eelduse: kohaliku skeemi koostaja
kasutas varasema cloud-only remondi `changes.sql` arhiiviviidet, mida too parandaja
Git-i ei kopeerinud. Jätk kasutab juba kaardipaketiga paigaldatud
`supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql`
faili. SHA-256 on mõlemal `aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b`.
Valitakse sama deklaratsioon; koond-SQL jääb samaks. Kõik 103 kaitset ja 75
payload-faili lähteseisu kontrollitakse jätkuvalt täpselt.

Tegelik järgnev raport kinnitab baasi `cbd475757690db7bd1faf8784cd43359f45d5be9`
ja kõigi 75 lähteväärtuse läbimist. Pakett
`599af1fac165ff90ada9d89f4f4cf18bbe46d0c9543988176b020f080fc00935` peatus
`baseline_verified` etapis `DATABASE_PRECONDITIONS_NOT_MATCHED` veaga. Ainult
`storage_policy_authority` oli väär; kuus muud kontrolli läbisid. Uus bucket
puudus ning DB oli `not_started`, build `not_run`, commit `null`, push `not_run`.

Vana kontroll nõudis `storage.objects` omaniku rolli õigust. Supabase’i
dokumenteeritud Supautils-tee lubab `postgres` rollil määratud tabelite
poliitikaid hallata eraldi loaga. Parandus tunnustab ainult registreeritud
`pg_catalog.pg_settings` stringseadet kontekstiga `sighup`, täpset täitjarolli
ja täpselt `storage.objects`-iks lahenduvat tabelit. Muudetav custom-GUC tekst,
vigane JSON ning vale roll või tabel ei tõenda õigust. Omanikke, rolle ega
teenuse seadistust ei muudeta. Tegeliku `CREATE POLICY` õiguse jõustab endiselt
andmebaas ning täpne piirav poliitika peab läbima tehingu järelkontrolli.

Ametlik alus: [Supautils policy grants](https://github.com/supabase/supautils#table-ownership-bypass)
ja [Supabase’i Storage’i õiguste juhis](https://supabase.com/kb/troubleshooting/revoking-privileges-on-storage-pg_cron-vault-and-extension-objects-has-no-effect).

Kasutaja palus taastada V1 postkasti head omadused ning kiitis heaks telefoni
kirjutusriba, fotod, Enteriga saatmise, alati nähtava saatja ja muud soovitatud
täiendused. Töö jätkab sama portaali ja andmebaasi olemasolevaid vestlusi.

## Kasutajale nähtav tulemus

| Osa | Käitumine |
| --- | --- |
| Arvuti | Enter saadab; Shift+Enter teeb reavahetuse. Teksti koostamise IME-kinnitus ei saada sõnumit. |
| Telefon | Kirjutusväli laieneb puudutamisel ja kasvab kuni viie reani. Enter teeb reavahetuse. Üks saatmisnool ilmub teksti või valmis foto puhul. |
| Foto nupp | Puhkeolekus on Foto; kirjutamisel jääb kompaktne +, et foto lisamiseks ei peaks teksti ega klaviatuuri sulgema. |
| Saatja | Oma täielik nimi ja logo on kirjutusriba juures tekstiga „Saadad kui …”. Vestluspartneri nimi ja logo ning kuulutuse link on vestluse päises. |
| Fotod | Üks foto sõnumi kohta, koos tekstiga või ilma. Eelvaade, eemaldamine enne saatmist, saatmise seis ja suure pildi avamine. |
| Kuulutusekaart | Säilib konkreetse sõnumi manuses; foto ja kaart saavad olla samas sõnumis. Teine kuulutus ei kirjuta vanu kaarte ümber. |
| Pikk vestlus | Alguses viimased sõnumid, vanemad eraldi laaditavad. Vanema ajaloo lisamine säilitab vaatekoha. Uute sõnumite teade ei vii lugejat sunniviisiliselt alla. |
| Värskendamine | Nähtav avatud vaade kontrollib uusi andmeid ligikaudu iga viie sekundi järel. Üle ühe lehekülje suurune vahe on nähtav ja lahendatakse eraldi laadimisega. |
| Postkast | Viimase tegevuse järjekord, sõnumi eelvaade, aeg, osalise logo ja lugemata märge. |
| Vestluse eemaldamine | Kinnitus peidab vestluse ainult oma postkastist. See ei kustuta teise osalise sõnumeid. Uus sõnum toob vestluse tagasi. |
| Blokeerimine | Konto tasemel blokeerimine ja vabastamine kinnitusega. V1 otsene saatmistee peab samuti blokeeringut järgima. |
| Identiteedi vahetus | Saatmine peatub kuni uus konto ja identiteet on kinnitatud. Mustandid ning pooleli olevad käsud jäävad oma algse identiteedi külge. |

Sama sõnumi tundmatu tulemusega saatmist saab korrata ainult sama võtme ja
muutumatu sisuga. Uut sõnumit ei koostata automaatselt varasema ebaselge katse
asemele. Saatmise ajal kirjutatud järgmine mustand säilib.

## Olemasolevad andmed ja V1 kooskasutus

Kasutatakse samu `conversations`, `conversation_participants` ja `messages`
tabeleid. Ei looda paralleelset postkasti ega kopeerita ajalugu. V2 loeb ka
legitiimseid vanu vestlusi, millel on täpne ostja/müüja kasutaja- ja
identiteedipaar ning kaks vastavat osalist. Puuduvat identiteeti ega tundmatut
rühmavestlust ei oletata ühegi konto omaks.

V1 audit kinnitas vestluse peitmist oma postkastist. Üksiksõnumi mõlemalt
osaliselt kustutamist ega tagasivõtmist ei olnud tõendatud ning seda uut
võimekust see tarne ei lisa. V1 kasutajaliides säilib. Uus saatmise trigger
kontrollib ka vana otsese INSERT-tee osalisi, aktiivset identiteeti ja blokeeringut.

Lugemata märge põhineb V2-s tegelikult nähtud sõnumi ID-l, mitte üldisel
praegusel kellaajal. Esimene V2 märge kasutab ainult nähtud ID-d. Enne esimest
V2 märget saab postkast kasutada vana lugemisaja infot. Kui V2 ID-märge on juba
olemas, ei suurenda hilisem V1 `last_read_at` seda automaatselt: V1-s loetud
vestlus võib jääda V2-s lugemata, kuni see V2-s avatakse. See väldib nägemata
sõnumite kogemata loetuks märkimist. V2 loetud seis edastatakse ka vana lugeja
ajatempliväljale, kuid ainult nähtud sõnumi ajani.

## Fotode piirid ja privaatsus

Brauser võtab JPEG-, PNG- või WebP-foto kuni 5 MiB. Enne saatmist teeb see kuni
1600-pikslise servaga WebP. Server dekodeerib ja kodeerib foto eraldi, eemaldab
metaandmed ning kontrollib mõõtmeid, suurust ja sisu räsi. Uusi sõltuvusi ei lisata.

Uus privaatne hoidla `message-attachments-v2` lubab ainult `image/webp` ja kuni
2 000 000 baiti objekti kohta. See on kuulutuste pildihoidlast eraldi. Olemasolevaid
hoidlaid, nende avalikkust, õigusi ega kuulutuste pilte ei muudeta. Uue hoidla
piirav Storage’i poliitika keelab brauseri otsese juurdepääsu ka siis, kui vanad
poliitikad olid laiemad. Serveri privaatne lugemistee kontrollib enne pildi
väljastamist konto, identiteedi, vestluse ja sõnumi seost. Brauser ei saa
privaatset objekti aadressi ega serverivõtit.

Uute sõnumifotode eelarve on 250 MiB konto kohta. Selle sees loetakse nii
kinnitatud manused kui ka katkestatud üleslaadimiste säilitatavad kirjed.
Vestluse peitmine ei vabasta fotode mahtu ega kustuta pilte. Katkestatud või
aegunud sidumata üleslaadimisi koristatakse eduka sõnumitegevuse järel piiratud
taustatööga. Hilinenud kirjutuse vastu säilivad kustutusmärgid; nende põhjal
kontrollitakse objekti uuesti. Püsivat ajastatud koristajat ega lõplikku
hilinenud kirjutuste lõppemist ei väideta valmis olevaks.

V1 lubatud vanu sõnumipilte saab lugeda kontrollitud privaatse vahendaja kaudu.
See tarne ei kustuta vana `messages` hoidla objekte.

## Koodi ja andmebaasi ülesehitus

- `src/entities/conversation/model/messaging*`: käsud, muutumatud tüübid ja ranged JSON-parserid.
- `src/entities/conversation/api/messagingClient.ts`: kasutaja JWT-ga sõnumite HTTP-klient.
- `src/server/messaging`: sama päritolu, mahu, autentimise ja RPC vastuse kontroll.
- `src/server/messaging-media`: reserveerimine, sõltumatu pildikontroll, privaatne transport ja piiratud koristus.
- `src/features/listing-conversation`: vestlus, postkast, kirjutusriba ja identiteedi külge seotud olek.
- `src/features/v2-shell`: sõnumivaate paigutus ning konto/operatsiooni külge seotud identiteedivahetus.
- `supabase/repairs/20261030_messaging_restore`: kitsas SQL-paigaldus, kataloogipinnid ning isoleeritud runtime- ja paigalduskatsed.

Andmebaas lisab privaatsed muutumatute saatmiskinnituste, fotode ja loetud ID
kirjed. Uutel funktsioonidel on piiratud õigused. Olemasolevaid avaldamise
guard’e, kolme konto lubamist ega lugejate turvapiire ei avardata.

Uue tühja kohaliku arendusbaasi koostaja saab samad deklaratsioonid ja kohaliku
privaatse fotobucket’i. Olemasolevat lokaalset andmebaasi ei lähtestata ega
migreerita automaatselt; vana pilvepaigaldajat ei impordita ega käivitata.

PostgreSQL 18 lisab tabeli `NOT NULL` piirangutele eraldi kataloogikirjed,
mida PostgreSQL 17 samal kujul ei sisalda. Võrdluses ühtlustatakse ainult see
dubleeriv esitus. Veeru `attnotnull` ja kõik muud piirangud jäävad täpselt
kontrolli alla; PG18 puhul nõutakse ka piirangu kinnitamist, jõustamist,
pärandumise puudumist ning üht vastavat kirjet iga nõutud veeru kohta.
Ametlik alus: [PostgreSQL 18 muudatused](https://www.postgresql.org/docs/18/release-18.html)
ja [PostgreSQL 17 pg_constraint](https://www.postgresql.org/docs/17/catalog-pg-constraint.html).

## Kontrollid ja nende tähendus

1. Node’i lepingukatsed kasutavad tegelikke kliendi/serveri parserid ning
   isoleeritud PostgreSQL-i päris JSON-vastuseid. Meediakatsed kasutavad päris
   Sharp-dekooderit ja sünteetilist Auth/RPC/Storage’i.
2. SQL-katsed kasutavad PostgreSQL/PGlite’i sünteetilisi osalisi, vana andmemudelit
   ja piiratud paigaldajarolli. Kontrollitakse kontode eraldatust, kaartide/fotode
   seost, sama võtme kordamist, V1 blokeeringut, nähtud ID-d ning tehingu tagasipööret.
3. Brauserikatsed kasutavad päris Reacti komponente, hook’e, kliente ja fotode
   ettevalmistust. Auth, navigeerimine ja serveri vastused on sünteetilised.
   Kontrollitud on 1440, 390, 360 ja 320 px laiused ning 320×360 ja 390×360
   väike nähtav ala koos kaardi, foto ja viierealise mustandiga.
4. Eraldi identiteedikatsed katavad pooleli vahetuse ajal fookust, tokeni
   värskendamist, storage-sündmust, konto muutust ja aegunud vastust.
5. Paigaldajat proovitakse ajutiste päris Git-hoidlate/bare-remote’idega ja
   sünteetiliste pilvevastustega. Buildi protsessipuu katkestust kontrollib eraldi
   päris kohalike alamprotsesside katse.
6. Portaali tootmisbuild, TypeScript ja sihitud lint ning kohaliku skeemi
   räside/deterministliku koostamise kontroll kuuluvad tarne tõendisse.

Täpsed viimased loendused ja räsid on paketi `review/verification.json` failis.
Need katsed ei ole päris iPhone’i/Androidi klaviatuurikatse, kasutaja Maci
käivitamine, samaaegsete eraldi PostgreSQL-ühenduste tõend ega päris kasutajate
vahel saadetud sõnumid. Testide käigus neid väliseid tegevusi ei tehtud.

## Üks Maci uuenduskäsk

Laadi alla ja ava `selqiro-sonumid-oigused-20261030.zip`, nii et Downloads-kaustas oleks
samanimeline kaust. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-sonumid-oigused-20261030/uuenda.py" --publish
```

Jätk lukustab ainult lugemiseks mõlemad vanad sõnumipäevikud: algse `49bb…`
kirjutuseelse `SOURCE_GUARD_CHANGED` peatuse ja jätku `599…` tegeliku
eelkontrolli peatuse. Nõutakse viimase raporti täpset lähtebaasi, 75 failiväärtust,
ainsat ebaõnnestunud guard’i ja seost esimese raportiga. Mõlemad raportid ning
lukufailid säilivad muutmata, uus päevik seotakse nende räsidega.

Värske DB-eelkontroll peab läbima parandatud õigusekontrolli ja säilitama kõik
11 vanas raportis loetud invarianti ning kolm puuduvate uute objektide
sõrmejälge. See toimub enne uue DB-lähteseisu salvestamist, bucket’i loomist või
SQLi rakendamist. Vana `unknown` tulemus jääb võrdlustõendiks; seda ei loeta
tagantjärele kinnitatud paigaldusseisuks. Hilisemat rakendatud seisu tunnistab
jätk ainult oma uue päeviku kontrollitud paigalduskatse põhjal.

Uuendaja kontrollib olemasolevat `/Users/taivo/selqiro` main-haru, sama GitHubi
origin’i, 8f25f65 esivanemlust, täpseid aktsepteeritud lähtebaite, sõltuvusi,
Supabase’i linki ning juba kasutusel oleva CLI viit faili. Jooksev SHA loetakse
Maci hoidlast, seda ei asendata väljamõeldud väärtusega.

Seejärel loetakse DB-seis. Vajaduse korral luuakse ainult uus privaatne
sõnumifotode hoidla ning paigaldatakse üks uus tehinguline SQL-kiht. Enne
lähtefailide paigaldust peab värske lugemine kinnitama täpse tulemuse ja
olemasolevate piiride säilimise. Paigaldaja teeb varukoopiad, paigaldab täpsed
failid, ehitab olemasolevate sõltuvustega, teeb piiratud commit’i ja tavalise
main push’i. Commit’i teema on `Restore complete identity-bound V2 messaging`.

Uus privaatne päevik ja varukoopiad asuvad
`~/Library/Application Support/Selqiro/messages-20261030/<manifest-sha>/`.
Vanu päevikuid, worktree’sid ja kasutaja tööfaile säilitatakse. Uuendaja ei
paigalda tööriistu, ei küsi uusi võtmeid ega kirjuta `.env` faile.

Katkenud käigu jätkamiseks kasutatakse sama käsku. Ebaselget SQL- või hoidla
loomise katset ei korrata oletuse põhjal: uuendaja loeb uue seisu ja peatub,
kui seda ei saa täpselt kinnitada. Eduka sammu kinnitust kasutatakse jätkamisel.
`PEATATUD` korral säilita päevik ja saada kood koos nimetatud `result.json`-iga.

Pärast `VALMIS` tulemust oota sama commit’i Verceli `Ready` olekut ja värskenda
portaali. Üldine avalik käivitamine, varasem kuulutuspiltide lõppkoristus ja
päris seadmete kasutuskontroll on eraldi lõpetamata tööd.
