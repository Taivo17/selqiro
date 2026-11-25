# Pakkumise teadlik lisamine vestluse sõnumile

24.11.2026. Alus: vastu võetud commit `908a45717c6c66e717ab46c2ec0aa7bb5dd44954`, puu `ed872b82a9ac67fe9f0073716492e2fb7b90b893`.

## Käitumine

Kuulutuselt, hobusekuulutuselt, teenuselt või tööpakkumiselt ühenduse võtmine valmistab selle pakkumise kaardi ette üheks järgmiseks sõnumiks. Kasutaja võib kaardi enne saatmist eemaldada. Edukas saatmine salvestab kaardi koos sõnumiga; järgmine tekst, foto või teise osapoole vastus saadetakse ilma automaatse kaardita. Sama pakkumise uuesti avamine ja sealt ühenduse võtmine võib sama kaardi uuesti kaasa saata. Varasema jagamise järgi eemaldamist ega ajalist deduplitseerimist ei tehta.

Vestluse päise pakkumine on viimase tegelikult salvestatud pakkumiskaardi nimi ja link. Üksnes teise pakkumise avamine või selle eelvaate eemaldamine päist ei muuda. Pakkumise valik on saatmise selgesõnaline sisend: teise brauserisaki muudetud ühine `thread_context` ei vali saadetavat kaarti.

## Avalikud RPC-d

| RPC | Sisend | Vastus |
| --- | --- | --- |
| `get_my_offer_message_thread_v1` | `p_expected_user_id uuid`, `p_expected_identity_id uuid`, `p_conversation_id text`, `p_before_message_id text`, `p_attachment_offer_type text`, `p_attachment_offer_id text` | Senise vestluse ümbrik skeemiga 3. Lisatud `attachment_offer_type`, `attachment_offer_id`, `attachment_offer`; vana arvuline manusepaar on eemaldatud. `listing` on viimati jagatud pakkumine. |
| `send_my_offer_message_v1` | `p_expected_user_id uuid`, `p_expected_identity_id uuid`, `p_request_key uuid`, `p_conversation_id text`, `p_message text`, `p_offer_type text`, `p_offer_id text`, `p_attachment_id uuid` | Senine skeemi 2 saatmiskviitung: sõnumi ID, taotluse võti ja `replayed`. |

Lubatud tüübid on `listing`, `horse_offer`, `service`, `job`. Tüüp ja ID on mõlemad `NULL`, kui kaarti kaasa ei lähe. `listing` nõuab positiivset kanoonilist bigint-teksti; ülejäänud tüübid nõuavad väikeste tähtedega kanoonilist nullist erinevat UUID-d. Vigane või poolik paar lükatakse tagasi. Kehtiva kujuga, kuid kättesaamatu pakkumise eelvaade on `NULL`; selle saatmine lükatakse tagasi.

Tavaline kaart säilitab kuju `{id,title,image,price}`; teistel kaartidel on lisaks `content_type`. Päise kuju on `{id,title}` või tüübiga pakkumisel `{id,title,content_type}`. Tavaliste kuulutuste ID-sid ja UUID-ga pakkumiste ID-sid ei vahetata omavahel.

## Andmebaasi muudatus

Lisatakse kolm privaatset abifunktsiooni ja kaks avalikku RPC-d. Kolme olemasoleva `capture_message_card()` triggerifunktsiooni keha asendatakse `RETURN NEW`-ga; triggerite identiteet, omanikud, õigused ja seosed säilivad. Uus saatja lisab valitud hobuse-, teenuse- või töökaardi otse vastavasse privaatsesse `message_cards` tabelisse. Tavalise kuulutuse kaart salvestatakse olemasolevatesse sõnumiväljadesse.

Saatja kontrollib tegelikku kasutajat, aktiivset identiteeti, täpset kahe osapoolega vestlust, kontode kättesaadavust, blokeeringuid, pakkumise avalikku kättesaadavust ning omaniku kasutaja **ja** identiteedi vastavust ühele vestluse osapoolele. Olemasolev privaatse ja ettevõtte tööpakkumise omaniku lahendus säilib. Pakkumine lukustatakse enne vestlust; foto lukustatakse pärast vestlust. Ajapõhine kättesaadavus kontrollitakse võimaliku vestluseluku oote järel uuesti.

Saatmine kasutab sama privaatset `send_receipts` tabelit. Räsisse kuuluvad protokolli nimi, vestlus, pakkumise tüüp ja ID, tekst ning foto ID. Sama võti ja sama sisu tagastavad sama kviitungi; sama võtme muudetud sisu või teise protokolli kasutus on konflikt. Kviitungit kontrollitakse ka pärast vestluse lukustamist. Foto sidumine, sõnum, kviitung ja pakkumiskaart salvestatakse ühe tehinguna.

Päise jaoks lisatakse neli kitsast indeksit: üks tavaliste kuulutustega sõnumitele ja üks iga privaatse kaarditabeli jaoks. Otsing võtab igast tüübist ühe viimase kandidaadi ja valib neist värskeima. Päis ei sõltu parajasti laaditud 50 sõnumist ega kogu ajaloo läbilaadimisest.

Olemasolevaid sõnumeid, kaarte, fotosid ega kontakte ei kirjutata ümber ega kustutata. Vana tavalise kuulutuse selgesõnaline saatmisviis säilib. Veel värskendamata vanad kliendid ei saa enam hobuse-, teenuse- või töökaarti igale sõnumile automaatselt kaasa; ühtne valik rakendub uue kliendi kaudu. Olemasolevad konto- ja fotokaitsed jäävad täpselt samaks.

## Paigaldamise kontroll

`preflight.sql` loeb piiratud objektide metaandmeid ning nõuab täpset teadaolevat eelseisu. `apply.sql` kontrollib eelseisu, teeb DDL-i ühes tehingus, kontrollib järelseisu ja tagastab kinnituse alles eraldi COMMIT-järgse vaatlusega. `verify.sql` teeb sõltumatu värske järelkontrolli. Tundmatu seis või teine rakendamiskatse peatub. Väljund ei ekspordi konto-, vestluse-, pakkumise- ega pildiandmeridu.

Varem vastu võetud konto/suhtluse/pildi metaandmed säilivad. Kolme muudetava keha räsi kontrollitakse eraldi sihtosana. Lisatud sõltuvuste eeldused on tuletatud vastu võetud lähtekoodist ning neid võrreldakse hostitud andmebaasis värskelt: nende kohta ei väideta uut tootmisvaatlust. `source-pins.json` seob täpsed lähtefailid, `expected-contract.json` täielikud eeldused ja `sql-files.json` käivitatavad failid.

Rakendaja on olemasolevate vajalike õigustega `postgres`. Saatja omandi üleandmiseks kasutatakse olemasolevat kirjutajarolli; `CREATE` õigus `public` skeemile antakse ja eemaldatakse samas tehingus ning lõplik õiguste seis peab vastama kontrollitud lepingule. Püsivaid rolliõigusi ega Storage poliitikaid ei lisata.

## Kohalikud tõendid ja piirid

Eraldatud PostgreSQL 17.6 katses läbisid kontrolli **33 käitumis-, õiguste-, tagasipööramise ja samaaegsuse juhtu**. Rakendamine töötas ka `postgres NOSUPERUSER BYPASSRLS` õigustega. Säilisid kõik enne rakendamist olemas olnud sünteetilised read, sealhulgas varasemad korduvad kaardid. Kuues juhtumis jälgiti tegelikku PostgreSQL luku ootamist: sama taotluse kordus, võtmekonflikt, eri osapoolte saatmine, pakkumise olekumuutus ning teenuse ja tööpakkumise aegumine.

Katses kasutati tegelikke vastu võetud ja uusi RPC/triggerikehasid ning privaatsete kaarditabelite RLS-i. Auth/JWT, avaldamise ja galerii välised alusmudelid olid vähendatud ning fotode `ready`-metaandmed sünteetilised. Tegelik Storage HTTP, kasutaja brauser, hostitud avaldamine ja kõik võimalikud samaaegsuste kombinatsioonid ei olnud selle katse osa. Fixture'i API-rolli vahetamine on kohalik katseseadistus, mitte tootmise õiguste muudatus.

Lõplik kohalik tõend: `proof/sql/native-report.json`; metaandmekatse: `proof/sql/metadata/metadata-proof.json`. Mõlema katse klaster lõpetati. Käesolev ettevalmistus ei ole väide kasutaja Maci paigalduse ega Verceli uue versiooni kohta.
