# Foto valik, ajutine piirang ja keel — 07.11.2026

## Kasutaja tõend

Kasutaja mõõtis kahe foto lisamiseks stopperiga 17 ja 19 sekundit. Varasem
umbes 29 sekundit (võimalik 27–31) oli loendatud hinnang. Mõõdeti nupuvajutusest
foto nähtavale ilmumiseni. Algfailide mahud, sama foto kasutamine ja võrguolude
samasus pole kinnitatud. Uut täpset Maci commit’i või Verceli Ready-rida nende
kuvatõmmistega ei esitatud. Foto lisamise funktsionaalne vastuvõtt säilib.

Kuvatõmmised ja kasutaja teade näitavad kaht järjestikust valikut: rakenduse
„Vali uus foto”/„Lisa järgmine foto” ning seejärel native `Choose File`.
Viie aktiivse foto järel ilmus „Foto lisamine on ajutiselt piiratud”, kuigi
abitekst lubab kümmet. Nähtav oli ka kolm koristust ootavat algfaili.

## Üks kitsas parandus

`ManagedListingPhotoAdd.tsx` avab peidetud native failivälja sünkroonselt
kasutaja vajutusest. Esmavalik ja järgmise foto valik kasutavad sama rada.
Valija tühja tulemuse või sulgemise korral ei lähtestata toimingut ega
jätkamiskirjet. Sobiva järgmise faili valimise järel kasutab komponent
olemasolevat kontrollitud reset’i ning kontrollib kontrollerit, valiku
versiooni ja faasi. Uuem pooleliolev toiming säilib. Valimine teeb eelvaate;
üleslaadimine algab eraldi „Lisa kuulutusele” või jätkamise nupust.

`publicationCapacityReason` eristab senisest täpsest SQLSTATE 54000 loendist
kolm põhjust. `managedPhotoAdditionSession.ts` kuvab nende kohta arusaadava
teate. Toote kvoodid, SQL, API leping, õigused, taastumine ja võrgupäringute
järjestus jäävad samaks. Tundmatule vastusele ei omistata oletatavat põhjust.

## Viis fotot ei ole galerii lepinguline piir

Aktiivse galerii ülempiir on kümme nii kliendi mudelis kui SQL-i prepare ja
append kontrollis. Konto allocator võib vaba galerii koha korral siiski
keelduda, kui konto olemasolev piir on täis:

| Serveri põhjus | Olemasolev lähtekoodi piir | Uue teate tähendus |
| --- | --- | --- |
| `publication_open_attempt_limit` | 3 aegumata avatud katset | Kontol on juba mitu pooleliolevat lisamist. |
| `publication_daily_attempt_limit` | 20 uut katset viimase 24 tunni jooksul | Viimase 24 tunni lisamiste piir on täis. |
| `publication_retained_bytes_limit` | 300 MiB loogilist reservi | Uue foto jaoks pole praegu piisavalt vaba üleslaadimisruumi. |

Iga hilisem foto lisamine alustab ühe uue katse. Selle ettevalmistus reserveerib
25 MiB SOURCE-i ja 4 MiB WEB-i maksimumi, mitte ainult tegelikult saadetud faili
mahtu. Edukalt lisatud foto katse on published; koristust ootav SOURCE ei tähenda
avatud katset. Kolm ootel SOURCE-i üksi ei tõenda kogu konto reservi täitumist.

Kuvatõmmis ei sisalda täpset serveri põhjust ega konto loendureid. Seetõttu
pole alust nimetada kasutaja juhtumit üheks neist kolmest ega piire muuta.
Uus teade teeb järgmise kasutuskatse põhjuse nähtavaks ilma toore SQL-veata.

## Keel ja lihtsus

Inglise põhikeel/varukeel ja eesti teine keel on kinnitatud kasutajanõue.
V1 `profiles.language` ja tõlkeabi on olemas; V2 ei kasuta neid kõigis
kasutajatekstides. Täielik audit ja järgmise tervikliku keeleetapi leping on
`../architecture/interface-language-v1.md`-s. Foto valiku parandust ei
nimetata kogu V2 lokaliseerimiseks.

Praegune muudatus puudutab kolme olemasolevat runtime-moodulit ja kahte
sihitud testi. Uut tõlkemootorit, üleslaadimisrada, serveri teenust, andmebaasi
või õiguste erandit ei lisata. Ajamõõtmine ja suurte fotode ettevalmistus
jäävad eelmise kontrollitud paranduse kujule. Endiselt tuleb mõõta, millises
etapis kulub tootmise 17–19 sekundit; kogu aega ei omistata pildikontrollile.

## Kontrolli ja tarne piir

- Üks sihitud testijooks: 58/58 PASS; kolm põhjust, tundmatu vastus,
  sama päevik/galerii, keeldumisel null PUT-i ning selge katkestamisrada.
- Täielik `npm run build -- --webpack`: PASS, 27,72 s sünteetiliste seadetega.
- Integreeritud muutmisvaade päris Chromiumis 1440/390 px: 7/7 PASS.
  Üks klikk/Enter tekitas native filechooser sündmuse; tühja valiku korral
  jäi päevik samaks. Sobiva järgmise faili valikul lähtestati ainult lõpetatud
  toiming; uuem teise vahekaardi kavatsus säilis. Kolm eraldi piiranguteadet
  kontrolliti viie fotoga ning kümne foto piiri juures jäi valik suletuks.
  Olemasolevad fotod/põhipilt ja salvestamata pealkiri säilisid. Auth/RPC/Storage
  vastused olid sünteetilised; OS-i galerii välimust ega tootmise viivitust see
  ei tõenda. Brauseri kahel esimesel käivitusel ei alanud juhtumid kohaliku
  runtime’i puudumise/arhiivi omaniku vea tõttu; tõendid säilisid. Olemasoleva
  runtime’i cache-local lahtipakkimise järel läbisid kõik seitse juhtu.
- Uuendaja 19/19 sihitud Giti/jätkamise kontrolli läbisid kohaliku ajutise
  Gitiga. Rakenduse build oli paigaldaja katses asendatud kontrolliga;
  tegeliku rakenduse build’i tõend on ülal eraldi.
- Tarne eraldi Giti/jätkamise kontrolli tõendid on paketi `kontrollid/` kaustas.
  Sünteetiline katse ei kinnita kasutaja Maci, GitHubi, andmebaasi ega Vercelit.
- Väljastatud kiirenduspaketti ja selle lähtepuud ei muudeta. Uus paigaldaja
  kontrollib üht vahetult eelnevat edukat raportit ning sõltumatult tegelikku
  commit’i, vanemat ja täpseid faile. Sellel sammul ei käivitata SQL-i ega
  Storage’i toiminguid. Päris järgmine samm on HOSTED_PORTAL.md-s.

## Hilisem pakendamise peatus ja r2

07.11 kell 11:58 lisatud terminalipilt näitab PACKAGE_EXTRA_FILE_REFUSED.
Assistent oli pärast 20-failise koostepaki kontrolli lisanud lõplikku 32-failisse
ZIP-i kaks .log tõendit; lubatud olid .json/.md. Täpne ZIP kordab viga enne
Maci/Giti/päeviku toiminguid. See on assistendi pakendamisviga, mitte kasutaja
lahtipakkimise viga ega rakenduse regressioon. Vt
[pakiparanduse märge](PHOTO_PICKER_PACKAGE_FIX_20261107.md).

R2 säilitab kolm runtime-moodulit, kaks testi, uuendaja ja eelkäija profiili.
Rakenduse build’i ja brauserikontrolli tõendid säilivad samade koodibaitide
kohta. Uue tarne kontroll peab hõlmama lõplikku ZIP-i pärast kõiki tõendifaile.
