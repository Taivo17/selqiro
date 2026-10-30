# Telefoni sõnumivaate parandus — 30.10.2026

## Kasutaja kinnitatud olukord

Kasutaja telefoni pildid näitavad uuendatud V2 vestlust päris Selqiro portaalis.
Tekstivestlus ja kuulutusekaart töötavad, saatja identiteet on kirjutusribal.
Kuulutusekaardiga kirjutamisel jäi sisestusväli klaviatuuri varju. Pildigaleriist
foto valimine ei lisanud seda sõnumi mustandisse. Need on selle paranduse kaks
põhiülesannet. Täpset viimase sõnumipaigalduse commit’i ei ole piltidest võimalik
järeldada ning uus parandaja ei oleta seda.

## Muutused

Telefonis muutub kuulutusekaardi eelvaade kirjutamise ajaks kompaktseks. Nähtava
vaate kõrgust ja brauseri nihet kasutatakse eraldi; brauseri kerimine ei saa
vestluse kõrgust suurendada. Klaviatuuri ajal on vestluse päis, saatja nimi/logo,
kirjutamisväli ja saatmisnupp samas nähtavas alas. Manuste eelvaade on piiratud
kõrgusega ja keritav. Klaviatuuri sulgemisel taastub tavapaigutus; suurendatud
vaade jääb brauseri kontrollida.

Foto lisamise alustamisel jäetakse meelde kinnitatud kasutaja ja identiteet.
Fail võetakse valiku sündmusest kohe üle. Kui brauser samal ajal saatjat uuesti
kontrollib, jääb fail kohalikult ootele. Üleslaadimine algab alles sama kasutaja
ja identiteedi uue kinnituse järel. Päris identiteedi- või kontovahetus katkestab
pooleli valiku. Saatja kontrolli ajal kuvatakse neutraalne olekuteade; varasema
identiteedi foto eelvaadet ei näidata teisele identiteedile.

Tühi või üldine telefoni failitüübi metadata ei põhjusta enam üksi keeldumist:
toetatud JPEG/PNG/WebP sisu kontrollitakse päise ning päris pildidekodeerimisega.
Olemasolevad suuruse ja mõõtmete piirid ning serveri eraldi kontroll jäävad
kehtima. Sobimatu, liiga suure või loetamatu faili korral on põhjus nähtav.
Katkenud üleslaadimise kordus säilitab sama faili ja muutumatu päringuvõtme.

## Paranduse piir

Muudetakse kliendi koostajat, foto ettevalmistust, valiku olekut ja nähtava
vaate käsitlemist. `useConversationActor` ning HTTP-, SQL- ja Storage’i
kontrollid jäävad samaks. See pakett ei loo bucket’it, ei käivita migratsiooni,
ei muuda andmebaasi õigusi ega kustuta sõnumeid või fotosid. Varasemaid
andmebaasi-/kaardi-/kontaktiuuendajaid telefoniparanduseks ei korrata.

## Paigaldamine Macis

Paki `selqiro-sonumid-telefon-20261030.zip` Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-sonumid-telefon-20261030/uuenda.py" --publish
```

Käsk kasutab olemasolevat `/Users/taivo/selqiro` hoidlat sõltumata sellest,
millises kaustas Terminal parajasti asub. Enne kirjutamist peavad lähtfailide
ja sõltuvuste täpsed räsi-kontrollid sobima, main olema puhas ning origin/main
olema sama commit. Teadaolev kaardipaigalduse commit
`cbd475757690db7bd1faf8784cd43359f45d5be9` peab olema eellane; hilisema tegeliku
sõnumipaigalduse HEAD salvestatakse uue paranduse päevikusse.

Parandaja varundab asendatavad failid, rakendab ainult manifestis nimetatud
muudatused, käivitab build’i, koostab piiratud commit’i ja teeb tavalise pushi.
Commit’i pealkiri: `Fix mobile conversation keyboard and photo selection`.

Päevik: `~/Library/Application Support/Selqiro/messages-mobile-20261030/<release-id>/result.json`.
Sama käsk jätkab kontrollitud oma katkestusest; võõraid faile ei kirjutata üle.
`PEATATUD` korral saadetakse täpne peatumise põhjus ja see raport. Vanu päevikuid
säilitatakse. `VALMIS` järel oodatakse uue commit’i Verceli **Ready** olekut.

## Kontrolli tähendus

Tarne `review/verification.json` seob lõplikud kontrollid täpsete lähteräsidega.
Kasutatakse rakenduse tegelikke Reacti komponente ja foto ettevalmistust ning
sünteetilisi autentimise/HTTP vastuseid. Klaviatuuri olukordi kontrollitakse
nähtava vaate kõrguse, nihke ja lehe kerimise kaudu. Päris Androidi/iPhone’i
klaviatuuri ega kasutaja kontoga pildisaatmist siin ei käivitata. Maci paigaldus
ja uus Verceli deployment vajavad kasutaja käsu tulemust.

Pärast Ready tulemust kontrollitakse telefonis: kuulutusekaart + pikem tekst;
foto valimine ja eelvaade; foto koos tekstiga; kaardi ja foto kooskasutus;
klaviatuuri sulgemine/uuesti avamine. Kontrollsõnumid saadab kasutaja ise.

## Lõplik kohalik kontroll

- `npm run build -- --webpack`: PASS, koos TypeScripti kontrolliga.
- Kuue muudetud TS/TSX faili ESLint: PASS, null hoiatust.
- Sõnumi/foto/identiteedivahetuse lepingukatsed: 31/31 PASS.
- Fotovaliku brauseriolukorrad: 17/17 PASS. Algne faili kadumine kordus vana
  hook'iga; uus hook läbis mõlemad focus/change järjekorrad ning katkestuse,
  sama faili uuesti valimise, identiteedivahetuse ja muutumatu korduskatse.
- Telefoni/desktopi vaade: 6 kontrollrühma PASS, 21 geomeetriavaatlust ja
  4 sünteetilist saatmist. Kaetud on 320/360/390 px laius, klaviatuuri kohal
  240 px kõrgus, nihutatud nähtav ala, keritud dokument ning kaart+foto+5 rida.
- Paigaldaja: 22/22 PASS. Tegelikud ajutised Git-hoidlad ja kohalik bare-remote;
  ainult build asendatud. Kaetud on jätkamine, lähte- ja remote-erinevus,
  kasutaja töö säilitamine, varukoopiad ning kadunud commit/push vastus.

Paketi lähteosa on seitse kliendikoodi faili ja viis järjepidevuse dokumenti.
73 muutmata lähte-/sõltuvusfaili kontrollivad sobivust olemasoleva versiooniga.
Kogu manifesti sisu ning buildi ja brauserikatsete lõplikud lähteräsid
kontrollitakse enne ZIP-i väljastamist.

## Brauseri käitumise alus

- [Chrome: nähtava vaate muutumine ekraaniklaviatuuri avamisel](https://developer.chrome.com/blog/viewport-resize-behavior)
- [VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [Failivalija cancel-sündmus](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/cancel_event)
