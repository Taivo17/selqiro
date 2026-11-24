> **Tootmises vastu võetud 24.11.2026.**
>
> Suhtluse konto kirjutuspiir on commit'is `8b7db90d08682b512d76e64c699af56fc8cae6a3`. Raport kinnitab ühe SQL rakendamise, eraldi järelkontrolli ja avaldamise. Kasutaja Verceli pilt näitab sama commit'i Ready / Production olekut ning kasutaja kinnitas sõnumite toimimist. Allolev ettevalmistuse kirjeldus säilib ajaloolise tõendina; selles nimetatud ootel rakendamine on tehtud.
>
> Vastuvõtt: [saatmise uuenduse kinnitus](account-contact-write-accepted-20261124.md). Praegune järgmine juhend: [HOSTED_PORTAL.md](../continuity/HOSTED_PORTAL.md).

# Suhtluse kataloog on vastu võetud ja lähtekoodiga võrreldud

24.11.2026. **Metaandmete vastuvõtt ja kõigi 20 funktsioonikeha võrdlus on lõpetatud.** Kehad on sobitatud baiditäpse `prosrc` kontrollsummaga. Kontrollitud on 15 allikafaili SHA-256/Git blob/režiim, funktsioonide seaded, ACL-i rekonstruktsioon ja efektiivsed käivitusõigused. Uue mooduli PostgreSQL 17.6 katse kinnitab ka deklaratsioonide ja täielike definitsioonide säilimist.

Praegune järgmine samm on [HOSTED_PORTAL.md](../continuity/HOSTED_PORTAL.md) juhendis. Valmis kirjutusmooduli ulatus ja tõendid on [konto kirjutuskontrolli dokumendis](account-contact-write-fence-v1.md).

## Metaandmete vastuvõtu hetke raport — ajalooline väljavõte

Allolev muutumatu raport kirjeldab kataloogi vastuvõtu hetke. Selles nimetatud `body_review=required_before_implementation` ja järgmine kehade võrdlus olid tolle etapi järeltingimused ning on nüüd täidetud. Originaalne raport säilib paketi `proof/accepted/contact-catalog/` kaustas. Uut kataloogipäringut ega täiskehade lugemist ei ole järgmise sammuna vaja.

---

# Suhtluse metaandmete raporti sõltumatu vastuvõtt

**Tulemus: PASS — parandatud kontrolli tulemus on vastu võetud piiratud, ainult lugemise metaandmete vaatlusena.**

24.11.2026 kell 18:45:35.666–18:45:39.383 (Europe/Tallinn) tehtud käivitus lõppes olekuga `complete`. Üks andmebaasipäring lõpetas koodiga 0; kõik 29 protsessi lõpetati kontrollitult. Taastasin kontrollsummade võrdlemiseks kõik 28 Giti väljundit ning täpse 193488-baidise CLI JSON-vastuse. V2 range parsija ja andmebaasis arvutatud kataloogi kontrollsumma vastavad.

Enne ja pärast päringut on sama `e336a5b9d02845c688def778babeac0f1e3fec95` commit, `7734a70aa174b25b2ce5cc85aca3c0fa4e628624` puu, 2253 lähtefaili ning sama indeks. Kontrollisin eraldi kõigi 2253 kohaliku aktsepteeritud lähtefaili SHA-256, Git blobi ja režiimi ning arvutasin neist sama puu. Varasem tööpakkumiste edukas originaalraport säilis ainult lugemiseks lukustatuna. Kogu väljastatud 108-faililine pakett, ZIP, manifest, 11 abimoodulit, päring ja parsija vastavad väljastatud kontrollsummadele.

Piiratud vaatluses on kõik 11 nõutud funktsiooni ning nende tabelite küljes olevad funktsioonid: kokku 20 funktsiooni, 9 päästikut, 19 RLS-reeglit, 3 tabelit, 33 veergu, 14 reeglisõltuvust, 189 õiguskirjet ja 248 efektiivse õiguse kirjet. Katvuse kärpimist ega puuduvat nõutud elementi ei tuvastatud.

**See tulemus ei ole veel suhtluse konto-oleku paranduse kasutuselevõtt.** `implementation_ready=false` ja `body_review=required_before_implementation` jäävad kehtima. Järgmisena tuleb sobitada funktsioonide tegelikud sisukontrollsummad, seaded ja õigused täpse lähtekoodiga. Täielik katvus kirjeldab ainult selle piiratud päringu ulatust, mitte kogu transitiivset väljakutseahelat.

Vaatlus ei muuda lähtekoodi, indeksit, andmebaasiandmeid, autentimist, SMTP-d, salvestatud faile ega konto olekut. Päring ei loe kasutajate vestlusi ega sõnumeid. `when_tree_sha256` on sisemise PostgreSQL-i avaldisepuu räsi ning selle võrdlusala on sama instants/versioon, mitte eri keskkondade semantiline võrdsus.

Ülevaatus kasutas olemasolevaid faile ja puhast parsijat; Maci käivitajat, töövoogu ega SQL-i ei käivitatud, testikomplekte ei korratud ning kaugteenuseid ei kutsutud. Kasutaja tagastatud raport koos kontrollitud koodiga on kooskõlaline tõendus, mitte serveri krüptograafiline kinnitus.
