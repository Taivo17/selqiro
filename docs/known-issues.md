# Teadaolevad käsilolevad tööd

Seis: 07.11.2026 Europe/Tallinn. Praegune tööjärg on
`continuity/CURRENT_STATE.json`-is; see ei ole teine NEXT-allikas.

## Foto lisamine ja kuvamine — kasutaja kinnitatud

Kümne foto piir, lisamine, avalik nähtavus, põhipilt ning varasem eemaldamine
ja koristus on kasutaja katsetega kinnitatud. Viimane vastuvõetud commit on
`785c359`, `Load the added photo while confirming gallery membership`.
Kasutaja ühe viimase lisamise stopperiaeg oli 9 s; see pole püsiva keskmise
lubadus. Varasem viie foto takistus ja kuvamise paranduse paigaldus ei ole
praegused lahtised tööd. Frankfurdi `fra1` seadistus on vastu võetud.

## EN/ET liides — lokaalselt valmis, paigaldus ja konto salvestuse katse ootel

Üks `profiles.language` eelistus; inglise põhikeel/fallback ja eesti teine keel.
Olemasolevad V2 vormid ning avalikud/omaniku vaated on lokaliseeritud. Ühine
kooste ja sihitud testid läbisid. Poolelioleva fotolisamise keelevahetus
säilitas sama toimingu ja pildisõlme päris Chromiumi sünteetilises katses.
Maci/Ready tulemus ja päris konto keele püsivus kinnitatakse pärast uut paketti.
Vt `architecture/interface-language-v1.md`.

### Sisu ja õigusdokumendi keel

Kasutaja sisestatud sisu ei tõlgita. Olemasolev ordinary publication metadata
`language: et` ja kinnitatav `marketplace-general` poliitika `locale: et-EE`
on säilinud serverileping. Ingliskeelne liides selgitab eestikeelset originaali.
Ingliskeelse poliitikaversiooni ning sisu tegeliku keelemärgistuse laiendamine
vajab eraldi autoriteetset lepingut; seda ei kuulutata selle paketiga valmis.

## Hobused ja teenused — ühendamine järgmisena

Hobustel on päris privaatne mustand ning revisjoniga muutmine; fotode valik
loomisel on eelvaade ja muutmise pildid on lugemiseks. Täielik avaldamine,
hallatud fotod, avalik detail/otsing ja kontakt pole veel ühendatud.

Teenuste omaniku haldus ja avaliku profiili lugemine on olemas.
`/v2/services` näitab endiselt näidisandmeid ja `/v2/service/[id]` on omaniku
vaade. Päris otsing/detail/kontakt ning revisjonide ja hallatud meedia ühtlustus
on tegemata. Tööjärjekord: hobused, teenused, väike saadavuse/asukoha mudel.
Vt `architecture/shared-marketplace-foundation.md` täpset lähtekoodi auditit.

## Üldine koristus enne avalikku avamist

Katkestatud/aegunud üleslaadimiste ja terve kuulutuse terminalse hosted
koristuse kõik juhud on eraldi lõpetamata töö. Eduka lisamise üks
vastusejärgne SOURCE-samm ei ole püsiv taustatööde teenus ega tühjenda
korraga kogu konto järjekorda. Tehniliste testpaneelide eemaldamine peab
käima koos täieliku taustal lõpetamisega.

## Diagnostika ajatemplite ühilduvus — lahendatud

Parandatud r2 koguja lõpetas 07.11 kell 13:29 Python 3.9.6 all edukalt.
Maci lähtepuu ja index säilisid. Toonane 277 MiB reserv jääb ajalooliseks
vaatluseks. Esimene peatatud raport ja vanad paketid säilivad ajaloona;
vt `continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md`.
