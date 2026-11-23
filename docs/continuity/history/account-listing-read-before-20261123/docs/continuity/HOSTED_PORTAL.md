# Avaliku profiili konto-oleku kontroll on vastu võetud

23.11.2026 Europe/Tallinn. Main **8dc0b3b** on Maci raporti järgi puhas ja pushitud.
Üks SQL paigaldus ning eraldi verify kinnitasid profiili konto-oleku piiri.
Kasutaja Verceli pilt kinnitab sama commit’i Ready / Production tulemust; eraisiku
ja ettevõtte avalikud profiilid avanevad koos piltidega ning Minu konto on Aktiivne.

## Lõpetatud käik

Profiilipaketi uuendajat ja SQL-i enam ei käivitata. Kõik algsed paketid, raportid
ja päevikud jäävad alles. Varem lõpetatud kontooleku paigaldusi samuti ei korrata.
Käesolev vastuvõtutäiendus on järgmise koodipaketi jaoks ette valmistatud; selle
jaoks pole uut Maci kirjutust, commit’i ega push’i tehtud. Käsitsi kopeerimist ei ole vaja.

## Üks järgmine töö

Tavakuulutuste avalik otsing ja üksikvaade tuleb siduda sama kontoolekuga.
Põhiotsing kasutab ühendatud marketplace-lugejat; ainult eraldi vana otsingu
parandamine jätaks tegeliku kasutustee katmata. Täpne väike ulatus ja sihitud
kontrollid on `docs/architecture/account-listing-read-next-20261123.md`-s.

Sobivus peab kehtima enne lehekülje piiri; senised otsingu-, asukoha-, hinna- ja
asjakohasuse reeglid säilivad. Jõudlust tuleb hinnata konkreetse päringuplaani
põhjal. Üksiku konto indeksi kasutatavus ei tõenda otsingu skaleeruvust.

Selle järgmise mooduli lähtekood on olemas. Uut diagnostikapakki pole praegu vaja.
Järgmisel Maci kirjutusel kinnitatakse värske lähtepuu, indeks, haru/HEAD, remote
ja SQL eelseis. Konto sulgemise kasutusteekond lisandub pärast vajalike teiste
lugemise, kirjutamise, sõnumite ja piltide teede katmist.

SMTP ja uus registreerimine jäävad kokkulepitud domeenietappi enne väliseid
kasutajaid. Konto tervikule järgnevad kuulutuste esiletõstmine ja reklaamid.
