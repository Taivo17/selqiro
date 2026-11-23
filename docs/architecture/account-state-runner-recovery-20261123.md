# Konto oleku uuendaja peatumine ja eraldi jätk

23.11.2026 Europe/Tallinn. Algne väljastatud pakett jääb muutmata:
selqiro-konto-olek-20261122.zip, SHA256
b912fec69227dc661533e011f40ec395fd8ae3227abf2ca1d97909c5fcfa0b5b.

## Tegelik vaatlus

Kasutaja STOP-raport selqiro-konto-olek-20261122-raport-20261123-143815-48e5c165fd6e.json (467461 B, SHA256 db041d83bf5163f9b3e5f0540d3a7bd190eda50fefc348839d9fb4332e5472d7)
kinnitab 60 faili rakendamise ja 20 testi õnnestumise. Viimane täielik
Git/lähtepuu kontroll lõppes 14:38:08.951 ning remote main 034211d vaatlus
14:38:08.841. Indeks säilis 2047 alusfailiga, staged diff oli tühi.
Buildijärgset seisu sellest raportist ei järeldata.

Build'i käivitusprotsess lõpetas exit 0. Kestus 6.187 sekundit, stdout 2570 baiti,
stderr 0 baiti; mõlema voo EOF registreeriti. Protsessi lõppkoristuse tulemus
oli unconfirmed ja peatumiskood CLI_TERMINATION_NOT_CONFIRMED.

Vanasse terminate() abisse olid koondatud killpg, child.wait ja väljunditorude
sulgemine. Nende vead läksid sama üldkoodi alla; konkreetne samm, errno, PID
ja PGID puuduvad. Seetõttu pole tõendatud kindel OS põhjus, Next.js viga
ega ühe kindla taustaprotsessi püsimine. Uus jätk ei esita seda vana
ebaõnnestunud kontrolli hiljem edukana.

## Mida säilitame

- Kõik 60 v1 faili ning 2047 failiga alus on värske kontrolli sisend.
- 11 rakenduse/testifaili ja 9 SQL release'i faili on v1-ga baiditäpselt samad.
- Vana originaalraport, update.lock, tests-passed.log ja varukoopiad säilivad.
- Täpne testilogifail 5002 baiti, SHA256
  6fbb9ad520b0d2cb074c3c1edc2addf7317e552ab2282939a721a1f4df0f350c.
- Samad 20 nimelist testi, reporter ja sõltuvused seovad varasema PASS-i
  sama rakenduse lähtekoodiga. Uut testikäsku ei fabritseerita.
- Varem vastu võetud kataloogi ja SQL-paranduse originaalraportid säilivad
  samuti ainult lugemiseks avatud lukustusega.

## Miks üks uus build

Vana protsessitransport katkestas enne stdout tagastamist kohalikule
kontrollijale. Build'i tulemuse parser, build-passed.log ja artefaktiräsid
ei jõudnud seetõttu käivituda. Pelk väljundihash ei taasta puuduvat logi.
Jätk teeb ühe uue build'i ja seob selle uue logi, protsessi tulemuse,
artefaktide ning muutumatu lähtekoodi kontrolliga. Varasemat rakenduse
või SQL testipakki selleks ei korrata.

## Eraldi uus päevik

Jätk ei nulli vana process_cleanup_unconfirmed välja ega muuda vana raportit.
Uus päevik hoiab vana tõendi viite ja ainult uued käsud. Praegune piiratud
protsessivaatlus kirjeldab praegust kohalikku seisu; ajaloolise tundmatu
PID/PGID eemaldamist sellega ei väideta.

Uus transport eristab loomulikku protsessi lõppu ja vea/katkestuse koristust,
talletab käivitatud lapse PID/oodatud PGID ja lõppsammude fikseeritud tõendi.
Tundmatu või aktiivse seotud protsessi korral jätk peatub. Üldist
kõigi Node-protsesside tapmist, vanade päevikute puhastamist ega kasutaja
muudatuste tagasipööramist ei ole.

## Pilve piir ja järgmine etapp

STOP käigus Supabase CLI kontroll, SQL preflight/apply/verify, git add,
commit ja push ei alanud. See on käivitaja tõend, mitte värske Supabase'i
kataloogivaatlus. Jätk kontrollib tegelikku pilve eelseisu uue build'i järel,
rakendab vajadusel ainult varem kontrollitud lisava SQL-i ja kontrollib järelseisu.
Ebaselget kirjutamist ei korrata; teadaoleva paigaldatud lepingu lugemine
on eraldi tõend.

Konto active-only vundamendi, privaatse andmeallika, Auth INSERT-triggeri,
lugemise RPC ja ON DELETE RESTRICT leping säilib. Sulgemine, taastamine,
lõppkustutamine ning nende üldine jõustamine pole selle runner-paranduse osa.
E-posti/registreerimise paus ja konto → esiletõstmise → reklaamide tööjärg säilivad.

## Jätku ettevalmistuse kontrollitud tõend

Uue jätkukäivitaja 33/33 kontrolli ja protsessimooduli 33/33 kontrolli läbisid.
Keskkond oli Python 3.12.14 / Linux. Jätkukatsed kasutasid päris ajutist
Git-hoidlat ja kohalikku bare-remote'i, sünteetilisi privaatseid raporti- ja
testilogifaile ning kontrollitud build'i/SQL-i näidisvastuseid. Protsessikatsed
kasutasid päris lapsprotsesse ja kitsast, ainult testis kasutatavat GNU ps --sid
adapterit. Tootmise Darwini käsud jäid muutmata. Maci ps/lsof lepingut kontrolliti
näidisvastustega; tegelikku Maci käivitamist siin ei toimunud.

- proof/runner/result.json ja recovery-tests.log: 33 kontrolli, 0 viga,
  174 sisendi enne/pärast/praegused räsid võrdsed.
- proof/process/process-tests.json ja process-tests.log: 33 kontrolli,
  6 sisendi enne/pärast/praegused räsid võrdsed.
- proof/review/report-review.json: tegeliku STOP-raporti vastuvõtt.
- proof/review/source-review.json ja process-review.json: sõltumatu
  lähtekoodi ja salvestatud kontrollitõendi ülevaatus; teste ei korratud.
- proof/source all on samade kontrollide lähtekood; history all on muutmata
  v1 ZIP koos varasema rakenduse/build'i/SQL-i kontrollide ja nende allikatega.

Praeguse protsessiseisu kontroll toimub enne dokumendikirjutusi, enne uut
build'i ja pärast build'i enne andmebaasi. Igas faasis tehakse kaks piiratud
oma kasutaja ps → cwd → ps vaatlust. lsof -Di kasutatakse ainult siis, kui
kohaliku binaari kontrollitud täielik help kinnitab selle toe. Puuduv cwd
ei tõenda üksi protsessi lõppu: PID peab puuduma järgnevast täielikust
oma kasutaja protsesside vaatlusest. Toetamata või ebaselge vastus peatab jätku.

Need vaatlused ei ole atomaarne OS-lukk, püsiv PID sünniidentiteet ega kõigi
võimalike protsesside puudumise tõend. Ulatus on praegu äratuntavad oma
kasutaja JavaScripti runtime'id, mille cwd paikneb kinnitatud hoidlas.
Vana teadmata lõppkoristus jääb sõnaselgelt kinnitamata. Uus käivitaja võib
ajalimiidi või katkestuse puhul lõpetada ainult enda loodud veel koristamata
lapse kinnitatud grupi; varasemaid arendus-/ehitusprotsesse ei lõpetata.

Rakenduse 20 testi, päris build'i, varasemaid SQL-kontrolle ega teenuste
ühendamist siin ei korratud. Maci jätk, uus tegelik build, pilve eelseis ja
muudatus, commit/push, Verceli Ready / Production ning brauseri vastuvõtt
jäävad uue käigu tõendada.
