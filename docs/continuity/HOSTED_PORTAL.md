# Praegune samm: avalik töö, jagamine ja pakkumiste värvid

16.11.2026 Europe/Tallinn. Viimane vastu võetud Maci/Giti ja Ready /
Production-seis on `447d1a46a09f7fb6b907c2526e6164f0c88f2098`.
Blokeeringu eemaldamise, õiguste paranduse ja varasema seisupildi sõnastuse
vastuvõtud säilivad. Käesolev uus väljaanne on eraldi ettevalmistatud muudatus.

## Üks järgmine käsk

Paki `selqiro-too-ja-jagamine-20261116.zip` Downloads-kausta lahti. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-ja-jagamine-20261116/uuenda.py" --publish
```

Uuendaja kontrollib enne kirjutusi olemasoleva `/Users/taivo/selqiro` projekti
tegelikku main-haru, täpset 447d1a4 alust, kogu indexit, tööpuud, lähtefaile,
kinnitatud GitHubi remote'i ja eelmise eduka jooksu privaatset originaalpäevikut.
Kontroll hõlmab kõiki 1776 alusfaili. Muutunud alust või kasutaja lisatud
muudatusi ei kirjutata üle. Eelmist päevikut hoitakse lugemisluku all ja
säilitatakse baiditäpselt. Vana paigaldaja käivitamine pole selle sammu osa.

Uus pakett rakendab täpse faililoendi, kasutab Maci olemasolevaid lukustatud
sõltuvusi, käivitab uue kliendi sihtkontrollid ja build'i. Seejärel kontrollib
ta olemasoleva Supabase'i projekti ja andmebaasilepingut, teeb ühe lisava
SQL-tehingu ning loeb sõltumatult selle tulemust. Alles kinnitatud tulemuse
järel tehakse uue allika täpse ulatusega commit ja push.

SQL lisab tööpakkumiste ning nende sõnumikonteksti toe. Olemasolevaid teenuseid,
kuulutusi, fotosid, sõnumeid või ajalugu ei kustutata. Auth-skeemi hallatud
õigusi ei jagata ümber. Sõltuvusi ei paigaldata, teenuseid uuesti ei ühendata
ning Storage'i toiminguid pole. Töö avalik otsing on algusest sisse lülitatud.

## Kui töö katkeb

Sama väljaande jätk kasutab sama käsku ja sama eraldi päevikut. Juba läbitud
sihtkontrolle, build'i, commit'i või push'i kontrollitakse tegeliku seisuga
ning lõpetatud etappe ei korrata.

Kadunud SQL-vastusele järgneb ainult sõltumatu lugemine. Kui täpselt sama
paigaldus on kinnitatult rakendunud, saab lõpetamist jätkata. Kui varem
alustatud kirjutuse tulemus on endiselt puudu või ebaselge, peatab uuendaja
automaatse jätku. Sellisel juhul saada raport; ära nulli päevikut ega käivita
vana SQL-i käsitsi. Eelnev rakendus ja kõik raportid peavad säilima.

## Saada selle jooksu täpne raport

Terminal näitab ja Finder valib selle jooksu faili:

```text
SAADA SEE FAIL: <selle jooksu absoluutne JSON-tee>
```

Saada just see unikaalne privaatne Downloads-koopia. Kui kopeerimine ei
õnnestu, näidatakse kontrollitud originaali. Kui Finder ei avane, on täpne
tee terminalis. Kui raportit ei loodud, saada `PEATATUD`-rida. Võimalikult
aegunuks märgitud raportiga saada ka peatumisrida. Varasemaid päevikuid ja
raporteid ei kustutata ega asendata.

## Pärast edukat jooksu

Kontrolli Vercelis raportis nimetatud **sama uue commit'i Ready / Production**
tulemust ja värskenda portaali. Uuendaja ei nimeta build'i, Git push'i ega
avalikku veebilehte iseseisvalt Verceli deployment'i kviitungiks.

Tee üks uus tegelik kasutustee olemasolevate kontodega:

1. Vali aktiivne ettevõtte identiteet ja ava Minu ala tööpakkumised. Lisa oma
   tegelikku eesmärki kirjeldav tööpakkumine; kontrolli ametinimetust,
   asukohta, tööviisi ning vajadusel tasuvahemikku. Avaldamine on üks selge
   tegevus koos avaldamistingimustega.
2. Kontrolli sama pakkumist ettevõtte profiilis, avalikus Töö otsingus ja
   selle detailvaates. Filtriga otsingust detaili minnes ning brauseri
   Tagasi nupuga naastes peavad otsing ja filtrid säilima.
3. Vajuta Jaga. Toetatud seadmel avaneb jagamisvalik; mujal saab lingi
   kopeerida või käsitsi valida. Ava puhas link väljalogitud aknas. Sama
   Jaga tegevus peab olema olemas tavakuulutusel ja teenusel. Postitamist
   sotsiaalmeediasse ei nõuta; lingi kopeerimine ei avalda ise postitust.
4. Ava töö teise olemasoleva kontoga ja vali kontakt. Vestluses peab olema
   sinine tööpakkumise kontekst koos nimetusega. Enda ja teise poole
   sõnumite paigutus jääb tuttavaks. Kontaktinupp ise sõnumit ei saada.
5. Muuda või peata enda pakkumine ning kontrolli uuendatud tulemust.
   Peatatud pakkumine peab avalikust otsingust kaduma, kuid jääma omanikule
   ja varasemasse vestlusajalukku. Pikendamine annab ühe kalendrikuu
   kehtivuse serveri reegli järgi; see ei avalda peatatud pakkumist ega
   tõsta vana pakkumist kunstlikult otsingu ette.

Tõrke korral saada täpne teade ja selle sammu pilt. Juba vastu võetud
blokeeringu, teenuste ja kuulutuste laiu katseid ei korrata.

## Tõendi piir

Ettevalmistuskeskkonna sihtkontrollide, SQL-kontrollide, build'i ja pakendi
seosed on `JOBS_PUBLIC_20261116.md`-s ning paki `kontrollid/` all. Kohalik
SQL-katse ei tõenda hosted andmebaasi muudatust. Reacti renderdamise katse
ei asenda pärisbrauseri kasutust. Sotsiaalse eelvaate metaandmed ei tõenda
Facebooki või mõne teise teenuse tegelikku eelvaadet; seda saab kontrollida
pärast uue veebiversiooni avaldamist avaliku lingiga.

Üks autoriteetne seis on `CURRENT_STATE.json`; sellest genereeritakse
`docs/99_V2_HANDOFF_NEXT_CHAT.md`. Arhitektuuri leping on
`docs/architecture/jobs-public-v1.md`. Varasema kuupäevaga juhendid ja
profiilipõhise alguse plaan on ajalugu, mitte tänased käivitamiskäsud.
