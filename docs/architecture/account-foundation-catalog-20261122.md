# Jooksva seisu täpsustus — 22.11.2026

Kataloogikontroll on nüüd tehtud ja selle tegelik raport vastu võetud.
Kõigi 11 vajaliku funktsiooni keha ja konfiguratsioon sobivad aktsepteeritud
lähtekoodiga. Uut sama diagnostikat ei käivitata. Esimene konto oleku moodul
ning Minu konto vaade on ette valmistatud; kasutaja Maci käik ja pilve rakendus
on ootel. Jooksev tööjärg on docs/continuity/CURRENT_STATE.json-s, teostus
docs/architecture/account-state-foundation-20261122.md-s.
Alljärgnev varasem ettevalmistuse kirjeldus säilitab otsuse põhjenduse;
selle vanad järgmise töö laused ei ole tänane käivitamisjuhis.

# Konto aluse kontroll enne elutsükli rakendamist

22.11.2026 Europe/Tallinn. Vastu võetud Production alus `034211d`.
See dokument kirjeldab uut ainult metaandmeid lugevat kontrollpakki.

## Eesmärk ja kasutaja valitud järjekord

Konto loomine, sulgemine ja taastamine peavad kasutama sama kontopiiri:
uus tavakasutaja valib ühe eraisiku või ettevõtte profiili. Kontoga seotud
tehnilised omandiseosed säilivad; ettevõtte liikmete/rollide/omaniku üleandmise
kasutajaliides ja mitme identiteedi üldine haldus ei kuulu avamisulatusse.

22.11 kasutaja palus selle tööga jätkata ja soovis järgmise suunana
kuulutuste esiletõstmise ning reklaamide lisamise. Tööjärjekord on:

1. Konto sulgemise, taastamise ja kustutamise toimiv tervik, väikeste
   kontrollitavate sammudena. Käesolev metaandmekontroll on selle ettevalmistus,
   mitte valmis konto sulgemise funktsioon.
2. Olemasolevate kuulutuste esiletõstmise väike tervik: omaniku valik, selge
   hind/kestus, arvestus, märgistus, asjakohane näitamine ja lõpetamine.
3. Välisele veebilehele suunavate reklaamide esimene teekond varasema
   `advertising-access-plan.md` järgi, alustades piiratud päringust ja ülevaatusest.

Reklaamimooduli teostus täpsustab vajadusel iseteeninduse ulatust. Esiletõstmine
peab järgima avaldamise olekut, otsingut, rubriiki ja piirkonda. See ei muuda
orgaanilist avaldamisaega ega ava aegunud või suletud sisu uuesti. Tavaline
osalemine ei sõltu Energy ostust. Hinnakirja ja tasumise teostust ei otsustata
selle konto kontrolliga; uut reklaamirahakotti ega AI-teenust siin ei lisata.

Varasema reklaamikavandi järgi võib reklaamija kasutada sama kontot ilma
avalikku müüjaprofiili avaldamata. Konto elutsükli haldus peab töötama ka
avaliku profiilita. See ei lisa eraisiku/ettevõtte kõrvale kolmandat kontotüüpi
ega nõua sama konto teist identiteeti.

Sisselogimise/registreerimise uue lahenduse paigaldus ja SMTP/Confirm email
jäävad senisele pausile kuni kokkulepitud domeenietapini. Need peavad olema
kontrollitud enne väliseid kasutajaid. Taastatud 21.11 registreerimise kood
on praeguse kontolepingu sisend, mitte selle kontrolliga paigaldatav muudatus.

## Miks on uut kontrolli vaja

Vastu võetud lähtekood ja taastatud algprofiili ettevalmistus kirjeldavad
konto ning profiili loomist. Need ei tõenda kogu praegust pilvekataloogi,
eriti Auth konto loomise tegelikke seotud triggereid ning konto/profiili
õigusi. Viimane tööloendi paranduse vaatlus kattis teist, kitsamat lepingut.
Seda lõpetatud parandust ja selle teste ei korrata.

Kontroll peab kinnitama, millised konto/profiili seosed ja loomistee elemendid
on päriselt olemas ning millised teadaolevad lähtekoodipõhised eeldused
vajavad täpsustamist enne elutsükli oleku lisamist. See ei kogu konto sisu.

## Lubatud vaatlus

- Kuue konto/profiili lähterelatsiooni olemasolu ja struktuuri metaandmed:
  `auth.users`, `public.profiles`, `public.identities`,
  `public.identity_profiles`, `public.business_accounts`, `public.business_members`.
- Nende otsesed välisvõtmed koos kustutamise/uuendamise käitumisega ning
  seotud relatsioonide nimed; ilma kasutajaridade või kogu kustutusgraafita.
- Piiratud õiguste, RLS-i, constraint'ide ja seotud triggerite metaandmed.
- Vajalikud fikseeritud konto/identiteedi abifunktsioonid, seotud triggerite
  funktsioonid ning piiritletud kataloogisõltuvused.
- Funktsioonide, poliitikate ja muude võimalikke literaale sisaldavate
  definitsioonide sõrmejäljed. Kehasid ega konfiguratsiooni saladusi raportisse ei kopeerita.

Puuduv objekt, piiratud katvus, puuduv ligipääs ja tundmatu sõrmejälg on eri
olukorrad. Neid ei tõlgendata nulli kasutajaandmete ega rakendamise loana.
Kataloogisõltuvused ei tõenda dünaamilise SQL-i või PL/pgSQL-i täielikku
käiguahelat; konkreetne tundmatu funktsioon võib vajada eraldi sihitud võrdlust.

## Täitmise piir

Kasutatakse olemasolevat kinnitatud Supabase CLI 2.117.0 ja sama seotud
projekti. CLI failid ja siht kontrollitakse enne käivitamist. Uut teenuseühendust,
CLI paigaldamist või kontode autentimist ei alustata.

Enne pilvepäringut kontrollib käivitaja olemasoleva Maci hoidla tegelikku
main-haru, HEAD-i, tööpuud ja indeksit, lähtefailide inventari ning kinnitatud
fetch/push remote'i. Kõrvalekaldel säilitatakse seis ja väljastatakse STOP.
Pärast vaatlust kontrollitakse uuesti kohalikku seisu. Kontroll ei kirjuta
portaali lähtefaile, indeksi sisu ega Git ajalugu.

Andmebaasipäring toimub selges ainult lugemise tehingus, luku-, lause- ja
protsessipiiridega. Rakenduse RPC-sid ei kutsuta. Raport sisaldab valideeritud
piiratud JSON-i; toorest käsuväljundit, keskkonnamuutujaid ega vearidade
saladusi ei jagata. Käivitajal puudub rakendamise, avaldamise või kustutamise
haru ning kinnitust `--publish` ei ole.

Ühtegi kasutajate e-posti, konto- või sessioonirida, sõnumit, pildifaili,
Storage objekti, rahakoti saldot ega liikmete nimekirja ei loeta. Konto,
profiili või sisu olekut ei muudeta. Varasemaid päevikuid ja raporteid ei avata
kirjutamiseks ega valita uue raporti asemel.

## Raport ja järgmine samm

Igal käigul on oma privaatne püsiv päevik ja unikaalne privaatne Downloads-koopia.
Terminal trükib `SAADA SEE FAIL: <täpne absoluutne rada>` ning avab selle faili
Finderis piiratud `/usr/bin/open -R` käsuga. Kopeerimise ebaõnnestumisel näidatakse
kontrollitud originaali. Finderi vea korral jääb täpne rada terminali.
Viimase salvestuse vea järel märgitakse allesjäänud raport võimaliku varasema
seisuna. Kui raportit ei tekkinud, palutakse saata PEATATUD-rida.

Kasutaja Maci päris raport vaadatakse üle enne konto oleku mooduli rakendamist.
Tulemuse vastuvõtt eristab metaandmete edukat kogumist, kontrolli katvust ja
lahendamata sõltuvusi. Seejärel saab teha lihtsa konto oleku/sulgemise vaate
ning kontrollitud serverimuudatused. Kontroll ise ei loo kontode sulgemise nuppu.

Ettevalmistuse kontrollide täpsed tulemused ja tõendipiir on paketi proof-kaustas.
Üks praegune tööjärg ning täpne käsk on CURRENT_STATE.json-is; loetav üleandmine
on sellest genereeritud. Enne tegelikku kasutaja raportit ei väideta Maci või
pilve kontrolli läbituks, uut commit/push'i ega Verceli avaldamist.

## Ametlik tehniline alus

- https://www.postgresql.org/docs/17/sql-set-transaction.html — ainult lugemise tehingu piir.
- https://www.postgresql.org/docs/17/ddl-depend.html — kataloogisõltuvuste tõendipiir funktsiooni keha puhul.

Need allikad ei tõenda Selqiro pilve praegust skeemi; selle jaoks on vajalik
käesoleva kontrolli tegelik raport.
