# Avaliku profiili asukohakaart — ASUKOHT-1B

28.11.2026, Europe/Tallinn. Ette valmistatud muudatus; tootmise vastuvõtt on
veel ootel. Kasutaja kinnitas profiili asukoha lisamise toimimise ja palus
avaliku profiili senise tühja kaardiploki tööle panna.

## Vastu võetud alus

ASUKOHT-1 commit on `af78c7be2a336da661be838d3577bb51b7ad3b66`, lähtepuu
`0481e179f75dccfad7fcbe9285ae5230b5472ba5`. Kasutaja 28.11 paigaldusraport
on 1481509 baiti, SHA-256
`e8836d6f572ce0310d0ffb8280a666be9c3063af30c59b044dd492be28b92166`.
Raport, sama commiti Ready / Production pilt ja kasutaja koha salvestamise
kinnitus lõpetavad ASUKOHT-1 vastuvõtu. Vanu uuendajaid ei korrata.

See jätk piirdub avaliku profiili kaardiga. Pakkumise eeltäide, lähimad-enne
otsing ja ajutine teenusekoht jäävad järgmisteks töödeks.

## Kasutaja nähtav käitumine

| Profiili seis | Kaart ja lingid |
| --- | --- |
| Eraisik, avalik kinnitatud asula või piirkond | Liigutatav ja suumitav kaart valitud koha keskmega ning link suuremale kaardile. Täpse aadressi marker puudub. |
| Ettevõte, avalik kinnitatud asula või piirkond | Sama ligikaudne kaardivaade. |
| Ettevõte, teadlikult avalik täpne aadress | Asula/piirkonna kaart ja eraldi avaliku aadressi tekst koos nupuga „Ava aadress Google Mapsis”. |
| Peidetud asukoht | Asukohakaarti, kaardi iframe'i ega aadressi kaardilinki ei kuvata. |
| Vana tekstiline koht ilma uue kinnitatud punktita | Loetav kohanimi ning selgitus, et kaart pole saadaval; väljamõeldud punkti ei teki. Avalik ettevõtte aadress saab endiselt oma kaardiotsingu lingi. |
| Profiil muutub lugemise ajal kättesaamatuks | Eduka lisapäringu `null` tulemus muudab kogu profiili kättesaamatuks. |
| Kaardi lisapäringu tehniline viga | Põhiprofiil jääb loetavaks; kaardi punkti ei asendata vana toorkoordinaadi ega oletusega. |

**Praegu salvestatud koordinaadid tähistavad asulat või piirkonda.**
Ettevõtte tänavaaadress on senises profiilis vabatekst, mitte kinnitatud
hoonepunkt. Kaart ei märgi asula keskpunkti ettevõtte hoonena. Google Mapsi
link otsib avalikku aadressiteksti alles kasutaja klõpsul; selle tulemuse
täpsust ei esitata Selqiro kinnitatud hoonepunktina. Täpse ettevõttepunkti
geokodeerimine ja omaniku kinnitus oleks eraldi järgnev täiendus.

## Avaliku andmelepingu piir

Uus ainult lugemise RPC on
`public.get_public_profile_location_v1(p_identity_id uuid)`.

Vastus on kättesaamatu profiili korral `null`, muul juhul täpselt
`{ identity_id, location }`. `location` on `null` või järgmised seitse välja:

```ts
{
  country_code: string;
  country_name: string;
  place_name: string;
  region_name: string;
  latitude: number;
  longitude: number;
  precision: "locality" | "region";
}
```

RPC kasutab olemasolevat kanoonilist `get_store_by_slug` lugejat. Konto
kättesaadavuse, aktiivse identiteedi ja ettevõtte ning mõlemasuunalise
blokeeringu kontrollid jäävad seega sama lugeja alla. Tagastatud identiteet
peab kattuma küsitud kanoonilise profiiliga. Punkt tuleb ainult kaitstud
ASUKOHT-1 kohakirjest, kehtiva struktuuriga ja profiili praeguse avaliku
riigi- ning kohanimega kattudes.

Aadress, kohaallika identifikaator ja vana `lat/lng` ei kuulu sellesse
lepingusse. Eraisikule ei avata täpse asukoha salvestust. Uus funktsioon
ei kirjuta kasutaja andmeid; seniseid funktsioone, tabeleid ega
kirjutuslepinguid ei asendata. SQL vabastab avaliku vaikimisi käivitusõiguse
ja annab käivitusõiguse ainult olemasolevatele `anon`/`authenticated` rollidele.

Klient kontrollib täpset väljaloendit, identiteeti, riiki, tekstide piire,
koordinaatide vahemikku ja asukoha täpsust. Kaardi lisalugemine on
katkestatav ja piiratud 12 sekundiga. Foto ning asukoha lisalugemised
toimuvad paralleelselt; ühe tehniline viga ei muuda teise edu veaks.
Profiili vahetamisel säilib olemasolev päringu tulemuse identiteedi kontroll.

## Kaardi kuvamine

Kaart kasutab OpenStreetMapi ametlikku HTML-kaardi iframe'i, mis laetakse
alles vaate lähedale jõudes. Aadress ja bbox koostatakse valideeritud
avalikust asula/piirkonna punktist; URL-i host on fikseeritud. Markerit
ei lisata. Asula ning piirkond kasutavad erinevat vaate ulatust.
Kaardi all on alati link suurema kaardi avamiseks.

Iframe'il on kirjeldav pealkiri, piiratud sandbox ja tavaline veebipäringu
viitaja. Suurema kaardi ja aadressi lingid avanevad uues aknas ning see on
abitehnoloogiale märgitud. Kaardiallikale jääb nähtav OpenStreetMapi viide.
Kaardi väliste päringute tegemine on seotud avaliku kaardivaatega; GPS-i,
kasutaja privaatset aadressi ega Geoapify salajast võtit ei saadeta.

Brauser ei võimalda kõikide teise päritoluga iframe'i laadimistõrgete
tuvastamist. Seetõttu ei sõltu väline kaardilink iframe'i edust ega
kasutata `onLoad` sündmust tõendina, et kaardipaanid päriselt ilmusid.
Ilma päris brauserita tehtud katsed ei kinnita välise kaardi visuaalset
toimimist. See kontroll jääb sama uue tootmisversiooni vastuvõttu.

OpenStreetMapi avalik kaarditeenus on parima võimaliku teenindusega ühine
ressurss. See teostus ei tõenda suurema liikluse teenindusmahtu ega anna
teenusetaseme garantiid. Kaardi URL-i loomine on eraldi moodulis, et
vajaduse korral saaks kasutada sobivat kaardipakkujat ilma privaatsus- või
andmelepingut muutmata. Uut API võtit ega sõltuvust see samm ei vaja.

Allikad:

- [OpenStreetMap: HTML-kaardi eksport](https://wiki.openstreetmap.org/wiki/Export)
- [OpenStreetMapi paaniteenuse kasutuspoliitika](https://operations.osmfoundation.org/policies/tiles/)
- [OpenStreetMap oma veebilehel](https://wiki.openstreetmap.org/wiki/OSM_on_your_own_website)
- [Google Maps URLs: aadressiotsing](https://developers.google.com/maps/documentation/urls/get-started)

## Kasutuselevõtt ja järgmine etapp

Uus pakett on `selqiro-profiili-kaart-20261128`. Täpne paigaldus- ja
vastuvõtujuhend on
[PROFILE_MAP_INSTALL_20261128.et.md](../continuity/PROFILE_MAP_INSTALL_20261128.et.md).
Pakett kontrollib juba vastu võetud alust, kolme varasema käigu
raporteid/päevikuid ning teeb oma värske testi, build'i ja piiratud SQL-i
enne commit/push'i. Vana sisu ega pakkumiste asukohti ei täideta.

Pärast uue raporti, sama commiti Ready / Production ning kaardivaate
vastuvõttu jätkub **ASUKOHT-2: uue pakkumise asukoha ühekordne eeltäide
aktiivsest profiilist**. Käsitsi valitud koht ja taastatud mustand on
eeltäitest ülimuslikud. Konto kustutamise lõpetamata osa jääb pausile.
