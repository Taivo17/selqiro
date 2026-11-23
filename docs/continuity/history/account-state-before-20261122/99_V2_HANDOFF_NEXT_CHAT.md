<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 22.11.2026 Europe/Tallinn — konto aluse ainult lugemise kontrollpakk ette valmistatud; Maci raport ootel

## Praegune checkpoint

Konto loomise ja elutsükli ühise lihtsa mudeli jaoks on ette valmistatud piiratud metaandmekontroll. Käivitaja kontrollib tegelikku 034211d Git/lähtepuud, indeksit, kinnitatud remote'i ja olemasolevat CLI-sihti; teeb ühe ainult kataloogi lugeva päringu ning väljastab selle käigu privaatse raporti. Konto sulgemine/taastamine/kustutamine ei ole veel rakendatud. Kasutaja soovis pärast seda kuulutuste esiletõstmist ja reklaame.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 034211d2ee3dfadd4ba791977c98e310754e4d94, parent 78aea6f6d7c57aee47a29cd0e8b29c9c4e862561. Raporti ja väljastatud täpse 21-faililise delta järgi tuletatud puu 03768a7e12d1aeb4ff7402d3102800071920df0e, 2047 jälgitavat faili. Kõik kohalikult taastatud failid vastavad inventarile.
- **Maci tõend:** selqiro-too-lugemisluku-parandus-20261122-raport-20261122-191313-bbadc41bced5.json, 333025 baiti, SHA256 90c85b1426d40e96537af482e802b2cc49c18c618ef568ae9114b20728da8920. Käik 22.11.2026 19:12:07–19:13:13 Europe/Tallinn. stage complete, database verified, build passed, push verified; eelmine originaalraport säilis.
- **Brauseri tõend:** Ready / Production on kasutaja kuvatõmmise, mitte Verceli API järgi. Taivo Garaaz vaates on Otsin lume lükkajat täna olekuga Suletud; Milline Vedu vaates Muruniiduki operaator olekuga Aktiivne. Eraisiku/ettevõtte eristus põhineb kasutaja kinnitusel. Uut sõnumite, telefoni ega koormuse läbimängimist ei väideta.
- **Piiratud parandus:** Muudetud on ainult get_my_jobs_v1 keha ja STABLE omadus. Tööloendi õiguste kontroll ja sisu kasutavad päringu alguse ühtset andmeseisu. Jagatud kirjutamiskontrollid, nende lukud, kliendi üks lisakatse, vastuse leping ja kasutajaandmed säilivad.
- **Registreerimise ettevalmistus:** selqiro-eposti-ettevalmistus-20261121.zip, 7323153 baiti, SHA256 7d54275c1b868e04f220ba0c8bbcc7ca75ce6093fea6de9b51e88bb116bd03bc. Alus cd35d18; 48 uut faili ja app/auth/page.tsx asendus. Uued teed puuduvad 034211d-st ning auth-leht vastab eelseisule. Ühised kontrollitud sõltuvused säilivad.
- **Tegelik mudel:** Ettevalmistatud complete_my_first_profile_v1 loob ühe valitud algprofiili konto auth.uid() järgi ning säilitab korduskatsetel olemasoleva. Ettevõtte sisemised omanikuseosed jäävad õiguskontrollide jaoks; nende haldusvaadet ei lisata. Sulgemisoleku kontroll tuleb hiljem siduda sama loomisteega.
- **Ulatus ja paus:** Sisselogimise/registreerimise paigaldus ning SMTP/Confirm email jäävad selqiro.com etappi enne väliseid kasutajaid. Konto sulgemise arendus ei eelda selle etapi varasemat avaldamist, kuid peab järgima sama konto/profiili lepingut.
- **Varasema auditi kasutus:** Andmeseoste, piltide, sõnumite ja Energy tervikluse leiud säilivad. Ettevõtte rollide ja mitme identiteedi kasutajaeelvaate prioriteet on asendatud lihtsa kontomudeli lepinguga; algsed dokumendid on history-s muutmata.
- **Dokumentide seis:** Praeguse ja varasema vastuvõtu/kontomudeli dokumendid on kumulatiivne ettevalmistatud delta. Seisukirje, genereeritud üleandmine, mälu ja päeviku lisad pole Macis rakendatud ega commit'itud. Kontrollkäivitaja neid hoidlasse ei kirjuta; need lähevad järgmise sisulise muudatusega kaasa.
- **Kontrollpakk:** selqiro-konto-aluse-kontroll-20261122.zip, ettevalmistatud main 034211d alusele. Runtime-manifest 1cfa6f5233f9eeae57a1489273f453dec49da70e90a068895a042d06d955cf67. Üks piiratud READ ONLY päring: kuus konto/profiili relatsiooni, otsesed seosed/õigused ja vajalikud funktsioonide sõrmejäljed. Kasutajaridu ega definitsioonide literaale raportisse ei loeta.
- **Rakendamise tõendipiir:** Päringu katvus complete tähendab ainult piiritletud metaandmete edukat kogumist. Funktsioonide keha võrdlus ja elutsükli rakendamise otsus jäävad eraldi. Päris Maci/CLI/Supabase'i vaatlust pole selles ettevalmistuses tehtud.

## Tegelik kohalik katse

- 48/48 käivitaja kontrolli: tegelik ajutine Git ja kohalik bare remote, võltsitud CLI, range päringuparser, muutunud allika/indeksi/sihtkoha peatumised, katkestuse/ajapiiri protsessikoristus ning täpne privaatne raportikoopia ja Finderi veateed.
- 11/11 tegelikku eraldatud PostgreSQL 17.6 kontrolljuhtu ning 27/27 parseri juhtu läbisid. Sünteetiline skeem tõendas kõrvaltoimete puudumist, literaalide mitte-väljastamist, õiguste/puudumise eristamist ja piiratud tulemuse ausat esitust. Oma testserver on peatatud.
- Täpne lõplik SQL/parser vastab testitõendite räsile. Python 3.9 süntaks, pakiseos ja dokumendid kontrolliti. Päris Maci/Finderit, kinnitatud Supabase CLI-d ega tootmiskataloogi siin ei käivitatud; rakenduse build'i ja varasemaid portaali teste ei korratud.

## Production / kasutajaliides

- Viimane vastu võetud Production säilib main 034211d: varasem Maci raport, sama commit'i Ready / Production ning kasutaja eraisiku/ettevõtte tööloendi kontroll.
- Uus kontrollpakk on kasutaja Macis käivitamata. Selles etapis pole tehtud konto/sisu/andmebaasi/Auth/SMTP muudatust, commit/push'i ega uut deployment'i.

## Üks järgmine töö

Paki selqiro-konto-aluse-kontroll-20261122.zip Downloads-kaustas lahti ja käivita üks kord: python3 -I -B "$HOME/Downloads/selqiro-konto-aluse-kontroll-20261122/kontrolli.py". Saada täpselt SAADA SEE FAIL juures näidatud raport. Selle tegelik vaatlus võetakse vastu enne konto oleku mooduli rakendamist. Sisselogimise ja SMTP paigaldus jäävad kokkulepitud pausile.

**Peatumisel:** PEATATUD korral säilita kõik ja saada näidatud raport; kui kontrollitud raportit pole, saada PEATATUD-rida. Ära korda käiku ega muuda indeksit/lähtefaile vea oletuse põhjal. Tundmatu või piiratud katvus ei ole null ega kustutusluba. Lõpetatud 034211d parandus ja vanad paigaldajad jäävad ajalooks.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — selle uue ainult lugemise kontrolli üks käsk ja raporti saatmine.
- docs/architecture/account-foundation-catalog-20261122.md — vajalik vaatlus, katvuse piir ja konto → esiletõstmise → reklaamide tööjärg.
- docs/architecture/account-model-lifecycle-20261122.md — lihtne konto/profiili leping ja registreerimise ettevalmistuse paus.
- proof/runner/result.json ning proof/sql/preparation-proof.json — tegelikud ettevalmistuse kontrollid, räsid ja piirid.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, pakkumisi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata, liideta ega kirjutata ümber. Sisemised õiguskontrollid ja omandiseosed säilivad.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- Olemasolev /Users/taivo/selqiro ning Taivo17/selqiro remote. Viimane vastu võetud commit on 034211d2ee3dfadd4ba791977c98e310754e4d94. Raport kinnitab selle käigu puhta ja push’itud lõppseisu; hilisemat värsket Maci vaatlust pole tehtud.
- Next 16.4.6, Sharp 0.35.5 ning package.json/package-lock.json on samad. Olemasolev kinnitatud Supabase CLI kasutati ühe piiratud SQL-paranduse jaoks; uut ühendamist ega paigaldamist pole vaja.
- Lõpetatud originaalpäevik: /Users/taivo/Library/Application Support/Selqiro/job-owner-read-lock-20261122/e723754747c36cef7a62f4d1c7145e3f254a33ae48609f0f192bbd98139127aa/result.json. Hoida muutmata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
