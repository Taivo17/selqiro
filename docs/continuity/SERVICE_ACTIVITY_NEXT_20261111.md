> Ajalooline ulatus enne teostust. 11.11.2026 on see samm uues lähtepaketis
> ette valmistatud ja kohalikult kontrollitud. Käesolev fail ei ole enam uus
> alustamiskäsk. Praegune seis: `CURRENT_STATE.json`; teostus ja tõendid:
> `SERVICE_ACTIVITY_20261111.md`; üks paigalduskäsk: `HOSTED_PORTAL.md`.

# Teenuse üheaastane kehtivus ja teadlik pikendamine

Seis: 11.11.2026 Europe/Tallinn. See on järgmise soovitatud töö ulatus,
mitte valmis lähtepakk, SQL-migratsioon või paigaldusjuhend.
Teenuste enda rubriikide samm on vastu võetud; seda ei alustata uuesti.
Üks praegune järg on `CURRENT_STATE.json`.

## Eesmärk

Teenuse avalik pakkumine kehtib ühe aasta vastavalt varem dokumenteeritud
365-päevasele reeglile. Omanik näeb Minu alas tähtaega ning saab teenuse
andmed üle vaadata ja kehtivust teadlikult pikendada. Aegumine jätab teenuse,
fotod ja rubriigiseosed omanikule alles.

## Enne kirjutusi

Loe paigaldatud 1b0c5ba teenuse kanooniline andmemudel, avaldamise ja muutmise
RPC-d, staatuse/õiguste kontrollid ning avalikud lugejad. Kontrolli, kas
ajaloolised tähtajaväljad või varasem aastane loogika on tegelikus baasis
olemas. Määra olemasolevate teenuste üleminek nende andmete põhjal;
ära tuleta teenuse vanust rubriigisalvestusest ega väljasta oletuslikke kuupäevi.
Olemasolevat sisu ei kustutata ega muudeta üllatuslikult tagantjärele aegunuks.

## Üks läbiv leping

- Server/andmebaas arvutab ja kontrollib tähtaega. Kliendi kell ei anna õigust
  aegunud teenust avalikustada või pikendada.
- Minu alas on arusaadav kehtivuse lõpp ja aegunud olek ning eraldi
  pikendustoiming, mis kinnitab, et andmed on ajakohased.
- Tavaline tekstimuutus, rubriigisalvestus, piltide muutmine ega staatuse
  lülitamine ei pikenda tähtaega automaatselt.
- Pikendamine ei muuda algset loomise/avaldamise aega ega anna kunstlikku
  uut kohta otsingus. Peatatud või suletud teenus ei aktiveeru märkamatult.
- Avalik loend, profiil, detaili avaliku pakkumise osa, rubriigifilter ja
  koguarv kasutavad sama kehtivusreeglit enne lehekülje piiramist.
  Aegunud teenus ei hoia tühja avalikku rubriiki nähtavana.
- Omaniku õiguskontroll järgib aktiivse identiteedi omanikku või õigustatud
  aktiivset äriliiget. Üks services UUID jääb autoriteetseks allikaks.
- English/Eesti sõned kasutavad olemasolevat tõlkeallikat. Tavaline teenuse
  osalemine ja pikendamine ei sõltu Energy ostust.

## Väike teostus ja vastuvõtt

Valmista üks kontrollitav muudatus koos olemasolevate teenuste selge
üleminekuga. Vajalikud sihitud kontrollid peavad katma kehtivuse piiri,
omaniku pikendamist ning avaliku nähtavuse kooskõla; lõpetatud laiu kontrolle
ei korrata. Seejärel build, muutunud kasutustee brauseris, dokumentide jätk,
uus pakett, tegelik Maci/SQL/commit/push/Verceli tõend ja üks kasutajakatse.

Vaataja ajutine pakkuja peitmine ja profiilist algavad töökuulutused on
eraldi järgnevad moodulid. Nende otsused ning jätkuvad avamise piirid on
`../architecture/public-discovery-controls-v1.md`-s.
