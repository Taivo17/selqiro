# Konto oleku etapp on vastu võetud

23.11.2026 Europe/Tallinn. Autoriteetne tööjärg on CURRENT_STATE.json-s.

Commit `4b607828d0b153b84166ba963fdb4e77337e11f0` on Maci raporti järgi
pushitud. Kontooleku SQL rakendus ühe korra ning eraldi verify kinnitas tulemuse.
Kasutaja pildid kinnitavad sama commit’i Ready / Production tulemust ja avatud
Minu konto vaadet aktiivse oleku ning konto algse loomiskuupäevaga.

## Praegu ei ole uut paigalduskäsku

Kontooleku algset uuendajat, esimest jätku, r2 jätku ega SQL apply’t ei korrata.
Kõik paketid, originaalraportid, indeks ja päevikud säilivad. Ka varasemad
STOP-tulemused jäävad oma tegeliku ajaloolise tähendusega alles.

Käesolev vastuvõtu dokumentatsioon on 4b60782-järgne ettevalmistus; selle jaoks
pole kasutaja Maci kirjutust, uut commit’i või push’i tehtud. Dokumendid tulevad
kaasa järgmise sisulise muudatusega. Neid ei pea käsitsi hoidlasse kopeerima.

## Üks järgmine arendustöö

Kanooniline avalik profiilikaart ja selle meediaprojektsioon peavad arvestama
sama konto olekuga. Esimene väike serverimuudatus lisab privaatse
`account_is_available(uuid)` kontrolli ning kasutab seda `get_store_by_slug`
lõppfiltris. Kanooniline kandidaat valitakse enne konto sobivust; peidetud
kanoonilise profiili asemel ei tohi avaneda teise konto legacy-alias.
`get_public_profile_media_v1` kasutab sama põhilugejat ja selle delegatsioon säilib.

Täpne ulatus ja sihitud katsed on dokumendis
`docs/architecture/account-public-profile-next-20261123.md`.
Selle ettevalmistamiseks on lähtekood olemas; kasutajalt pole uut diagnostikat
vaja. Järgmise uuendaja värske eelseis kinnitab vajalikud SQL definitsioonid,
õigused ja konto olekualuse enne uut kirjutust.

Konto sulgemise/taastamise/kustutamise toiminguid veel ei ole. Nende eel tuleb
katta ülejäänud avalikud lugejad, kirjutamine, sõnumid ja piltide lõppkinnitus.
SMTP ja uus registreerimine jäävad kokkulepitud selqiro.com kasutuselevõtu etappi
enne väliseid kasutajaid. Konto tervikule järgnevad esiletõstmised ja reklaamid.
