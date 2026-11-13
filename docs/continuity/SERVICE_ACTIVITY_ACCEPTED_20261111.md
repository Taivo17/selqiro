# Teenuse kehtivus — paigaldatud ja vastu võetud

Seis: 11.11.2026 Europe/Tallinn. Üks praegune seis on CURRENT_STATE.json.

## Tegelik rakendamine

Raport: selqiro-teenuste-kehtivus-20261111-raport-20261111-203526-70e2d5f66e11.json, 244129 baiti, SHA256 652dcf5cab818d257126d98698a350e876d30a0fd6ee452379a7262e6ad73a8c.
Siht /Users/taivo/selqiro; uus commit 955c935fa4e901a8b81885e2dcd18d966d651810; alus 1b0c5ba867e5f466e75f63aee78521d37cf8164f.
Jooks 20:34:25–20:35:24; SQL-i eraldi verify 20:34:58.
Tulemus complete / database verified / build passed / push verified.
Storage'i toimingud not_performed.

Muutmata ZIP-i SHA256 358a7370090c3d28a9dd9492cd96473769e815d8b6c531ea729ee15d723417f0; manifest 54c1e7de45a727623c078f48053fd4ca00615026b2ed4e195a5a517527b808ba.
Paigaldatud delta: 63 teed, 19 asendust ja 44 lisandust.
Algindexi ja täpse payload'i põhjal rekonstrueeritud 1607-failine oodatav puu:
9fa61dfb5c4f70aac08c63dc59e2de25cafe5d8f. Raport ei ekspordi eraldi lõpppuud, commit-objekti ega build'i toorlogi.
Puhta/remote-equal lõppseisu järeldus põhineb raportil ja uuendaja lõpukontrollidel;
uut live-Giti päringut siin ei tehtud.

## Andmebaas

Üks edukas preflight, üks acknowledged apply ja eraldi applied verify.
14/14 kaitset ning fikseeritud capability/dependency pinid sobivad.
Kolm jooksu invarianti ja hosted-kontekst säilisid. Authority ja structure
absoluutväärtusi ei võrdsustata sünteetilise fixture'iga: leping nõuab
nende säilimist tegeliku jooksu enne/pärast vaatlustes.
Üleminekukokkuvõte: 10 avaldatud teenust, 0 archived/draft/invalid.
Üksikuid UUID-sid, rollout-hetke ega activity-tähtaegu raport ei ekspordi.
Kõigi kolme SQL CLI käsu exit_code=0 ning stderr_bytes=27.
Stderr'i sisu pole eksporditud. database_last_read hoiab eellugemist;
viimane applied-järelkontroll on database_after.

## Veeb ja kasutajavastuvõtt

20:50:44 kuvatõmmis: 955c935, main, Ready / Production,
Add one-year service validity and explicit renewal.
Raporti algne READY_NOT_CHECKED jääb muutmata. Täis deployment-ID-d ega
Verceli API kinnitust ei väideta; sama pilti ei küsita uuesti.

Kasutaja: „Pikendamine õnnestus, avalikul profiilil on teenuse kuulutus alles,
rubriigiseosed on alles.”
20:45:46 pilt: Puhastusteenus, aktiivne, lõpp 11.11.2027 20:34.
20:46:14 pilt: sama nimega teenuse lõpp 11.11.2027 20:46 ja eduteade.
See vastab perioodile kinnituse hetkest; senise lõpu otsa ei liideta lisa-aastat.
Profiili ja rubriigiseoste säilimine põhineb kasutaja kinnitusel; uut
avaliku profiili pilti selles sõnumis ei olnud.
20:46:34 autoremont-dialoog tõendab kinnituse kuvamist, mitte selle teise
teenuse lõpetatud pikendamist. Täpset teenuse UUID-d ei esitatud.

Vastu võetud on aktiivse teenuse pikendamine ja profiilis/rubriikides säilimine.
Uut eraldi aegumise, peatatud teenuse, identiteedivahetuse, negatiivsete õiguste,
fotobaitide või koormuse katset sellest juurde ei väideta.

## Jätk

Lõpetatud installerit, SQL-i, build'i ega kasutuskatset ei korrata.
Ettevalmistuse testid säilivad varasema tõendina, neid ei käivitatud uuesti.
Väljastatud ZIP, originaalraport ja kõik päevikud säilivad muutmata.
Vastuvõtu dokumentide delta pole uus Maci/Giti commit; järgmine sisuline
lähtepakk kannab selle kaasa. Praegu uut terminalikäsku pole.

Järgmine soovitus on vaataja ajutine pakkuja peitmine otsingust/avastusest.
Seitse päeva on ettepanek; uut moodulit pole veel koostatud ega vastu võetud.
Vt VIEWER_PROVIDER_HIDE_NEXT_20261111.md.
