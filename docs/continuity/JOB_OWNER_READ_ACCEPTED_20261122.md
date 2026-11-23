# Tööloendi lugemisluku paranduse vastuvõtt

22.11.2026 Europe/Tallinn. Commit `034211d2ee3dfadd4ba791977c98e310754e4d94` on vastu võetud.

## Tegelik Maci käik

Algus 19:12:07, lõpp 19:13:13. Raport `selqiro-too-lugemisluku-parandus-20261122-raport-20261122-191313-bbadc41bced5.json`:
333025 baiti; SHA-256 `90c85b1426d40e96537af482e802b2cc49c18c618ef568ae9114b20728da8920`.

- Täpne väljastatud manifest: `e723754747c36cef7a62f4d1c7145e3f254a33ae48609f0f192bbd98139127aa`.
- Värske Next.js 16.4.6 build läbis.
- Kaks read-only eelkontrolli, üks kinnitatud SQL-rakendus ja üks eraldi read-only järelkontroll.
- SQL-i kinnitatud after-räsi: `0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef`.
- Kõik viis protsessi lõpetasid nullkoodiga; nende koristus on kinnitatud.
- Push on verified; eelmine originaalraport säilis read-only lukus.
- 44 kohalikku SQL-katset ja varasemaid 49 klienditesti ei korratud.

Täpsest 2030-faililisest alusest ja väljastatud 21-faililisest deltast tuletatud
uus puu on `03768a7e12d1aeb4ff7402d3102800071920df0e` ja sisaldab 2047 jälgitavat faili. See on lähte- ja raportitõendist
arvutatud inventar, mitte uus kasutaja Maci `git ls-tree` väljund. Raporti kinnitatud
commit’i autorit või ajatemplit ei oletata; Git commit object’i siin ei taastoodeta.

## Avaldamine ja kasutaja kontroll

19:13:59 kuvatõmmisel on sama `034211d`, `main`, Ready ja sinine Production.
Raporti algne `vercel: READY_NOT_CHECKED` jääb muutmata, sest brauserikinnitus
saadi hiljem. Täielikku Verceli deployment-ID-d ega API-vastust ei ole kogutud.

19:20:44 Taivo Garaaz vaates on Minu tööpakkumised laetud: „Otsin lume lükkajat
täna” on Suletud. 19:21:01 Milline Vedu vaates on „Muruniiduki operaator”
Aktiivne. Kasutaja kinnitas avanemist eraisiku ning ettevõtte profiiliga.
Selles etapis ei väideta eraldi uut sõnumite, mobiili, koormuse või igakülgset
brauseri automaatkontrolli.

## Tõendi piir ja säilitamine

Ülevaatus luges manustatud raportit ja pilte ning kontrollis väljastatud lähtefaile.
Algsete SQL-/build’i stdout-logide, Git-käskude ja indeksi toorbaite ei saadetud;
nende räsid ning kontrollide õnnestumine on seotud kontrollitud uuendaja raportiga.
Nelja SQL-vastuse JSON taastati raporti objektidest; taastatud baidipikkused ja
stdout-räsid kattusid kõigil neljal ning range vastuseparser võttis need vastu.
Siin ei käivitatud uut paigaldajat, SQL-i, build’i ega testi ning ei muudetud kasutaja Maci.

Algse tootmisluku hoidnud tehingu päritolu pole tuvastatud. Kitsas lugemise
lukusõltuvuse parandus on paigaldatud ning kasutuskontroll vastu võetud.

Väljastatud pakki ja algset raportit ei muudeta. Jooksva dokumentatsiooni
vastuvõtulisa on valmis järgmise sisulise muudatusega ühendamiseks; uut Maci
dokumentide commit’i selles ülevaatuses ei tehtud.
