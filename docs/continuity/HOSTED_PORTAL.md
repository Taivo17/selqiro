# Teenuste tagasitee parandus

Seis: 09.11.2026 Europe/Tallinn. Üks praegune seis on CURRENT_STATE.json-is.

Kasutaja on teenuse fotode salvestamise ning uusima teenuse järjestuse Minu alas
ja profiilil vastu võtnud. Käesolev parandus taastab teenuse detailist naastes
profiili või avaliku teenuseloendi lähtekoha, filtrid ning avatud vaate.

## Üks järgmine käsk

Paki **selqiro-teenuste-tagasitee-20261109.zip** Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-teenuste-tagasitee-20261109/uuenda.py" --publish
```

Uuendaja loeb eelmise r2 täpset lõpetatud privaatset päevikut ning kontrollib
sellest leitud commit'i sõltumatult Giti parent'i, teema, täieliku puu ja
muudetud radade järgi. Seejärel kontrollitakse olemasoleva /Users/taivo/selqiro
hoidla tegelikku haru, HEAD-i, tervet indexit, lähtefaile ja kinnitatud remote'i.
Muudetavad lähtefailid varundatakse enne rakendamist. Järgnevad build ning ainult
selle paranduse commit ja tavaline push. SQL-i, Supabase CLI-d, Storage'i
toiminguid ega sõltuvuste installi selles pakis ei ole.

Eelmise r2 uus commit ja raportiräsi lahendatakse Macis tegeliku tõendi järgi;
pakki pole kirjutatud oletatud praegust commit'i. Varasemad päevikud, raportid
ja väljastatud pakid säilivad.

## Kui töö peatub

Terminal näitab **SAADA SEE FAIL:** koos just selle jooksu kontrollitud
JSON-faili täieliku asukohaga ja valib sama faili Finderis. Lisa valitud fail
vestlusse. Downloads-koopia saab unikaalse nime. Kui koopiat ei õnnestu luua,
kasutatakse kontrollitud originaali; Finderi tõrke korral on täpne asukoht
terminalis. Kui raport puudub või selle päritolu ei saa kinnitada, palub
terminal saata PEATATUD-rea. Vananenud raport märgitakse eraldi.

## Pärast edu

Oota Vercelis **terminalis näidatud sama uue commit'i Ready / Production**
tulemust ning värskenda portaali. Kontrolli muudetud kasutusteed:

1. Keri avalikul profiilil teenusteni, ava üks teenus ja vajuta brauseri
   Tagasi-noolt. Sama kaart peab jääma samasse nähtavasse kohta. Kui avasid
   enne „Vaata kõiki”, peab laiendatud teenuste vaade samuti säilima.
2. Ava teenus avaliku teenuseloendi keskelt ning tule brauseri noolega tagasi.
   Sama koht ning kasutatud otsing/filtrid peavad säilima. Kui olid vajutanud
   „Näita rohkem”, peab avatud teenus jääma leitavaks ka sellest leheosast.

Detaili nähtav tagasilink arvestab samuti lähtekohta. Otse avatud teenuse
puhul viib see avalikku teenuseloendisse. Kaartidel on lühike kirjeldus; teenuse
detailis on kogu salvestatud tekst loetav.

Varem vastu võetud fotode, järjestuse, hobuste ning tavakuulutuste kasutuskatseid
ja lõpetatud diagnostikat ei korrata selle paranduse eeltingimusena.

Üldine automaatne koristus, tehniliste testpaneelide eemaldamine tavakasutaja
vaatest ning poerubriikide puuduvad seostamise võimalused jäävad eraldi tööks.
Energy, maksete tuum ja piiratud AI järgnevad kokkulepitud V2 ulatuse sees.
