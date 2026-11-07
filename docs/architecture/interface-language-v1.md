# Kasutajaliidese keel

Seis ja kasutaja kinnitatud nõue: **07.11.2026 Europe/Tallinn**.

## Otsus

Selqiro põhikeel ja puuduva tõlke varukeel on inglise keel (`en`). Eesti keel
(`et`) on teine toetatud keel. Järgmised suuremad keeled lisanduvad tegeliku
vajaduse järgi sama tõlkemehhanismi kaudu. Keelt ei määrata riigi ega aktiivse
isikliku/äriidentiteedi järgi.

Sisselogitud kasutaja kasutajaliidese keele autoriteetne allikas on olemasolev
`profiles.language`. Puuduva või toetamata eelistuse korral kasutatakse inglise
keelt. Uut paralleelset keele-eelistuse andmemudelit ei looda.

## Tegelik praegune teostus

Olemasolev `lib/i18n/translations.ts` sisaldab inglise ja eesti sõnastikke.
`lib/i18n/useTranslation.ts` lahendab võtme valitud keelest ja kasutab inglise
fallback'i. V1 `app/my-page/page.tsx` loeb/salvestab `profiles.language` ning
pakub valikuid English/Eesti; `app/components/site-header.tsx` kasutab seda
profiilikeelt.

**Praegune V2 ei ole täielikult kakskeelne.** V2 päises, kontonuppudes,
kuulutuse vormides ja foto lisamise oleku-/veateadetes on eestikeelsed püsisõned.
Ingliskeelne profiil ei muuda neid automaatselt ingliskeelseks. Foto valimise
lisakliki parandus ei tõenda kogu V2 keelekatvust.

Auditi konkreetsed kohad:

- `components/v2/layout/V2Header.tsx` ja
  `src/features/v2-shell/components/V2AccountActions.tsx`: eestikeelne navigeerimine.
- `src/features/listing-edit/components/ManagedListingPhotoAdd.tsx`,
  `src/features/listing-edit/model/managedPhotoAdditionSession.ts` ning
  `src/features/listing-edit/model/useManagedPhotoAddition.ts`: foto lisamise
  kasutajatekstid ja teated.
- `src/features/listing-create/components/ListingCreateImageFields.tsx`:
  uue kuulutuse piltide tekstid.
- `src/features/listing-create/components/OrdinaryListingCategoryFields.tsx`:
  kategooriasildid lahendatakse praegu keelega `et`.
- `src/features/listing-create/model/ordinaryListingInput.ts`:
  sisendisse pannakse praegu `language: "et"`.
- `src/features/listing-create/components/OrdinaryPublicationAction.tsx`:
  reeglidokumente küsitakse praegu lokaadiga `et-EE`.
- `app/layout.tsx`: dokumendi `lang` on alati `en`, ka eestikeelse kuva korral.

Auditi alus on 06.11.2026 väljastatud fotode kiirenduse lähtekood. See ei ole
värske Maci/Giti, kasutajaprofiili ega tootmise keelevaliku lugemine.

## Väike ühine teostus

V2 vajab ühte kasutajaga seotud keele lugejat/provider'it. Moodulite väikesed
sõnastikud ühendatakse olemasoleva `lib/i18n` tõlkeabiga. Inglise võtmed ja
baastekstid on alus; eesti tõlked vastavad samadele võtmetele. Igal moodulil ei
ole oma keele-eelistust ega eraldi tõlkesüsteemi.

Töövoog tagastab stabiilse sõnumikoodi ja vajadusel parameetrid. Kasutajaliides
tõlgib selle kuvamisel. Keele vahetus ei loo pooleliolevat üleslaadimissessiooni,
jätkamiskirjet ega päringuvõtit uuesti. Konto vahetus ei tohi näidata eelmise
kasutaja keele-eelistust.

Kasutajaliidese keel, kasutaja kirjutatud sisu keel ning versioonitud
avaldamisreegli dokumendi keel on eri mõisted. Keelevalik ei tõlgi kuulutuse
teksti ega muuda selle keelemärgist automaatselt. Reeglidokumendi õige keel ja
versioon tuleb avaldamisteel eraldi kontrollida. Dokumendi `lang` peab täielikus
keeleintegratsioonis vastama tegelikule kasutajaliidese keelele.

Foto valimiseks kasutatakse ühte lokaliseeritud rakenduse nuppu, mis avab
seadme failide/fotode valija otse kasutaja klikist. Brauseri või operatsioonisüsteemi
enda valikud võivad olla seadme keeles; neid ei juhita Selqiro sõnastikuga.

## Järgmine kontrollitav keeleetapp

Enne üldist avalikku avamist vii üks terviklik kuulutuse kasutustee läbi nii
inglise kui ka eesti keeles: navigeerimine, loomine ja avaldamistingimused,
fotode valimine/lisamine koos vigade ja jätkamisega, omaniku muutmisvaade ning
avalik kuulutuse vaade. Kontrolli ka puuduva/toetamata keele inglise fallback'i,
konto vahetust, identiteedi/riigi vahetuse sõltumatust, klaviatuuriga fotovalikut
ja seda, et keele muutus ei taaskäivitaks pooleliolevat üleslaadimist.

Täielikku ingliskeelset portaali ei märgita valminuks ainult mõne nupu tõlkimise
põhjal. See dokument kinnitab keelenõude ja olemasoleva katvuse piiri; praegune
foto valimise parandus ei ole kogu V2 tõlkimine.
