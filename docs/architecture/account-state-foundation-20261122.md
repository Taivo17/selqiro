# Vastuvõetud seis — 23.11.2026

Konto oleku vundament on nüüd rakendatud: commit 4b60782, üks kinnitatud SQL
paigaldus, eraldi verify, värske build ja push. Kasutaja kinnitas sama commit’i
Ready / Production tulemuse ning Minu konto aktiivse oleku ja algse kuupäeva.
Täpne vastuvõtt on `account-state-accepted-20261123.md`-s; üks järgmine töö on
`account-public-profile-next-20261123.md`-s. Siinne täiendus on järgmise paketi
jaoks ette valmistatud ega tõenda eraldi uut Maci kirjutust.

Allpool säilib algne ettevalmistuse leping. Selle Maci/pilve ootel-kirjed on
ajaloolised; valmis paigaldust ei korrata. Lubatud olek on endiselt ainult active
ja konto sulgemise/taastamise/kustutamise toiminguid veel ei ole.

---

# Konto oleku vundament ja „Minu konto“

22.11.2026 Europe/Tallinn. Lähtekoodi alus `034211d`.

## Valmiv tervik

Uus `/v2/my-area/account` vaade näitab sisselogitud konto serverist loetud olekut,
Auth teenusest kontrollitud e-posti ning konto tegelikku loomise kuupäeva, kui
see on teada. Vaatesse pääseb Minu ala navigeerimisest ja konto päisemenüüst ka
siis, kui avalik profiil või aktiivne identiteet puudub. Konto haldus ei nõua
Energy ostu, ettevõtte liikmerolli ega profiili loomise lõpetamist.

See on konto sulgemise ja taastamise alus. Selles versioonis saab serveri konto
olek olla ainult `active`; sulgemise, taastamise ja kustutamise käske ei ole.
Kasutajale ei näidata neid toiminguid lubavaid nuppe ega eksitavaid lüliteid.

Tootemudelisse jääb ühe eraisiku või ettevõtte algprofiili valik. Selle uue
registreerimisvaate varasem ettevalmistus on endiselt paigaldamata. Konto olek ei
ole uus kontotüüp ega teine kirjutatav koopia profiili tüübist. Olemasoleva kolme
konto ja ühe varasema kahe identiteediga konto andmed säilivad.

## Vastu võetud kontrolli tulemus

Kasutaja 22.11.2026 kell 21:58:45–21:58:49 tehtud käik lõpetas ühe ainult
lugemise kataloogipäringu. Tulemuse katvus oli täielik selle piiritletud ulatuse
jaoks: kuus konto/profiili relatsiooni, 11 funktsiooni ja kaks seotud triggerit.
Tulemus ei olnud kärbitud. Auth kasutaja tabelil ei olnud selles vaatluses ühtegi
mitte-sisemist triggerit. See ei kirjelda väliseid Auth hook'e või teenuseid.

Kõigi 11 tagastatud funktsiooni keha räsid ja konfiguratsiooni sõrmejäljed sobivad
vastu võetud lähtekoodiga. Mõlemad olemasolevad profiili triggerid sobivad varasema
tõendiga. Registreerimise ettevalmistuse uued funktsioonid puuduvad tootmisest,
nagu kokkulepitud pausi järgi eeldati. Funktsioonide dünaamiliste kutsete täielikku
graafi selle kontrolliga ei väideta.

Raport kinnitab puhast `main`-haru samal `034211d` commit'il, 2047 kontrollitud
lähtefaili, identset indeksit ja muutumatut kohalikku seisu enne ning pärast
vaatlust. Kinnitatud remote'i `main` võrdsus kontrolliti enne pilvepäringut.
Raporti, päringu, käivitaja ja tagastatud kataloogi räsid kontrolliti uuesti
võrguühenduseta. Lõpetatud kontrolli ei korrata.

## Üks serveri andmeallikas

Privaatne `account_lifecycle_private.account_states` tabel hoiab ühe olekurea
Auth konto kohta. Algne olek on `active` ja revisjon on positiivne bigint.
Revisjon liigub kliendile täpse kümnendstringina. Puuduv rida ei tähenda aktiivset
kontot ning lugemine ei loo ega paranda olekurida.

Kasutuselevõtt teeb ühes piiratud tehingus järgmise:

1. Kontrollib vajalikke olemasolevaid Auth veerge, funktsioone, triggereid ja
   paigaldaja õigusi ning uute nimede puudumist.
2. Loob privaatse tabeli, õigused, ühe Auth konto loomise triggeri ja lugemise RPC.
3. Lisab olemasolevatele Auth kontodele algse aktiivse olekurea. Ühekordne algtäide
   peatub, kui kontode arv ületab selle paigalduse selgelt piiratud 1000 konto ulatust.
4. Kontrollib paigaldatud lepingut ja algtäite katvust; teavitab PostgREST-i skeemi
   värskendamisest. Teavitus ei tõenda veel päris HTTP kasutustee läbimist.

Trigger paigaldatakse enne algtäidet. Sama lühike Auth tabeli kirjutamislukk
välistab paigalduse ajal uue konto jäämise olekureata. Hiljem lisab trigger uue
Auth konto tehingus ühe aktiivse rea. Olemasoleva rea korral seda ei lähtestata.
Triggeri tõrge katkestab ka selle uue Auth konto tehingu; osaline konto ei jää alles.

Välisvõti kasutab `auth.users(id)` primaarvõtit ja `ON DELETE RESTRICT` käitumist.
Nii on Auth konto otsene kustutamine olekurea olemasolul tõkestatud ja hilisem
konto eemaldamine vajab teadlikku elutsükli lõpetamise järjekorda.
See pole luba olemasolevaid kontosid eemaldada. Tulevase lõppkustutamise kviitungi
ulatus ja säilitamine tuleb otsustada selle mooduli juures; praegune olekurida
ei ole püsiv isikuandmete arhiiv ega blokeeritud e-postide nimekiri.

Selles sammus olemasolevaid Auth, profiili, identiteedi, ettevõtte või sisuridu
ümber ei kirjutata. Lisanduvad vaid uued privaatse oleku read ning skeemiobjektid.
Registreerimise vormi, parooli, SMTP ja e-posti kinnitamise seadistus säilivad.

## Kitsas lugemise leping

`public.get_my_account_state_v1(p_expected_user_id uuid)` tagastab seitse välja:

| Väli | Tähendus |
| --- | --- |
| `schema_version` | Täpselt `1`. |
| `actor_user_id` | Serveri autentitud konto, mis peab võrduma oodatud kontoga. |
| `scope` | Täpselt `account`, sõltumatu päises valitud profiilist. |
| `state` | Selles versioonis ainult `active`. |
| `revision` | Positiivne bigint kümnendstringina. |
| `account_created_at` | Auth konto algne loomisaeg UTC vormingus või `null`; mitte algtäite kuupäev. |
| `read_at` | Serveri vaatlushetk UTC vormingus. |

RPC kontrollib autentitud rolli, `auth.uid()` väärtust, oodatud konto vastavust ja
Auth konto olemasolu, kustutamise ning keelu olekut. E-posti varasem kinnitamise
ajamärk ei ole selle lugemise eeltingimus. Funktsioon kasutab fikseeritud turvalist
search_path'i, kvalifitseeritud objekte ja piiratud õigusi. Avalikku täitmisõigust
pole; täitmine on antud ainult `authenticated` rollile. Klient ei saa privaatset
tabelit otse lugeda ega kirjutada. Getter on `STABLE`, ei võta realukke ega tee
kirjutusi ning ei kasuta aktiivse identiteedi mutatsiooniabilisi.

Vastuses pole profiilide või liikmete loendit, avalikku e-posti, sisu kokkuvõtet,
maksete saldosid ega kustutamise lubatavuse hinnangut. Konto e-post tuleb eraldi
Auth teenuse kontrollitud sama konto vastusest ja kuvatakse ainult privaatses
konto vaates. Seda ei dubleerita uude olekutabelisse.

## Kliendi ja kasutajaliidese piir

Marsruut koostab olemasoleva V2 kesta ja väikese konto komponendi. Andmejuurdepääs
ja range parser on `src/entities/accountLifecycle` all; vaate elutsükkel, tõlked
ja komponendid asuvad `src/features/account-lifecycle` all.

Üks lugemiskäik seob algse konto ID ja access token'i. Auth teenus kontrollib
sama token'i kasutajat, RPC kontrollib oodatud kontot ning klient kontrollib
saadud vastuse kontot ja skeemi. Auth sündmus peidab vanad privaatsed andmed kohe,
katkestab RPC ja alustab uue lugemise väljaspool Auth callback'i lukku. Hiline
vana vastus ei taasta eelmist e-posti või konto olekut. Vaate lugemisel on ajapiir.
Auth SDK pooleliolev `getUser(token)` võib hiljem lõppeda, kuid selle vana
põlvkonna tulemus jääb nähtamatuks.

Vigane, tundmatu või puuduv olek kuvab vea. Uus katse käib selge nupuga; viga ei
asendata oletusliku aktiivse olekuga. Tundmatu loomiskuupäev jäetakse kuvamata.
Päise menüü saab avada ka identiteedi laadimise ajal; olemasolev profiili vahetamise
toimingu kontroll säilib. Vaade on eesti ja inglise keeles.

## Kontrollid ja kasutuselevõtu tõendipiir

Rakenduse uued sihitud testid katavad tegeliku parseri, Supabase kliendi koos
sünteetilise transpordiga, katkestused, konto vahetuse, ajapiiri ja vigase oleku
ning Reacti serverrenderduse mõlemas keeles. Täielik Next.js / TypeScripti build
tehti eraldatud lähtekoopia ja lukufaili täpsete sõltuvustega.

Siinse Chromiumi käivitus peatus enne lehe avamist keskkonna socket-piirangu tõttu.
Olemasolev pilvebrauser ei saanud lokaalset ehitatud vaadet avada. Brauseri
läbimängimine jäi seetõttu tegemata; Reacti serverrenderdus ei ole DOM-i ega
brauseri kontroll. Päris vaade tuleb kontrollida pärast kasutaja Maci käiku ja
sama uue commit'i Ready / Production tulemust.

Läbisid 20 rakenduse testi, 15 eraldatud PostgreSQL 17.6 juhtu, 23 SQL receipt'i
parseri juhtu ning 47 uuendaja kontrolljuhtu. Uuendaja kontroll kasutab tegelikku
ajutist Git-hoidlat ja kohalikku bare remote'i ning sünteetilisi CLI/build/SQL
vastuseid; see pole Maci või päris pilve käik.

SQL-i, käivitaja ja rakenduse täpsed tulemused, käsud, sisendid ja räsid on paketi
proof-kaustas. Eraldatud SQL katsed ei kasuta päris kontosid. Uuendaja kontrollib
kasutaja Macis tegelikku haru, HEAD-i, indeksit, kogu aluspuud, remote'i,
paigaldatud sõltuvusi ja täpseid varasemaid raporteid enne kirjutusi. Seejärel
rakendab ta ainult selle paketi failid, teeb uued sihitud testid ja värske build'i,
kontrollib värsket pilve eelseisu, saadab ühe piiratud SQL muudatuse ning kontrollib
selle järelseisu enne täpse faililoendi commit/push'i.

Ebaselge SQL vastus ei käivita uut kirjutamiskatset. Eraldi ainult lugemise
kontroll saab kinnitada praeguse täpse paigaldatud lepingu, eristades seda algse
COMMIT-i vastuse kinnitamisest. Võõras seis, teadmata protsessi lõpp, muutunud
raport või lähtekood peatab käigu ja säilitab tehtud töö ning päeviku.

## Edasine järjekord

Pärast selle oleku lugemise vastuvõttu tuleb katta sama konto olekuga avalikud
lugemisteed, tavakasutaja kirjutamised, kontakt/sõnumid ja välise pilditöö lõppkinnitus.
Seejärel lisanduvad värske autentimisega sulgemine, teadlik taastamine ning eraldi
lõppkustutamise käsitlus. Need peavad arvestama sisu, piltide, vestluste ja Energy
terviklusega. Puuduv olek ei tohi aktiveeritud piirangutest mööda lubada.

Senine 30-päevase taastamise tootesuund säilib; see pole üldine kõigi andmete
õiguslik säilitustähtaeg ega veel töötav funktsioon. Sisselogimise/SMTP kasutuselevõtt
jääb selqiro.com etappi enne väliseid kasutajaid. Pärast konto elutsükli tervikut
järgnevad olemasolevate kuulutuste esiletõstmine ja välisreklaamide esimene teekond.

## Ametlikud tehnilised viited

- https://supabase.com/docs/guides/auth/managing-user-data — Auth kasutaja primaarvõti ja kasutaja loomise triggeri leping; triggeri tõrge võib blokeerida loomise.
- https://supabase.com/docs/guides/database/functions — funktsiooni õigused ja SECURITY DEFINER search_path.
- https://www.postgresql.org/docs/17/sql-createtrigger.html — triggeri täitmise hetk ja tehingu käitumine.

Need allikad põhjendavad tehnilisi valikuid, mitte Selqiro hetke pilveseisu.

## Hoidla asukoht

SQL-i v1 release asub supabase/releases/account-state-foundation-v1/ all.
Maci käivitaja ja ettevalmistuse tõendid jäävad väljastatud paketti; hoidla uueks
testiks lisandub tests/account-state-v1/account-state.test.cjs. Kõik varasemad
väljastatud paketid ning eelmised jooksva juhendi baidid säilivad muutmata.
