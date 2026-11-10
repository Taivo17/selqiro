<!-- SELQIRO_HORSE_STORE_CATEGORIES_PREPARED_20261110 -->
## Kavand on teostatud uues lähtepaketis; paigaldus on veel kinnitamata

Allpool on sammu algne soovitus ja tollased lähteviited. Uus teostus, kontrollid
ning tõendipiir on `HORSE_STORE_CATEGORIES_20261110.md`-s. Üks praegune
käivitamiskäsk on `HOSTED_PORTAL.md`-s ja seis `CURRENT_STATE.json`-is.
Selle ajaloolise kavandi „pole veel teostatud” märked ei määra uut tööjärge.

---

# Hobusekuulutuse poe rubriigid — järgmise sammu soovitus

Seis: 10.11.2026 Europe/Tallinn. Praegune tavakuulutuse rubriigihaldus ja
õigusteparanduse järgne kasutuskontroll on vastu võetud. See dokument piiritleb
soovitatud järgmist tööd; hobuste rubriigifunktsiooni pole veel rakendatud.

## Üks kasutajale nähtav tulemus

Omanik saab olemasolevas hobuse muutmisvaates valida enda poe rubriigid ja
salvestada need eraldi. Sama hobusekuulutus on leitav avaliku profiili vastava
rubriigi filtris. Rubriigi eemaldamine eemaldab seose; hobune ja fotod säilivad.

## Kontrollitud lähtepiir

Allikaks on õigusteparanduse väljastatud lähtekoopia. See on koodi vaatlus,
mitte uus Maci tööpuu ega tootmisandmebaasi vaatlus.

- `supabase/repairs/20261109_service_profile_polish/02_profile_marketplace.sql`:
  hobuste haru nõuab praegu `p_store_category_id IS NULL`; rubriigiga tulemusest
  jäetakse hobused välja. Tavakuulutused kasutavad seoseid ja rubriigi alampuud.
- `src/entities/listing/api/managedListingStoreCategoriesClient.ts` ja
  `src/entities/listing/model/listingEditSnapshot.ts`: praegune leping kasutab
  tabelit `listings` ja positiivset bigint-kujulist ID-d. Hobuse UUID ei sobi
  sellesse lepingusse ilma eraldi andmemoodulita.
- `src/features/horse-offer-edit/components/OwnerHorseOfferEditor.tsx`:
  olemas on kontekst, sisu, galerii ja avaldamine; rubriigivalikut pole.
- `supabase/repairs/20261110_store_category_management/01_management.sql`:
  rubriigi eemaldamine koristab praegu tavakuulutuste seoseid. Uus hobuseseos
  peab osalema samas ohutus eemaldamises.
- `supabase/migrations/20260911203000_add_marketplace_item_projection_foundation.sql`:
  ühine marketplace-projektsioon on kirjutuskaitstud vaade, mitte uus põhitabel.

## Teostuspiir

Hobune jääb `horse_offers` UUID-kirjeks. Tema seos poe rubriigiga vajab oma
lugemis-/salvestamislepingut ja serveris sama ligipääsetava aktiivse identiteedi
kontrolli. Kasutajaliides kasutab väikest hook'i ning võimalusel olemasoleva
`ListingStoreCategorySelector.tsx` ühiseid esitlusosi; äriloogika ei lähe lehte.

Salvestamine asendab üksnes valitud seosed atomaarse toiminguna. See ei
avalda hobust uuesti ega pikenda tähtaega. Olemasolev profiili filter säilitab
rubriigi alampuu, nähtavuse, koguarvu ja lehekülgede jaotuse. Kasutaja selge
alamrubriigi valik ei lisa salvestatud ülemrubriigi seost automaatselt.
English/Eesti, privaatsus ja Energy-st sõltumatu tavaline osalemine säilivad.

Teenuste rubriigid on eraldi hilisem samm. Ära loo hobusest tavakuulutuse
varikoopiat ega lisa praegu uusi üldisi haldusfunktsioone.

## Järgmise töö kontroll

Enne tegelikke kirjutusi kontrolli kehtivat lähte- ja andmebaasilepingut ning
Maci/Giti sihti. Muudetud osa vajab sihitud õiguste-, rubriigi eemaldamise ja
profiilifiltri kontrolli, build'i ning brauseris tervikkäiku. Juba vastu võetud
varasemaid paigaldusi ja laiu katseid ei korrata. Commit/push, andmebaasi
muudatus, deployment ja uus kasutajavastuvõtt tuleb märkida eraldi.
