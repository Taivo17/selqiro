# Hobuse kuulutuse kohe muutmine

Seis: 08.11.2026 Europe/Tallinn. Praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Vanad paigalduskäsud on ajalugu.

## Kasutaja kinnitatud tulemus

Galerii nooled peituvad umbes kolme sekundi järel ja ilmuvad kursori liigutamisel
tagasi nii tavavaates kui ka suurendatud pildil. Sama hobuse muutmisel ei pidanud
kasutaja faktilisi väiteid uuesti kinnitama. Need kontrollid on vastu võetud.
Varem on vastu võetud ka pisipilt, pildilingid, peatatud kuulutuse muutmine ning
aktiveerimise ja eraldi 90-päevase tähtaja uuendamise erinevus.

Kasutaja leidis järgmise puuduse: Minu alas „Muuda” avas mõnikord lukustatud
vormi, mille all tuli esmalt vajutada „Muuda uuesti”. Põhjus on brauseris säilinud
lõpetatud salvestamise olek. Uus väike parandus lõpetab selle oleku pärast
kinnitatud tulemuse lugemist ja värske vormiversiooni laadimist automaatselt.

Soovitud kasutustee on **Minu ala → Muuda → muuda välju → Salvesta muudatused**.
Pärast salvestamist saab samas vormis kohe jätkata. Kui midagi pole muudetud,
on salvestusnupp mitteaktiivne. Ebaselge tulemusega pooleliolev salvestus kasutab
endiselt olemasolevat kontrollimise ja taastamise voogu.

## Üks praegune käsk

Paki **selqiro-hobuse-muutmine-20261108.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-hobuse-muutmine-20261108/uuenda.py" --publish
```

Uuendaja kontrollib eelmise viimistluspaketi privaatset eduraportit, tegelikku
Git-commiti ja kõiki 1252 alusfaili ning eelnevat paigaldusahelat. Seejärel teeb
failivarukoopia, koostab rakenduse ning teeb commiti ja tavalise push'i. See
parandus ei vaja uut andmebaasimuudatust. Senised paigalduspäevikud säilivad.

**PEATATUD** korral säilita teade, raport ja päevikud ning saada need vestlusse.

## Üks kontroll pärast selle commit'i Ready / Production tulemust

Ava Minu alas sama hobuse juurest „Muuda”. Pärast andmete laadimist peab saama
kohe teksti muuta. Vajuta „Salvesta muudatused” ning kontrolli, et saad samas
vaates teha veel ühe muudatuse või Minu alast muutmise uuesti avada. „Muuda
uuesti” otsimine ega vajutamine ei ole vajalik. Muudetud tekst peab pärast
salvestamist olema nähtav Minu alas ning aktiivsel kuulutusel ka avalikus vaates.

Juba vastu võetud galerii, kinnituste ja tähtaja katseid ei ole vaja korrata.

## Järgmine töö

Teenused järgnevad sama **Avalda → Minu ala → Muuda → Salvesta** kasutusvooga,
oma kanoonilise `services` UUID ning teenuse eriväljadega. Kohustuslikku eraldi
mustandi salvestamist ei lisata; töökuulutused järgivad sama loogikat hiljem.
Mitmesaja kuulutuse eesmärk ja otsustamata püsiv arvupiir säilivad.

Täpne leping: [horse-direct-edit-v1.md](../architecture/horse-direct-edit-v1.md).
Eelmine juhend säilib [arhiivis](../archive/HOSTED_PORTAL.before-horse-edit-direct-20261108.md).
