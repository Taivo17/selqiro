# Konto aluse tegeliku kontrolli vastuvõtt

22.11.2026 Europe/Tallinn. Vastu võetud on kasutaja saadetud täpne raport
selqiro-konto-aluse-kontroll-20261122-raport-20261122-215849-e724cd8c7e46.json.

- 324518 baiti; SHA256 9bd1e79598711cf3f0e6af48239c81dc9d7080922aa184ad64763ae74da691e4.
- Käik 21:58:45.178–21:58:49.103 Europe/Tallinn; stage complete, coverage complete.
- Üks 2.508 sekundi pikkune ainult kataloogi lugev pilvepäring; andmekirjutusi ei tehtud.
- Enne/pärast identne puhas main 034211d2ee3dfadd4ba791977c98e310754e4d94.
- Puu 03768a7e12d1aeb4ff7402d3102800071920df0e; 2047 inventariga kontrollitud faili.
- Indeksi ja index-entries räsid säilisid; kinnitatud remote'i main kontrolliti enne pilvepäringut.
- Kuus juurrelatsiooni, 11 funktsiooni, kaks seotud triggerit; tõend oli kärpimata.
- Kõigi 11 funktsiooni keha/config räsid sobivad vastu võetud lähtekoodiga.
- Auth users loomise mitte-sisemisi triggereid selles vaatluses polnud; see ei kirjelda väliseid hook'e.
- Nelja registreerimise ettevalmistuse funktsiooni puudumine sobib kokkulepitud pausiga.
- Auth konto loomisaeg võib olla null; uue konto vaate leping säilitab selle.

Sõltumatu kontroll taastas ja võrdles kõik 29 käsu stdout-baidivoogu ja räsid;
lubatud puuduva git config võtme exit 1 oli ainus mitte-null väljumine.
Raporti package_sha256 on käivitaja runtime-manifesti, mitte ZIP-arhiivi räsi.
Lõpetatud vaatlust ei korrata. Originaalraport ja varasem eduka SQL-paranduse
originaal säilivad Macis muutmata ning järgmine uuendaja hoiab neid ainult
lugemiseks lukus.

See tõend ei ole uue konto olekutabeli rakendamise tõend. Selle uus SQL,
Maci lähtekood, commit/push, deployment ja päris vaade on eraldi sammud.
Täpsed muutmata raportid, sõltumatu kontroll ja allikavõrdlus on järgmise
konto oleku paketi proof/evidence ja proof/catalog-review all.
