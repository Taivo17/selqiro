# Hobuste kuulutuste ühendamine olemasolevasse portaali

Seis: 08.11.2026 Europe/Tallinn. Üks praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemad paigalduskäsud on ajalugu.

## Praegune alus ja uus tulemus

English/Eesti valik on kasutaja kuvatõmmistes olemas. Varasema foto kuvamise
parandus `785c359`, ühe lisamise 9 s tulemus ja Frankfurt `fra1` on vastu võetud.
Neid varasemaid paigaldusi/kasutuskatseid ei korrata.

Uus hobusepakett põhineb täpselt taastatud 1106-failisel keelepaketil. See lisab
ühe Avalda-toimingu kõigile viiele hobusetüübile, hallatud fotod, avaliku
kuulutuse/otsingu/profiili ning ühise kontakti. Hilisem muutmine käib Minu alast
ühe Salvesta muudatused toiminguga. Sisemine privaatne jätkamiskatse ei nõua
eraldi Salvesta mustand nuppu. Senine avalik versioon säilib kuni kinnitatud
muudatuseni; kanooniline hobuse UUID ei muutu.

Esimene hobusepakett peatus kasutaja Macis enne muutmist. 08.11 kell 12:42
Eesti aja järgi kogutud ainult lugemise raport kinnitas puhta lähtealuse
`92408b6ceb7a9fec3119d35a86c9bb47628acf22` ning senise SQL-koodi ja struktuuri
vastavuse. Peatuse põhjus oli testmudeli erinevus olemasolevate õigusekirjete
kujule. r2 täpsustab selle aluse kontrolli; seniseid õigusi ümber ei kirjutata.
Vt [eelkontrolli paranduse tõend](HORSE_PREFLIGHT_20261108.md).

Rakenduse varasem TypeScripti, sihitud katsete ja kooste tõend säilib muutmata
runtime-failide alusel. r2 andmebaasi- ja paigalduskontrollid on eraldi. r2
Maci paigaldus, uus Production Ready ja hobusevoo kasutaja vastuvõtt on ootel.

## Üks käsk

Paki **selqiro-hobused-20261108-r2.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-hobused-20261108-r2/uuenda.py" --publish
```

Paigaldus nõuab eelmise eduka keelepaketi privaatset päevikut ja selle täpset
kinnitatud lähtepuud. Samuti kontrollitakse tegelikku haru, indexit ja remote'i.
Failid varundatakse. Hobuse SQL-i 01–07 on üks kontrollitud tehing koos täpse
preflight/verify kontrolliga; järgneb portaali kooste, piiratud commit ja
tavaline push. Ühtegi varasemat foto- või keelepaketti pole vaja uuesti käivitada.

**PEATATUD** korral säilita teade, raport ja päevikud ning saada teade koos
raportiga vestlusse. Tundmatu lähte- või andmebaasiseisu korral kontrolli ei
nõrgendata ega vana paketti oletuse järgi uuesti käivitata.

## Üks sisuline kontroll pärast uut Ready tulemust

Oota terminalis näidatud uue commit'i **Ready / Production** tulemust ja
värskenda portaali. Seejärel:

1. Lisa üks hobuse kuulutus: täida väljad, vali foto, vaata tingimused ja
   kinnitused üle ning vajuta Avalda. Eraldi mustandina salvestamist ei küsita.
2. Ava avalik detail ning leia sama kuulutus otsingust ja kuulutaja profiililt.
   Foto ja õige hobusetüüp peavad olema nähtavad.
3. Ava Minu ala → Muuda, muuda teksti, lisa teine foto, vali see põhipildiks ja
   salvesta. Avaliku lehe UUID peab jääma samaks; pärast kinnitust on uus
   versioon nähtav.
4. Kui teine testkonto on olemas, ava sellelt kontakt. Vestlus peab avanema olemasolevas
   sõnumivaates koos õige hobuse viitega.
5. Vaheta English/Eesti. Nupud ja tagasiside vahetavad keelt; sisestatud sisu
   ning poolelioleva vormi andmed säilivad.

Kõik viis tüüpi, taastumise veateed ja revisjonikaitse on sihitud kohalikes
katsetes kaetud. Üks päris teekond pärast Ready tulemust ei tähenda uut
üldist regressioonitesti ega paljude testkuulutuste loomist.

## Piirid ja järgmine töö

Draft/published hobuseid saab muuta. Ülejäänud staatused jäävad lugemiseks;
uusi arhiveerimise, kustutamise, peatamise või uuendamise toiminguid ei ole
lisatud. Originaalsed kinnitatavad dokumendid on praegu eestikeelsed; inglise
liides selgitab seda, nende sisu ega räsi ei asendata tõlkega.

Teenused on järgmine etapp: kanooniline `services` UUID, sama Avalda ja
Minu ala Muuda/Salvesta kogemus, päris kataloog/detail/kontakt ja hallatud
fotod. Praegune teenuste näidisvaade ei muutu selle hobusepaketiga päris
otsinguks. Töökuulutused järgivad sama loogikat hiljem.

Arhitektuur: [horse-publication-v1.md](../architecture/horse-publication-v1.md)
ja [shared-marketplace-foundation.md](../architecture/shared-marketplace-foundation.md).
