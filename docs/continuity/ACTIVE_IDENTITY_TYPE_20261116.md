# Aktiivse identiteedi tüüp — 16.11.2026

## Vastu võetud tööpakkumiste kasutuselevõtt

Kasutaja tegelik jooks 14:36:52–14:37:51 Europe/Tallinn lõpetas 12ff2bb111944c463a6c1797cc3cbf35046de6e1
commit’i ja push’i. Raport on 283459 baiti, SHA256
ed91af6c909b5e13e023219fe155f9f6bddf9c12c372e7108b88a08eafdf76c1.
Jobs capability oli alguses absent ja ühe acknowledged apply järel applied;
eraldi verify kinnitas sama lõppseisu kell 14:37:37. Kõik seitse guard’i ja neli
tegeliku keskkonna invarianti jäid sobivaks. database_last_read on ajalooline
preflight, lõppseis tuleb database_after väljast. Storage’i toiminguid polnud.

Maci sihtkontroll ja build väljusid koodiga 0. Raport sisaldab logide suurust
ja räsi; algsed logid jäid Maci ja neid ei nimetata siin uuesti loetuks.
Täpsed 117 eelversiooni ning 1776 algse indexi kirjet vastavad välja antud
pakile. Tuletatud 1863-faililine Git-puu on
254f6b3bf53b3767519218fa33ad2a0b733d127a. See on raporti ja pakiga seotud
allikapilt, mitte uus live-Maci eksport.

Kasutaja 14.39.09 pilt kinnitab 12ff2bb Ready / Production staatust.
14.45.29 pilt näitab Minu ala värvinuppe; 14.45.48 pilt näitab tühja
tööotsingut. Need on konkreetsete vaadete tõendid, mitte töö avaldamise,
jagamise või sõnumite täielik kasutuskatse.

## Vana lugeja konkreetne viga

Baseline’i get_my_active_identity_profile tagastab identity_profiles rea
id ja identity_id ning avalikud nime/pildi väljad. Selle vastuses pole type
ega identity_type välja. Vana getActiveIdentity normaliseerija muutis
puuduva tüübi private väärtuseks ja tagastas tulemuse enne getMyIdentities
fallback’i. See selgitab eksliku Eraisik sildi võimalust ning paneb uue
job-editori business-värava vormi sulgema.

Kuvatav nimi ei tõenda tegelikku tüüpi. Taivo Garaaži identity.type väärtust
ei loetud selle ülevaatuse käigus. Puudus on lähtekoodi ja RPC skeemi
vastuolu, mida eraldi sünteetiline test taastoodab vana koodi peal.

## Paranduse leping

Ühine entities-kihi lugeja seob profiles.active_identity_id täpselt kasutaja
get_my_identities lubatud reaga. Type pärineb sellest reast. Puuduv või
tundmatu tüüp pole eraisiku tõend. Puuduvat active rida ei asendata esimese
identiteedi, sünteetilise fallback-private ega e-posti põhjal loodud nimega.
Profiili avalikud väljad võivad täiendada ainult sama identity_id tulemust.
Profiilirea id ei ole identiteedi id.

Oodatud konto kinnitatakse enne lugemist ja tulemuse tagastamist; aktiivne
ID peab üle päringute samaks jääma. Hilinenud või vale konto tulemus ei tohi
muutuda teise identiteedi vormi aluseks. Job-editori olemasolevad actor,
generation, signaal ja täpse ID kontrollid säilivad. Brauseri tüüp on
kasutajaliidese abiteave; serveri business/membership kontroll jääb
tegevuste autoriteediks.

## Kontrollid ja järgmine tegevus

Uue lugeja 17 sihtkontrolli ja täielik build läbisid. Tõendid seovad
täpsed muudetud allikad; Auth/RPC transport on sünteetiline. Brauseriseis on
BLOCKED; üksikasjad on paki kontrollid/browser-result.json-is.
Uus source-only uuendaja kontrollib 12ff2bb alust ja eelmist privaatset
originaalraportit ning ei käivita SQL-i, Supabase CLI-d ega Storage’it.

Parandust pole selle ettevalmistusega Macis rakendatud, commit’itud,
üles lükatud ega Vercelis avaldatud. Järgmine tegevus on HOSTED_PORTAL.md
üks uus käsk ja selle raport; siis sama uue commit’i Ready / Production
ning tööpakkumise vormi ja esimese avaldamise kasutustee.
