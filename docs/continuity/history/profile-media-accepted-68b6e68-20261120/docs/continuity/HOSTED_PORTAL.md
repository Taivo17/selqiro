# Profiilipildid, ettevõtte logo ja taustapildi sobitamine

20.11.2026. Praegune vastu võetud lähtecommit on `ab5d1d8`. Selle „Minu profiili” vorm töötab kasutaja raporti ja sama commit’i Ready / Production tõendi järgi. Kell 21:46 kogutud pildihoidla õiguste kataloog on terviklik ja läbi vaadatud.

## Käivitamine

Ava `selqiro-profiilipildid-20261120.zip` Downloads-kaustas. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiilipildid-20261120/uuenda.py" --publish
```

Uuendaja kontrollib kinnitatud lähtekoodi, indeksit, remote’i, eduka profiiliredaktori originaalraportit, viimase pildihoidla koguja originaale ning projekti õiguste seisu. Seejärel paigaldab ta failid, teeb kohalikud katsed ja build’i, rakendab ühe kontrollitud SQL-tehingu ning teeb kinnitatud tulemuse järel commit’i ja push’i.

Säilita senised raportid ja `Downloads/selqiro-recovery` viimase koguja tulemus. Vanu programme ei ole vaja uuesti käivitada. Puuduvat manifesti ei pea ise looma.

## Pärast käiku

Saada terminalis `SAADA SEE FAIL` juures näidatud uus raport. Eduka commit’i järel oota Vercelis **sama commit’i** `Ready / Production` tulemust ja värskenda portaali.

**Minu ala → Minu profiil** võimaldab valida profiilipildi või ettevõtte logo ning sellest sõltumatu taustapildi. Uus valik ilmub kõigepealt eelvaatesse ja jõuab avalikuks salvestamisel. „Sobita pilti” võimaldab taustapilti nihutada ja mõõdukalt suurendada; loobumine jätab senise pildi alles. Pildi eemaldamine ei too tagasi vana varupilti.

Ühtne pilt peab olema näha avalikul profiilil, ülamenüüs ja sõnumites. Vestluspartneri nimi ning pilt avavad tema avaliku profiili, kui see on avalikult saadaval. Kontrolli nii ettevõtte kui ka eraisiku profiili ning telefonilaiusega taustapildi eelvaadet.

## Kui käik peatub

Saada uus raport või raporti puudumisel täpne `PEATATUD` rida. Ebaselget SQL-kirjutust ei korrata automaatselt. „Valmis” tähendab raportis kontrollitud kohalikke ja Git/SQL samme; Verceli ja brauseri tulemus võetakse eraldi vastu.

Uus pakett ei ole selle juhendi koostamise ajal kasutaja Macis käivitatud. Piltide vana hoidla sisu ei kustutata hulgi; konto täieliku kustutamise reeglid on järgmine eraldi töö.
