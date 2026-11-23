# Maci protsessivaatluse UID-leping ja r2 jätk

23.11.2026 Europe/Tallinn. See täpsustab ainult kontooleku paigaldaja jätkamist.
Rakenduse 11 ja SQL-release'i 9 faili jäävad algse v1 paketiga baiditäpselt samaks.

## Tegelik uus STOP

Kasutaja raport selqiro-konto-oleku-jatk-20261123-raport-20261123-165417-33be329be2cf.json
on 383150 baiti, SHA256
388d10eac2fdc1260ace24c399a56c842510e81d86aac9ffa9cd1b69e935f852.
See kuulub esimese jätku manifestile
334f54bb10da6ec0f4dec0917128002e727b9bdb60be8597f6b838cbefa8b251.

Käik algas kell 16:54:15.440 Europe/Tallinn. Kõik 27 Giti kontrollkäsku
läbisid ja lõppkoristus oli kinnitatud. Kinnitati sama main 034211d, v1
60-failine tööpuu ja muutmata 2047 kirjega indeks. Sõltuvused ning täpne
privaatne testilogi kontrolliti uuesti: tests=reused_verified,
executed_again=false. Uut testiprotsessi ei käivitatud.

Esimene runtime'i ps-proov väljus 0 ja tagastas 26496 baiti stdout'i,
0 baiti stderr'i; mõlemad EOF-id ning lõppkoristus olid kinnitatud.
Seejärel peatus UID-skoobi kontroll: CURRENT_RUNTIME_UID_SCOPE_FAILED.
Vaatlus lõppes 16:54:17.049. Lähtefailide/dokumentide kirjutus, build,
Supabase CLI, SQL, staging, commit ja push ei alanud. Ühtegi olemasolevat
arendus-/ehitusprotsessi ei lõpetatud.

Toorest protsessiloendit ei eksporditud. Konkreetset protsessi ega selle
UID-sid ei saa raportist nimetada. See raport ei muuda algse 14:38 build'i
kinnitamata lõppkoristust hiljem edukaks.

## Tõendatud koodilepingu viga

Apple'i ps juhendis valib -U protsesse reaalse kasutajatunnuse järgi.
Väljund ruid tähendab reaalset kasutajatunnust; uid tähendab efektiivset
kasutajatunnust. Need võivad protsessil erineda. -x kaasab sama valiku sees
protsessid, millel pole juhtterminali; see ei muuda UID tähendust.

Primaarallikas, kontrollitud 23.11.2026:
https://github.com/apple-oss-distributions/adv_cmds/blob/main/ps/ps.1

Esimene jätk valis -U abil reaalse UID järgi, kuid nõudis kõigilt ridadelt
uid == os.getuid(). See ühendas ekslikult kaks erinevat välja. Testid
kasutasid seni ridu, kus need olid võrdsed, ega katnud seda lepinguviga.

## Piiratud parandus

R2 loeb mõlemad UID väljad eraldi. Oma kasutaja protsessikaardi ulatus
kontrollitakse ruid järgi, enne/järelvaate võrdlus säilitab mõlemad väljad.
Valitud JavaScripti arendus-/ehitusprotsessi erinev efektiivne UID või
muutunud protsessiandmed peatavad kontrolli eraldi. Kõrvalist mitte-runtime'i
protsessi ei lükata tagasi ainult efektiivse UID erinevuse tõttu.

Täielik oma reaalse UID protsessikaart jääb alles. Puuduv cwd ei tähenda
kadunud protsessi: PID peab puuduma ka järgnevast täiskaardist. Senine
lapsegrupi viie väljaga parser, protsesside lõpetamise piirid, lsof võimaluste
kontroll, ajalimiidid ja privaatsusreeglid säilivad.

## Säilivad tõendid ja tööjärg

R2 hoiab nelja täpset originaalraportit ning nende lukke ainult lugemiseks.
Viimase jätku raport peab tõendama peatumist enne kirjutusi, sama algallikat
ja indeksit, 20 testi tõendi korduskasutust ning kinnitatud proovikoristust.
R2 päevik ja saadetava raporti nimi on eraldi; vanu raporteid ei parandata.

Algne 20 testi PASS seotakse sama rakenduse ja sõltuvustega. Üks uus build
on endiselt vajalik, sest algse build'i täielik logi ja artefaktitõend puuduvad;
esimene jätk uut build'i ei alustanud. Edasi tulevad muutmata SQL eelseis,
üks lisav apply, järelkontroll ning paketi commit/push. Verceli ja brauseri
vastuvõtt vajavad tegeliku uue commit'i kontrolli.

## Ettevalmistuse tõend

R2 UID-paranduse 11/11 ning raportisidumise/lukkude/eelseisu 13/13 sihitud
kontrolli läbisid Python 3.12.14 / Linuxis. UID-kontrollid kasutavad Maci
ps-lepingu näidisvastuseid; need ei ole parandatud käsu tegelik Maci käivitus.

- proof/process/uid-scope-tests.json ja uid-scope-tests.log seovad 11 UID
  regressiooni külmutatud allikatega. Senine viie väljaga grupiparser säilib.
- proof/runner/result.json ning selle nimetatud logi seovad 13 sihitud
  jätkamiskontrolli täpse uue STOP-i sidumise ja nelja raporti lukustusega.
- proof/review sisaldab tegeliku STOP-i vastuvõttu ning sõltumatut
  protsessiallika ja jätkukäivitaja ülevaatust.
- proof/source sisaldab samade sihitud kontrollide külmutatud allikaid.
- history sisaldab muutmata esimese jätku ZIP-i; selles säilib ka algne v1 ZIP
  koos varasemate rakenduse/build'i/SQL-i allikate ja kontrollitõenditega.

Varasemaid 20 rakendusetesti, SQL-i kontrolle, päris build'i ega esimese jätku
täielikke 33+33 kontrolle ei korratud. Päris Maci r2 käivitus ja pilvetoimingud
on veel tegemata. Eelmised STOP-raportid jäävad muutmata ajalooliseks tõendiks.
