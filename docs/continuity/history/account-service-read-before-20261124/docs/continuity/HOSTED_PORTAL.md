# Selqiro — praeguse portaali jätkamine

Seis: 24.11.2026 Europe/Tallinn. **0cb3484 on vastu võetud.**

Avaliku profiili kuulutuste ja poerubriikide konto kättesaadavuse kontroll on
Maci raporti, sama commit’i Ready / Production pildi ja kasutaja kinnituse
„testimisel kõik töötab” järgi vastu võetud.

## Praegu pole vaja käsku käivitada

Lõpetatud selqiro-profiili-kuulutuste-konto-olek-20261124 paketti ei korrata.
See dokument kuulub vastuvõtu üleandmisse, paigaldajat siin ei ole.

Järgmine üks töö on teenuste avaliku lugemise konto kontroll. Lähtekoodiaudit ja
kavand on docs/architecture/account-service-read-next-20261124.md-s.
Uut teenuste koodi, SQL rakendust ega Maci paketti pole veel koostatud.

Vastuvõtu tõendid on docs/architecture/account-profile-marketplace-read-accepted-20261124.md-s.
Praegune autoriteetne seis on docs/continuity/CURRENT_STATE.json ning loetav
üleandmine genereeritakse sellest. Siinseid uusi dokumente ei ole pärast
0cb3484 Maci/Giti kirjutatud. Need kaasatakse järgmise sisulise koodipaketiga.

Enne uut kirjutust kontrollib uus uuendaja tegelikku haru, HEAD-i, tööpuud,
indeksit, allikaid, kinnitatud remote’i, originaalraportit ja täpset SQL eelseisu.
Olemasolevad kontod, sisu ja päevikud säilivad. Konto sulgemine, taastamine ning
kustutamine pole veel kasutusele võetud. E-posti ja DNS-i seadistus jääb varem
kokkulepitud põhidomeeni kasutuselevõtu juurde.
