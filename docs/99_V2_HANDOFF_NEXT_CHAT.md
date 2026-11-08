<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-08 Europe/Tallinn

## Praegune checkpoint

Kasutaja kinnitas galerii noolte 3-sekundilise peitumise/tagasituleku tavavaates ja suurendatud pildil ning sama hobuse muutmise ilma faktiliste väidete uue kinnitamiseta. Uus vahetu muutmise parandus on kohalikult kontrollitud: Minu ala → Muuda avab pärast andmete kontrollimist muudetava vormi ja pärast Salvesta muudatused saab samas vormis jätkata. Muuda uuesti ei ole enam eeltingimus. Uue paketi Maci paigaldus, Verceli Ready ja üks kasutustee kontroll on ootel.

## Lähtekood ja tõendi piir

- **Alus:** Täpselt säilitatud eelmise hobuse viimistluse lähtekood: 1252 faili, manifest b80936a4e43c7fe195b0c0fd3061bfdf479dd2a6548211e75bb8a3cce12f1c7f. Kasutaja kinnitas selle käitumise. Uuendaja loeb Maci privaatse eduraporti ning kontrollib sõltumatult tegelikku commit’i, kogu lähtepuud, pealkirja, ulatust ja eelnevat paigaldusahelat. Ekraanipilt üksi ei asenda Giti kontrolli.
- **Põhjus:** Muuda avamisel taastati brauseris säilinud lõpetatud salvestamise päevik ja avaldatud tulemuse olek lukustas vormi. Senine Muuda uuesti kustutas alles kasutaja klõpsu järel selle kinnitatud lõpetatud toimingu kohaliku kirje.
- **Vahetu muutmine:** Omaniku muutmisvaade võtab esmalt kasutusele kontrollitud sisu, galerii, kinnituse ja sama revisjoni, seejärel lõpetab täpselt selle terminalse toimingu automaatselt. Väljad avanevad pärast laadimist ning pärast edukat salvestamist saab samas vormis edasi muuta. Järgmine salvestus kasutab uut toiminguvõtit ja värsket revisjoni.
- **Pooleliolev töö:** Teadmata või poolelioleva salvestuse päevik ja taastamise toimingud säilivad. Teise vahekaardi uuem toiming ei kao automaatsel lõpetamisel. Teises vahekaardis lõpetatud salvestus ei kirjuta üle kohalikku salvestamata teksti ega omista sellele uut revisjoni; kasutaja saab teate salvestatud versiooni laadimiseks.
- **Kinnitused ja elutsükkel:** Kasutaja vastu võetud algse faktilise kinnituse kasutamine, kehtivate tingimuste eraldi nõustumine, 90-päevane uuendamine, staatuse säilimine muutmisel ning galerii käitumine jäävad seniseks. Hobune säilitab kanoonilise horse_offers UUID.
- **Tarne:** Uus pakett on ainult lähtekoodi parandus. Andmebaasi, Storage’i ega Verceli seadistusi ei muudeta. Eelmised väljastatud ZIP-id, rakendatud SQL-failid ja paigalduspäevikud säilivad; uus uuendaja kontrollib aluse ja teeb piiratud failimuudatuse, kooste, commiti ning tavalise push’i.

## Tegelik kohalik katse

- Kolm sihitud kliendisarja (vahetu muutmine, avaldamisseanss ja salvestatud kinnitused) läbisid 90/90 juhtu, 0 viga/vahelejätmist/tühistamist. Sõltumatu ülevaataja käivitas varasema 88-juhulise sarja ja vaatas üle kaks hiljem lisatud EN/ET renderdusjuhtu; rakenduskood nende vahel ei muutunud. Seitse uut integreeritud juhtu kasutavad tegelikku editori, hooki ja seanssi sünteetilise Reacti elutsükli ning Storage/HTTP/Web Locks piiridega.
- Kuus sõltumatut seansikatset kinnitasid poolelioleva salvestuse lukustuse, terminalse tulemuse ja operatsiooni lõpetaja võistluse, järgmise salvestuse uue võtme/revisjoni, teise vahekaardi eemaldatud või uuema päeviku, identiteedivahetuse ning teadmata salvestuse säilimise. Sõltumatu lähteülevaatus ei leidnud blokeerivat puudust.
- Next.js tootmiskooste koos TypeScriptiga PASS 28,983 s sünteetiliste võtmetega. Kõigi 535 rakenduse lähtefaili räsid püsisid koostamise ajal ja järelkontrollis samad. Sihitud lint-võrdluses uusi vigu ei lisandunud; kaks alusversiooni Reacti lint-viga säilivad ning varasem üks sõltuvushoiatuse juht eemaldus.
- Lähtekoodi uuendaja 33/33 kontrolli PASS päris ajutise Giti, kolme eelneva privaatse raporti ja kohalike remote’idega. SQL-i ega Storage’i toiminguid pole. Täpse valmis paketi koostatud paigalduskäik, ZIP-i liikmed ja räsid kontrollitakse pärast lähtepuu sulgemist ning tulemus lisatakse eraldi tarnearuandesse.
- Kohalikud katsed ei kasuta päris kontot, live-andmebaasi ega native-brauserit. Need ei asenda Maci rakendamist, GitHubi push’i, uue commit’i Verceli Ready tulemust ega üht viimast kasutajakatset. Juba vastu võetud galerii ja SQL-i muutmata sarju ei korratud.

## Production / kasutajaliides

- Kasutaja kinnitas ekraanipiltide ja kirjeldusega galerii noolte peitumise/tagasituleku mõlemas vaates ja sama hobuse muutmise ilma uue faktilise kinnituseta. Varem kinnitatud galerii, Minu ala pisipilt, pildilingid, peatamine/muutmine/aktiveerimine ja eraldi 90-päevane uuendamine jäävad vastu võetuks.
- Uus vahetu muutmise parandus on kohalik kandidaat. Selle Maci build/push, uue commit’i Verceli Ready ja üks muutmise/salvestamise kasutuskatse on ootel. Arenduse ajal ei tehtud live-andmebaasi, Storage’i ega deployment’i toiminguid.
- English/Eesti, Frankfurt fra1 ja varasem üks 9-sekundiline fotolisamise kasutajamõõt säilivad varasema tõendina.

## Üks järgmine töö

Paki selqiro-hobuse-muutmine-20261108.zip Downloads-kaustas lahti ja järgi HOSTED_PORTAL.md ühte käsku. Oota sama commit’i Ready/Production tulemust ning kontrolli ainult Minu ala → Muuda → kohe teksti muutmine → Salvesta muudatused ja järgmise muudatuse tegemine ilma Muuda uuesti nuputa. Seejärel jätka teenuste Avalda ja Minu ala Muuda/Salvesta vooga ilma kohustusliku eraldi mustandita; töökuulutused hiljem.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus paigalduskäsk ja üks vahetu muutmise/salvestamise kasutustee.
- docs/architecture/horse-direct-edit-v1.md — lõpetatud toimingu automaatne lõpetamine pärast vormi ja revisjoni laadimist ning salvestamata töö säilimine.
- docs/architecture/horse-confirmation-reuse-v1.md ja horse-owner-lifecycle-v1.md — juba vastu võetud kinnituste ja 90-päevase halduse lepingud.
- docs/architecture/shared-marketplace-foundation.md ja docs/known-issues.md — teenused järgmisena ja säilivad piirid.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Staatus ei uuenda tähtaega. 90 päeva pikendamine on eraldi omaniku kinnitus; teise identiteedi või aegunud revisjoni käsk ei tohi tulemust muuta.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse, kolm avatud ja 20 uut toimingut/24 h eraldi olemasolevad kasutuselevõtukaitsed.
- Üldine terminalne taustakoristus jääb eraldi tööks. Parandus ei kustuta kuulutusi, pilte, nõusolekuid ega paigalduspäevikuid. Ainult sama brauseritoimingu kinnitatud lõpetatud kirje vabastatakse pärast täpset kontrolli. Varasemad väljastatud pakid ja rakendatud SQL säilivad.
- Teenuste sisestamine ja muutmine järgib sama Avalda ning Minu ala Muuda/Salvesta voogu ilma kohustusliku eraldi mustandita. Teenuse eriväljad säilivad; töökuulutused hiljem.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Selle paranduse jaoks ei tehta uut SQL-i ega live-andmebaasi toiminguid.
- Node/Sharp piirkond fra1 säilib; sõltuvusi ega teenusepiirkonda ei muudeta. Kohalik kooste ei asenda Maci build/push, Verceli Ready ega kasutaja vastuvõttu.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
