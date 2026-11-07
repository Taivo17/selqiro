# V2 kasutajaliidese keel

Seis: 07.11.2026 Europe/Tallinn. Käesolev kliendimuudatus põhineb kasutaja
vastu võetud `785c359` lähtekoodil. Selle foto lisamine võttis kasutaja katses
9 sekundit ja foto oli avalikus vaates nähtav. Keeletöö enda tootmisse
paigaldamine ja kasutaja vastuvõtt on eraldi samm; kohalik build ei ole tootmise
vastuvõtu tõend.

## Üks keele-eelistus

Selqiro põhikeel ja puuduva tõlke varukeel on inglise keel (`en`); eesti (`et`)
on teine keel. Puuduv, tühi või toetamata eelistus tähendab inglise keelt.
Keelt ei tuletata riigist, asukohast ega aktiivsest era-/äriidentiteedist.

Sisselogitud kasutaja autoriteetne eelistus on olemasolev `profiles.language`.
V1 profiili keelevalik kasutab sama välja. V2 päise English/Eesti valik loeb ja
salvestab sama profiili; uut tabelit, konto tüüpi ega paralleelset localStorage'i
eelistust ei lisata. Sisselogimata külastaja saab valida keele avatud V2 külastuse
ajaks. Uue konto tuvastamisel loetakse selle konto eelistus.

`app/v2/layout.tsx` hoiab üht `V2LanguageProvider` komponenti nii hallatud kui
olemasoleva integratsiooni haru ümber. Lehed ja nende vormid ei saa keele järgi
uut Reacti võtit. Keele vahetamine muudab tekstid ning dokumendi `lang` väärtuse,
kuid ei taaskäivita üleslaadimist, vestlust, vormi ega jätkamispäevikut.

Profiililugemine ja salvestamine on kasutaja ning päringupõlvkonnaga seotud.
Konto vahetus tühistab vana päringu kohe, auth-callback ei tee ise asünkroonset
Supabase'i tööd. Eelmise konto hiline vastus ei taasta selle keelt. Salvestus
kontrollib kasutajat enne ja pärast vastust ning nõuab täpselt sama profiili ja
keele kinnitatud tagastust. Tõrkel säilib viimane kinnitatud keel ja kuvatakse
kordusvõimalus; päringul on 12 sekundi lõpptähtaeg. V1 või teise akna profiili
muudatuse saab sisse lugeda akna fookusesse naasmisel.

## Tõlkemehhanism

Olemasolev `lib/i18n/useTranslation.ts` jääb ühiseks lahendajaks. V1 pesastatud
`getTranslation` jääb ühilduvaks. Väikesed V2 moodulisõnastikud kasutavad
`getCatalogTranslation(language, catalog, key, params)` lahendajat:

- inglise baastekst ja sama võtmega eesti tõlge;
- puuduv või tühi eesti tekst kasutab inglise baasteksti;
- `{count}`, `{name}` jms parameetrid sisestatakse tekstina;
- React kuvab teksti tavalisel viisil, HTML-i ei hinnata;
- kuupäevade ja arvude lokaadid on `en-GB` ja `et-EE`.

`useV2Translation(catalog)` kasutab ühist keelekonteksti. Staatilised sildid
ja muutuvad kasutajateated lahendatakse kuvamisel. Püsiva toimingu seis hoiab
sõnumikoodi ja parameetreid või selgelt märgistatud sõnumiviidet. Tõlget ei
salvestata toimingu identiteedi, päringuvõtme, räsi ega päevikusse. Inglise/eesti
keele vahetus ei tohi minna toimingu loova efekti sõltuvusse.

Kasutaja kirjutatud pealkirju, kirjeldusi, sõnumeid, profiilinimesid,
ettevõttenimesid, oma kategoorianimesid ja vaba hinnateksti ei tõlgita.
Kategooria ID-d, valuutad, summade täpsus, staatused ning marsruudid säilivad.
Foto valiku rakenduse nupp on tõlgitud; seadme failivalija enda teksti juhib
brauser/operatsioonisüsteem.

## Eraldi keeled: liides, sisu, reeglidokument

Need kolm mõistet ei ole sama asi:

1. **Liidese keel** on konto EN/ET eelistus ning juhib nuppe, silte, teateid ja
   vormindust.
2. **Kasutaja sisu keel** kirjeldab kuulutuse teksti. Seda ei tohi profiilikeele
   muutmisel automaatselt ümber märkida ega teksti tõlkida.
3. **Avaldamisreegli dokumendi keel** on osa versioonitud, räsitud dokumendist,
   mille täpse versiooni kasutaja vastu võtab.

Praegune tavalise kuulutuse avaldamise serverileping lubab sisendi keelemärgina
ainult `et`. See piirang on ka viimases kaasasolevas foto lisamise andmebaasi
paranduses (`20261106_published_photo_addition`, moodul `06_attempt_transitions`).
Kohustuslik `marketplace-general` poliitika on seotud `et-EE` dokumendiga.
Hobuse piloodi reeglidokumendid on samuti eestikeelsed. Käesolev kliendipakk ei
muuda serverilepingut, poliitika ID-d, versiooni, teksti ega räsi.

Ingliskeelne liides ütleb selgelt, kui avaldamistingimused on praegu eesti keeles.
Dokumendi tegelik tekst kuvatakse oma keelemärgiga. Tingimuste brauseris tõlkimine
ja sama räsi all teise teksti kinnitamine oleks vale. Täielik ingliskeelne
avaldamisreeglite rada vajab eraldi kinnitatud EN-dokumenti ning serveri
valiku-/kinnituslepingu muudatust. Pelgalt UI keelevalik ei tõenda selle töö valmimist.

## Katvus ja kontrollid

Selle etapi siht on olemasolev V2 kasutajaliides: päis ja konto, kuulutuse loomine,
muutmine, fotod ja koristusteated, avalik otsing/detail/profiil, Minu ala,
vestlused, Energy ning olemasolevad hobuse/teenuse/tootenäidise haldusvaated.
Demoekraanide tõlkimine ei ühenda nende näidisandmeid päris andmebaasiga.
Hobuse avaldamine ning teenuse avalik avastus ja detail jäävad järgmisteks
funktsionaalseteks etappideks; vt `shared-marketplace-foundation.md`.

Tarne kontrollitõendid asuvad paki `kontrollid` kaustas. Kontrollid peavad katma
EN/ET ja inglise fallback'i, hilise konto lugemis-/salvestusvastuse, profiilitõrke,
muutumatu vormiteksti ja valitud File'i, poolelioleva foto lisamise ning selle
jätkamiskirje säilimise, kuvatud teadete keele vahetuse ja responsive päise.
Kohalikud sünteetilised Auth/HTTP vastused tuleb tõendites eristada päris
profiili, Maci, Storage'i ja tootmise vastuvõtust.

## Edasine laiendamine

Järgmine keel lisandub sama sõnastiku- ja profiilimehhanismi kaudu. Uus keel
vajab eraldi tõlkeid, lokaati, keelevalikut ning asjakohaseid reeglidokumente.
Hobuse- ja teenusefunktsioonide uued tekstid tuleb kohe lisada inglise ning
eesti kataloogi. Põhikeeleks ei tohi vaikimisi tagasi muutuda eesti keel.
