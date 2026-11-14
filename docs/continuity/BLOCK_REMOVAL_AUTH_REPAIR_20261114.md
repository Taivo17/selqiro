# Blokeeringu eemaldamise auth-õiguste parandus — 14.11.2026

## Praegune seis

Uus klient on juba Macis koostatud ning commit/push
`29b2457893d6fa9bab2756533319fdc13b841840` on kinnitatud. Sama commit’i
Ready / Production kuvatõmmis on vastu võetud. 14.11 kell 16:12:12 ja
16:12:20 Europe/Tallinn tagastas avalik portaal täpse selle kliendi märgi.
Serveri vanade eemaldamisteede sulgemine peatus ühe SQL-katse järel.
Eraldi auth-parandus on ettevalmistatud töö, mille tegelik Maci/pilve
rakendamine vajab oma eduraportit.

## Kaks seotud Maci raportit

| Raport | Baite | SHA256 | Tähendus |
| --- | ---: | --- | --- |
| selqiro-blokeeringu-kontroll-20261113-raport-20261114-155003-979933ecf319.json | 275210 | f564d1743bb5de6d4c78ffffa2629688fcf2108179aa69b3951143da8861c309 | Build/push valmis, uus SQL veel alustamata; kliendimärgi ootel |
| selqiro-blokeeringu-kontroll-20261113-raport-20261114-161233-d656c288cb17.json | 283347 | 098ab6ba0a1b040a2c8774453500a020dd8aff700a479433f7a281bd08466704 | Kliendimärk vastas; üks SQL-katse, seejärel kontrollitud absent ja STOP |

Teises raportis säilivad esimesed 15 käsukirjet ja 12 markerivaatlust täpsete
prefix’itena. Alus, indexikirjed, preimage’id, build-logi viide, commit ja
indexiräsid on muutmata. 23 käsu protsesside sulgemine on kinnitatud.
Varasema profile-väljaande päeviku säilimine kontrolliti kell 16:12:33.

Mõlemad raportid seovad sama algse manifesti
`a80ddb6c7cc66b148cff754078316e1ac5fed543cfe91cae34d1d3ef9b4fe0f5`.
1737-failine Git-puu `9d693408dcedda48a704693b4ce7aa188c7b15ba`
on tuletatud 1701-failise 371f4f4 aluse ja 60 täpse payloadi kaudu. See
võimaldab uut alust kontrollida; see pole uus otsene Maci/GitHubi lugemine.

## Serverilogi kinnitatud põhjus

Kasutaja antud `supabase_logs (1).json` sisaldab 24 kirjet ja 75037 baiti;
SHA256 `a26e30134fbbce26bfd6d5aa61fdef8bcaa6fb9ef1e1153d15aa9801ea40f934`.
Kirjed on seotud täpse jooksu ajaga:

| UTC | Europe/Tallinn | Tõend |
| --- | --- | --- |
| 14:12:20.211–14:12:27.208 | 16:12:20–16:12:27 | Üks SQL-katse, exit 1, kestus 6.997 s |
| 14:12:26.575 | 16:12:26.575 | Logitud paigaldusstatement’i 63729-baidine prefiks vastab täpselt väljastatud apply.sql-ile |
| 14:12:26.699 | 16:12:26.699 | Kaks hoiatust 01007: auth-skeemile ja uid-funktsioonile õigusi ei antud |
| 14:12:26.771 | 16:12:26.771 | Viga 55000: BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED |
| 14:12:27.221–14:12:33.558 | 16:12:27–16:12:33 | Eraldi verify õnnestub; algne absent-seis ja samad invariandid |

Vana apply.sql SHA256 on
`be9875629c007fa0407ecca4452beccab601bff2b8e588f9588a5bad412ed4cc`.
Logi SQL vastab selle faili täpsetele baitidele; teenus lisas lõppu ainult
allika/aja kommentaarid. Privaatseid teenuse identifikaatoreid ega kogu
SQL-logi ei kopeerita dokumentatsiooni. Hilisemad 14:41/14:43 lukuootused
on sellest katsest erineval ajal; neile ei omistata selle 16:12 tõrke põhjust.

Väljastatud SQL eeldas, et paigaldaja saab kitsale uuele rollile edasi anda
USAGE-i auth-skeemile ja EXECUTE-i auth.uid()-le. Päris server ei andnud neid
õigusi. Täpne rakendatud seisu kontroll keeldus sobimatust kataloogiseisust
ja katkestas tehingu. Sõltumatu verify näitas algset lepingut. See ei olnud
180-sekundilise CLI piiri täitumine; raporti toorvea teksti puudumise tõttu
saadi täpne 55000 põhjus eraldi serverilogist.

## Säilinud algseis ja selle piir

`database_initial`, `database_last_read` ja `database_after` on täpselt
võrdsed ka esimese raporti algseisuga. Kõik üheksa kaitset on true; state on
absent, capability_absent true ning capability_present false. Kolm säilinud
invarianti:

- existing_authority: `08c8a7298bb83274bcf125da5e9a55ffe92e448f97e9cc3e3deb86a0cfabed66`
- existing_functions: `d6272a3695fcbaa2c2763b2bcc7976e0195c922c32b05f4ad6545bfe2801475c`
- immutable_structure: `921190001e67110478dfc544c6aba13d87cdcdad062715377e1cecaf163422e6`

See tõendab kontrollitud skeemi/õiguste algseisu kell 16:12:33, mitte kõigi
kasutajaandmete inventuuri. Päeviku database=unconfirmed ja outcome=unknown
säilivad ajalooliste salvestatud väljadena; neid ei kirjutata tagantjärele
ümber. Uuendaja kaitse keelab vana intent’iga uue kirjutuse.

## Uue paranduse kitsas leping

Uus SQL on eraldi `supabase/repairs/20261114_block_removal_auth/` all.
Kogu `20261113_block_removal` lähtekood jääb muutmata. Parandus kasutab
nullargumendiga privaatset postgres-omanikuga funktsiooni, mis kutsub
olemasolevat auth.uid()-t; EXECUTE on kitsal CAS-kirjutajal ja omanikul.
RLS, privaatne kustutaja ja trigger kasutavad seda sama kitsast silda.
Auth-skeemi/uid ACL-i ei muudeta, uut JWT-parserit ei lisata, require_actor’i
lepingut ei laiendata ning püsivat SET/INHERIT-õigust ei lisata. Brauseri vana
versioonita kustutus peab endiselt keelduma ning täpse rea CAS jääb ainsaks
kliendi eemaldamisteeks. Lõplikud uued kataloogipinid ja sihtkontrollid on
uue SQL-alamkataloogi ning väljaande kontrollid/ all.

Uus runner kasutab oma väljaannet/päevikut ja hoiab vana ebaõnnestunud
päevikut ainult lugemiseks lukus. Värske Git/allikate/remote’i, originaalse
absent-kataloogi ja olemasoleva 29b2457 kliendimärgi kontroll eelneb uue
SQL-i ja dokumentide tööpuusse rakendamisele. Järgneb uus värske kontroll, üks kontrollitud tehing,
eraldi verify ning täpne Git-staging ja commit/push. Sama uue katse rakendunud SQL-i järel
katkenud commit’i saab lõpetada ilma SQL-i kordamata. Tundmatu või absent
järelseis nõuab ülevaatust. Kliendi build’i, klienditeste ega uut Ready-tõendit
selle ainult SQL/docs muudatuse pärast ei nõuta.

## Uue paranduse kohalik tõend

PGlite PostgreSQL/WASM kasutas sünteetilist postgres-paigaldajat, kellel
puudus superkasutaja õigus ning Auth-skeemi/uid õiguste edasiandmise luba.
Olemasoleva auth.uid() kasutamise õigus oli olemas. Sellel alusel läbisid:

- 13 runtime-juhtu: täpne CAS, vana defineri tõrjumine, vale kasutaja,
  muutunud blokeering, RLS ja privaatne actor-funktsioon, brauseri keelatud
  kirjutused ning hoolduse kitsas JWT-ta piir.
- 7 paigaldusjuhtu koos 11 rikkumiskatsega: algkaitsed, täielik rollback,
  tühja/mitmese kontrollrea ja NULL-järeltingimuse tõrjumine, sõltumatu
  kontroll ning avatud ACL-i, liikmesuse või muudetud funktsiooni tuvastamine.
- Täpse vana SQL-i taasesitus: mõlemad 01007 hoiatused ja lõppkaitse
  55000; pärast rollback’i absent, kõik üheksa kaitset true ning vana
  Auth owner/ACL/definitsioon ja kontrollitud kasutajaread muutmata.
- Runneri 24 sihitud andmebaasi-, diagnostika- ja protsessijuhtu.

SQL-tõendite sisendräside sõltumatu võrdlus ei leidnud erinevusi.
Täpsed kohalikud tõendifailid uues SQL-alamkataloogis:

| Fail | SHA256 |
| --- | --- |
| runtime-result.json | e50d3372076478517f198127c99f1b48f7fa083ff4c83fc6f48f66ce8a97c768 |
| installation-result.json | abfbee9ddbb308147504efa70b21ee317ee5e1ffce6a7ab7d99f13c9d01dec27 |
| original-failure-reproduction.json | ae7e41918612240e63438938cb3a6412d8f54b030b121ab652b55126fdd8e71f |
| guard-generation-result.json | 9bb95461a94593b58bb95900bd8ff9935afb11a9b8d3c70d0a3cb62b54e011bd |

Uue apply.sql SHA256 on
`c006cb9c095dd2a02b58f93afae5ac42b27067d247796e307105b83348b918f5`.
Rakendatud võimekuse uus pin on
`38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854`.
Algse absent-võimekuse ja dependency pinid säilivad. Sünteetilise fixture’i
oma struktuuri/õiguste invariandid ei pea võrduma päris serveri omadega;
nii testis kui päris paigalduses peab täpne enne/pärast kolmik säilima.

Väljastatud pakendi manifesti, lähtefailide, loaderi, Giti ja säilitatavate
päevikute lõplik kontrollseos ning integratsioonitulemus on
`kontrollid/loplik-kontroll.json`. Hoidla delta on 33 teed: 23 uut
SQL-alamkataloogi faili ja 10 dokumenti, neist 5 asendust ning 28 lisandust.
1732 alusfaili jäävad muutmata ning kandidaadis on 1765 faili. Need pole
uue Maci commit’i ega päris andmebaasi õnnestumise väited. Native PostgreSQL-i
paralleelseansside või päris Supabase’i katset kohalik tõend ei väida.

Üks järgmine käsk ja raporti saatmine on `HOSTED_PORTAL.md`-s. Pärast eduka
paranduse raportit kontrollitakse üht uut hilinenud kinnituse brauserijuhtu;
varasemaid peitmise ja kahe seadme kasutuskatseid ei korrata. Selle dokumendi
ettevalmistamine ei ole uue paranduse Maci/SQL/commit/push’i tõend.
