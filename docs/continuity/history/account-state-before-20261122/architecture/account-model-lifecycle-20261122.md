# Üks konto, üks valitud profiil — loomise ja sulgemise ühine leping

22.11.2026 Europe/Tallinn. Kasutaja täpsustatud avamisulatus. Vastu võetud
rakenduse alus on `034211d`; käesolev dokument on ettevalmistatud muudatus.

## Otsus

Uus kasutaja loob Selqiros ühe konto ning valib eraisiku või ettevõtte profiili.
Tavaline kasutus ei nõua identiteetide mõistmist, teise profiili loomist,
ettevõtte liikmete haldamist ega omandi üleandmise töövoogu. Ettevõte otsustab
oma sisemise töökorralduse ise; Selqiro esimene versioon ei modelleeri töötajate
ülesandeid ja õiguste hierarhiat eraldi tootefunktsioonina.

See on 20.–21.11 dokumenteeritud lihtsustuse täpsustus. Varasema kontoelutsükli
auditi ettevõtte rollide ja mitme identiteedi mõju eelvaade ei ole enam esimese
mooduli eesmärk. Andmeseoste audit jääb tehnilise tervikluse alusmaterjaliks.
Sama e-posti aadressi teadmine, profiili tüüp või kliendi antud roll ei anna
toiminguks õigust; konto kontrollimine jääb serveri ülesandeks.

Portaalis on kasutaja kinnitusel kolm tema enda loodud kontot, eri e-postidega.
Ainult ühel on kaks identiteeti. See on säilitatav varasem testseis, mis ei määra
uue kasutaja tavateekonda. Kontosid või profiile selle otsuse rakendamiseks ei
ühendata ega eemaldata. Nende tulevast kustutamist praegu ei tehta.

## Mida lähtekoodist kinnitasime

| Osa | Kontrollitud seis |
| --- | --- |
| Avaldatud alus `034211d` | `app/auth/page.tsx` sisaldab vana ühist konto loomise ja sisselogimise vormi; uue esimese profiili valikut seal pole. |
| 21.11 ettevalmistus | Täpne `selqiro-eposti-ettevalmistus-20261121.zip` on taastatud. Selle alus on `cd35d18`, mitte tänane Production. |
| Muudatuse suurus | 48 uut faili ja üks muudetud olemasolev fail, `app/auth/page.tsx`. Kõik uued teed puuduvad vastu võetud alusest; auth-leht vastab ettevalmistuse eelsele räsile. |
| Registreerimise järjestus | Auth konto tekib enne profiili. Tegelik sessioon või kinnitamise tulemus viib algprofiili valikusse: eraisik või ettevõte ning avalik nimi. |
| Esimese profiili loomine | `complete_my_first_profile_v1` tuletab konto `auth.uid()` järgi ning salvestab valitud profiili tervikliku andmebaasitoiminguna. Korduskatse säilitab olemasoleva profiili. |
| Ettevõtte sisemised seosed | Ettevalmistus loob ühe ettevõtte ja sama konto omaniku liikmekirje, mida olemasolevad õiguskontrollid vajavad. Töötajate või rollide haldusvaadet see ei lisa. |
| Varasemad kontrollid | Arhiivis on 27 rakenduse/kirjamalli testi, 17 eraldatud PGlite juhtu ja build'i õnnestumise tõendid. Need on ajaloolised tulemused, mitte praeguse ühendatud lähtekoodi uus katse. |
| Tegemata kasutuselevõtt | Ettevalmistuse SQL, uued auth-vaated, kirjamallid, SMTP ning päris kirjade kontroll ei ole selle tööga tootmisse viidud. |

Nelja kasutatava ühise abifaili ning package/lock-faili baidid sobivad praeguse
alusega. See lubab jätkata täpse delta sobitamisega, kuid ei tõenda värsket SQL-i,
build'i või brauserikäiku. Vana arhiivi täieliku lähtekoopia paigaldamine kaotaks
hilisemate paranduste lähtekoha ja ei ole jätkamise viis.

Praeguses päises leidub endiselt identiteedi valikut ka ühe profiili korral.
Üksnes ettevalmistatud registreerimise lisamine ei lõpeta veel kogu lihtsa konto
kasutajaliidest. Päise lihtsustus kuulub selle lahenduse hilisemasse sobitamisse;
see ei nõua omanikuandmete, serveri õiguskontrollide või ajaloo eemaldamist.

## Konto loomise ja sulgemise ühine piir

Konto tähistab sisselogimiseks kasutatavat Auth kasutajat. Profiil kirjeldab,
kuidas konto eraisiku või ettevõttena portaalis esineb. Olemasolev `identity_id`
jääb tehniliseks omandiseoseks; seda ei ole vaja muuta kasutaja igapäevaseks
valikuks. Konto tüüp tuletatakse ühest autoriteetsest profiili/identiteedi
andmeallikast, mitte eraldi vabalt muudetavast kliendilipust.

| Olukord | Nõutav käitumine |
| --- | --- |
| Auth konto olemas, profiil veel lõpetamata | Konto olek on loetav ja konto haldus ei sõltu avaliku profiili olemasolust. Algprofiili puudumine ei tähenda konto puudumist. |
| Uus aktiivne konto | Lubatud on üks valitud eraisiku või ettevõtte algprofiil. Avalik nimi ei määra omanikku. |
| Korduv registreerimise jätkamine | Kasutatakse sama kontot ja olemasolevat profiili; uut paralleelset profiili ei looda. |
| Konto sulgemine | Tegevus käib autentitud konto ja selle profiili/sisu kohta. Aktiivse profiili valik ei muuda konto sulgemist pelgalt profiili vahetuseks. |
| Sulgemine pooleli | Algprofiili loomine, uuesti sisselogimine või konto valiku kordamine ei ava kontot automaatselt ega alusta uut taastamistähtaega. |
| Teadlik taastamine | Taastatakse sama konto ja profiil lubatud tähtaja sees, järgides allesjäänud piiranguid; uut algprofiili ei looda. |
| Olemasolev kahe profiiliga testkonto | Andmed säilivad. Selle tulevase toimingu ulatus peab olema selge; ebaselgust ei lahendata ühe nähtava profiili vaikiva kustutamisega. Sellest ei kasva avamiseks uus liikmete/omanike haldus. |

Hilisem kontoelutsükli olek peab olema ühes serveri andmeallikas. Selle kasutuselevõtt
katab olemasolevad kontod, uue Auth konto, lõpetamata profiili loomise ja hilisema
algprofiili RPC sama lepinguga. Sulgemine ja profiili lõpetamine peavad konkureerides
andma määratud tulemuse; ainult lehe suunamine või peidetud nupp pole piisav.
Ettevalmistatud bootstrap kontrollib praegu Auth kustutamise/keelu olekut, kuid
uut Selqiro sulgemise ja taastamise olekut seal veel ei ole. See on konkreetne
ühine teostuskoht, mis tuleb järgmiste muudatustega kokku viia.

Säilib varasem sulgemise suund: selgelt kirjeldatud 30-päevane taastamisvõimalus,
teadlik taastamine ja eraldi kohese kustutamistaotluse käsitlus. Detailid on
`launch-profile-privacy-plan.md`-s. See dokument ei kinnita nende rakendamist ega
määra andmeliikide õiguslikke säilitustähtaegu.

## E-post ja konto elutsükkel

Konto loomise andmemudel on sulgemise otsene sõltuvus. SMTP ja kinnituskirjade
sisselülitamine on eraldi kasutuselevõtu sõltuvus.

Supabase'i `Confirm Email` nõuab uue kasutaja kinnitamist enne esimest sisselogimist.
Väljalülitatud seadistusega võib Auth täita kinnitamise ajamärgi automaatselt.
Arhiivi bootstrap nõuab tegeliku Auth konto sobivat olekut ja kinnitamise
ajamärki; see ei loe SMTP seadeid ega tõlgenda vana automaatkinnitust postkasti
avamise tõendina. Seetõttu saab sulgemise lepingu ja koodi ette valmistada enne
kirjasaatja aktiveerimist. Tundlik toiming vajab siiski serveris kontrollitud
värsket tõendit sama konto kasutamisõiguse kohta; kinnitatud e-post üksi ei ole
kustutamise kinnitus. Täpne parooliga kinnitamise teostus kontrollitakse selle
toimingu etapis olemasoleva autentimisega koos.

Sisselogimise ja registreerimise uue lahenduse paigaldamine ning e-posti
aktiveerimine jäävad kasutaja kokkulepitud pausile. `selqiro.com` kasutuselevõtul
sobitatakse ettevalmistatud delta siis kehtiva lähtekoodiga, seadistatakse
saatja, Site URL, täpsed tagasipöördumised ja mallid ning kontrollitakse päris
registreerimise, kinnitamise ja parooli taastamise teekonda enne väliseid kasutajaid.
Vana arhiivi küsimus põhidomeeni valiku kohta on lahendatud; seda uuesti ei küsita.

## Järgmine väike töö

Valmistada ette ühe konto elutsükli jaoks vajalik piiratud andmebaasi
kataloogikontroll. Selle sisend on nüüd taastatud algprofiili loomise leping.
Kontroll kinnitab konto/profiili seoste, olemasoleva loomistee, õiguste ja
muutmiskaitsete tegeliku eelseisu enne konto oleku mooduli rakendamist.

Vahetu ulatus on Auth konto, `profiles`, `identities`, `identity_profiles` ning
ettevõttekonto olemasolevad sisemised seosed. Lisanduvad ainult nende otsesed
FK/trigger/RLS/ACL ja kasutatavate funktsioonide sõltuvused. Auth skeemis loetakse
ainult vajaduseks põhjendatud metaandmeid; kasutajaridu ega sessioone ei koguta.
Varasemate piltide, sõnumite ja Energy leidude täielik kontroll jääb vastava
sulgemis- või kustutamisetapi juurde, mitte ei muutu selle kitsa kontrolli sisuks.

Kataloogikontroll ei loo kontot, profiili ega rahakotti; ei käivita rakenduse
RPC-sid, puhastust, SMTP-d, build'i ega vana paigaldajat. See ei kogu kasutajate
e-poste, sisu, pilte, liikmete loendeid ega saldosid. Aruande kehtivad eraõiguste,
unikaalse Downloads-koopia ja `SAADA SEE FAIL` reeglid säilivad.

Järgmine kasutajale nähtav moodul saab olla lihtne konto oleku/sulgemise vaade.
Ettevõtte liikmete/omanike ja mitme identiteedi üldine mõju eelvaade ei ole selle
avamise tingimus. Töökindlad sulgemise, taastamise ja lõppkustutamise toimingud
järgnevad eraldi väikeste kontrollitavate sammudena.

## Tõendid

- `evidence/onboarding-comparison.json`: arhiivi täpne identiteet, 49-faililise delta ja tänase aluse võrdlus, ühised sõltuvused.
- `research/baseline.md` ja `research/email-preparation.md`: täpsed lähtefailid ning koodi ja pilveseisu piir. Uurimismärkmete järgmise töö soovitusi täpsustab käesolev otsus: auth paigaldus jääb pausile.
- `evidence/registration-preparation/`: muutmata ajaloolised oleku- ja kontrollidokumendid; need ei ole praegused käivitamisjuhised.
- `evidence/source-references.json`: varasema auditi kontrollitud andmeseosed; nende olemasolu ei laienda toote avamisulatust.
- https://supabase.com/docs/guides/auth/general-configuration — Confirm Email ja automaatne kinnitamise ajamärk.
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser — serveri Auth kustutamistoiming; üks selline kutse ei asenda Selqiro andmete elutsüklit.

Selles etapis taastati ja võrreldi ettevalmistust ning parandati dokumentide
ulatus. Rakenduse runtime'i, kasutaja Maci, andmebaasi ega kontosid ei muudetud.
Uut build'i, brauseri-, SQL- või kirjasaatmise katset ei tehtud.
