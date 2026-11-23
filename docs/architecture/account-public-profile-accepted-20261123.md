# Avaliku profiili konto-oleku kontroll — vastu võetud

23.11.2026 Europe/Tallinn. Commit `8dc0b3b11777b010c8486b45a3f98f0191d97d80`, puu `fc44ed6ae9e903bbbaef1df2017fdca396a1aa02`,
2130 faili. Ainus vanem on `4b607828d0b153b84166ba963fdb4e77337e11f0`.

## Tõendite kokkuviimine

| Osa | Vastu võetud tulemus |
| --- | --- |
| Maci/Giti lähtekood | 30 täpset paketi rada, 8 muudetud ja 22 uut; täielik lõpppuu/index ning puhas tööpuu. |
| Testid | Üks 8/8 testiga TAP-käik, null viga/vahelejätmist/katkestust/todo. |
| Build | Üks edukas Next16.4.6/TypeScripti build; seitse ehitusartefaktiräsi. |
| SQL | Preflight enne, üks kinnitatud rakendamine ja eraldi ainult lugemise verify pärast. |
| Push | Main ning approved origin/main võrdsed; viimane vaatlus 19:02:00.673 Europe/Tallinn. |
| Deployment | Kasutaja pildil main 8dc0b3b, Ready / Production, õige commit’i pealkiri. |
| Tegelik kasutustee | Milline Vedu ettevõtteprofiil ja Taivo Garaaz eraisikuprofiil koos avataride/kaanepiltidega; Minu konto Aktiivne; kasutaja „kõik lehed avanevad”. |

## Raport ja muutumatu pakett

[Algne Maci raport](https://chatgpt.com/library?file_id=libfile_fde3_f-a29f3612fbe0819195c6c823136efd1f_47723c41e94c8191aa89f8c107f6c132&account_id=personal): `selqiro-profiili-konto-olek-20261123-raport-20261123-190200-2ca1275173f0.json`,
1341579 baiti, SHA256 `62ec79032d68bdb6e453953f639255876bbb000da19d11e70d5584111ebf7ba9`.
Käik 19:01:03.924–19:02:00.701 Europe/Tallinn.

[Väljastatud paigalduspakett](https://chatgpt.com/library?file_id=libfile_fde3_f-61fd24822eb48191bbfcb511b98d5e16_47723c41e94c8191aa89f8c107f6c132&account_id=personal): SHA256 `97a6cce5ca1b38a31686bd240c118c1f8ba2464b6b243f2229ca7b68c62390b4`;
manifest `ef66792304f6ea94ed7773954d7773b82fd3e37f28d67fbde22cb935c8228574`. Paketti ei muudeta ega käivitata uuesti.

## SQL ulatus ja tõendi piir

Uus abifunktsioon loeb kontoolekut; olemasoleva kanoonilise profiililugeja
lõppfilter hindab valitud profiili omanikukonto sobivust. Kanooniline kandidaat
valitakse enne sobivust. Avalikud väljad, privaatsus, blokeerimine ja meedia
delegatsioon säilivad. Konto- ega sisuridade kirjutusi selles SQL-is pole.

Täpne külmutatud kviitungiparser ning taastatud CLI JSON-ümbriste baidipikkused
ja räsid kattuvad kolme salvestatud vaatlusega. SQL-i eelseis kinnitas nüüd
valitud definitsioonid, omanikuviited, indeksid ning õigused; see ei ole terve
andmebaasi või kõigi rollide audit. Paigalduse käigus kontoridu ei loetud ega eksporditud.

TAP-i ja build’i toorloge raport ei sisalda. Nende tulemus tugineb muutumatu
uuendaja kontrollitud sisenditele, protsessi exit-koodile, rangele parsitud
tulemusele ning logi- ja artefaktiräsidele. Vastuvõtt ei väida nende toorlogide
uuesti parsimist. Uusi teste, build’i, SQL-i ega teenusepäringuid siin ei tehtud.

Raporti `READY_NOT_CHECKED` säilib. Verceli pilt on sellest eraldi deployment’i
tõend. Pildid ja kasutaja kinnitus katavad küsitud profiilide ning konto lehe
avanemise; anonüümset seanssi, kõiki kontosid, mobiilivaadet ega nuppude toiminguid
ei loeta selle põhjal eraldi kontrollituks.

## Järgmine töö ja säilivad piirid

Konto olek saab endiselt olla ainult active. Konto sulgemine, taastamine ja
lõppkustutamine vajavad ülejäänud lugemise/kirjutamise ning sõnumi-/pilditeede
lõpetamist. Varem antud avalikud pildi-URL-id pole selle profiilifiltriga tühistatud.

Üks järgmine moodul on tavakuulutuste otsingu ja üksikvaate sama kontooleku piir;
täpne lähtekoodiaudit on `account-listing-read-next-20261123.md`-s. See on kavand,
mitte uus rakendatud kood. Ühe eraisiku või ettevõtte konto suund, SMTP paus,
tasuta tavaline osalemine ning suletud AI päringuteed säilivad.

Need vastuvõtudokumendid on ette valmistatud pärast 8dc0b3b. Maci dokumente pole
siit uuesti kirjutatud, commit’itud ega pushitud; lisad tulevad järgmise sisulise
koodipaketiga. Originaalraport, pakett, päevikud ja varasem ajalugu jäävad muutmata.
