# Kontomudeli täpsustus — paigalduskäsku pole

22.11.2026. Vastu võetud avaldatud alus säilib `034211d`.

Üks praegune tööjärg on CURRENT_STATE.json; loetav üleandmine genereeritakse
sellest. Konto sulgemine lähtub uuest lihtsast mudelist: üks konto ja üks
valitud eraisiku või ettevõtte profiil. Ettevõtte liikmete/omanike haldus
ning mitme identiteedi üldine mõju eelvaade ei ole esimese mooduli töö.

21.11 e-posti ettevalmistus on taastatud ja võrreldud praeguse allikaga.
See jääb paigaldamata. SMTP ja uue sisselogimislahenduse kasutuselevõtt
jätkuvad kokkulepitud domeenietapis enne väliseid kasutajaid.

Järgmine arendustöö valmistab ette konto/profiili loomise ja elutsükli
jaoks vajaliku kitsa ainult metaandmeid lugeva kontrolli. Täpne piir on
docs/architecture/account-model-lifecycle-20261122.md-s.

See pakk sisaldab dokumentide kumulatiivset deltat, mitte käivitatavat
paigaldajat. Kasutaja Maci kirjutust, uut commit/push'i, SQL-i ega avaldamist
pole tehtud. Dokumentide muudatused lähevad järgmise sisulise muudatusega
kaasa pärast värsket Git/lähtefailide/remote'i kontrolli. Varasemaid pakke,
raporteid ja päevikuid ei muudeta ega käivitata uuesti.
