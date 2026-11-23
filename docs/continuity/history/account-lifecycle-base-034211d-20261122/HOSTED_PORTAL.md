# Tööloendi lugemisluku parandus on vastu võetud

22.11.2026. Commit `034211d` on Maci eduka raporti järgi push’itud ning sama
versioon on kasutaja Verceli pildil Ready / Production. Kasutaja kinnitas
tööloendi avanemist eraisiku ja ettevõtte profiiliga.

Selle paranduse uut käivitamiskäsku ei ole. Lõpetatud uuendaja ja SQL jäävad
ajalooks; algsed raportid, päevikud ning väljastatud pakett säilivad muutmata.

Üks praegune seis on `CURRENT_STATE.json` ning sellest genereeritud üleandmine.
Järgmine soovitatud töö on konto sulgemise ja taastamise andmeseoste lugemisaudit
ning piiratud serverilepingu kavand. Olemasolevate kontode või sisu kustutamine
ei kuulu selle auditi volitusse.

Selle vastuvõtu dokumentide delta on ette valmistatud väljaspool kasutaja Maci.
See tuleb järgmise sisulise lähtekoodimuudatusega kaasa võtta pärast värsket
Maci/Giti kontrolli; eraldi dokumentide paigaldajat ega lisabuild’i ei küsita.
