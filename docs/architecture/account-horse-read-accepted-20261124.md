# Hobusekuulutuste konto-oleku kontroll — vastu võetud

24.11.2026 Europe/Tallinn. Commit `ac5521a7e944ebfb3710ea97b9913cc91b9130ee`; ainus vanem `87bff3f51a01a6953c37096ed32a1017135fd304`;
puu `3466f08a7134bd6fb8b334b7520924f85cfad394`, **2177 faili**. **See väike moodul on vastu võetud.**

## Kokkuviidud tõendid

| Osa | Tulemus |
| --- | --- |
| Mac/Git | 32 paketi rada: 9 muudatust ja 23 uut faili; ülejäänud alus säilib. |
| Testid | Üks Maci sihitud 12/12 TAP-käik; null viga, vahelejätmist, katkestust ja todo. |
| Build | Üks edukas Next.js 16.4.6 / TypeScripti build; kaheksa artefaktiräsi. |
| SQL | Üks preflight, üks COMMIT-i järel kinnitatud apply, eraldi ainult lugemise verify. |
| Commit/push | Main puhas ja kinnitatud remote’iga võrdne; viimane raporti vaatlus 23.11 kell 22:22:07.822. |
| Vercel | Õige pealkiri, main ac5521a, Ready (21 s), sinine Production. |
| Kasutuskontroll | „kuulutused avanevad”; hobuse- ja tavakuulutus, otsing, Minu ala ning mõlemad avalikud profiilitüübid piltidel. |

[Algne raport](https://chatgpt.com/library?file_id=libfile_fde3_f-14163de628a0819187c053ba9e802123_47723c41e94c8191aa89f8c107f6c132&account_id=personal): `selqiro-hobuste-konto-olek-20261123-raport-20261123-222207-586571aebed0.json`,
1353920 baiti, SHA256 `e419d6395a85b8d9a8c213bc6aad58d74878e3a5bd311230401fb38b5986c5c1`. Käik 23.11 kell 22:21:10.946–22:22:07.849 Europe/Tallinn.
[Väljastatud paigalduspakett](https://chatgpt.com/library?file_id=libfile_fde3_f-ff7a8e7074d4819181a59736becf4f5f_47723c41e94c8191aa89f8c107f6c132&account_id=personal): SHA256 `1f434f4d4e867b030c94f71ade366c0af19633426fa3cdabe4958f34b638c61e`;
manifest `da207b8172dfc18521af6b009ec8730b2404be2692de48110fd0b5ad93df974c`. Originaalid säilivad muutmata.

## Allikad ja andmebaas

Täielik lõpppuu ning indeksi tekstiväljund taastati eelmise aktsepteeritud aluse
ja payload’i baitidest. Kõik 2177 failirežiimi, SHA256 ja Git blob’i väärtust
on kontrollitud. Vastavad väljundipikkused ja räsid kattuvad Maci raportiga.
Binaarset indeksit ega terviklikku commit-objekti raport ei ekspordi; siit uut
Maci/Giti/remote’i päringut ei tehtud.

Kolme CLI kviitungi ümbrised taastati parsitud andmetest. Täpsed baidipikkused
ja SHA256 kattuvad salvestatud väljunditega; neid baite parsis algne range parser.
Täielikke kataloogiridu ega stderr’i teksti polnud lisatud. Valitud kuue hobuste
sõltuvuse, kuue seose, 62 veeru ning 11 indeksi lähtekoodist tuletatud ootused
said raporti eel- ja järelkontrolliga kinnituse. See ei ole terve skeemi audit.

SQL asendas `search_public_marketplace_v1` hobuste haru ja
`get_public_horse_offer_v1` konto sobivuse ühenduse. Eraisiku omanik on
`identities.user_id`; ettevõtte omanik `business_accounts.owner_user_id`.
Konto helper, õigused/signatuurid, tavakuulutuste haru ja ühine lehekülgede
lõpposa säilivad. Kehtivus, avaldamise/sisu/galerii lõplikkus, peitmise ja
blokeerimise reeglid ning avalik vastusekuju jäävad samaks.

Kontode, Auth-i, sisu või Storage’i ridu paigaldus ei lugenud ega kirjutanud;
SMTP-d ja sõltuvusi ei muudetud. See kirjeldab paigaldaja ulatust, mitte kõiki
võimalikke samaaegseid kasutajatoiminguid.

## Piltide ja kontrollide piir

Üheksa pilti on tekstiliselt kirjeldatud vastuvõtupaki
`review/visual/screenshot-review.json`-s koos failinimede, suuruste ja räsidega.
Hobusevaates on kaks pilti, hind „Küsi hinda”, müüja ja hobuse andmed. Segatud
otsingus on sama hobusekaart koos tavakuulutustega. Tavakuulutuse vaates on kuus
pilti, hind, müüja ja detailid. Minu ala loendis ning Taivo Garaazi / Milline Veo
avalikes profiilides on olemasolev sisu nähtav.

Need on kasutaja tegelike vaadete tõendid. Kontaktimise, saatmise, salvestamise,
jagamise, muutmise, pikendamise ega kustutamise nuppude käivitamist ei väideta.
Täpset klikkide järjekorda, uut anonüümset seanssi, mobiili, kõiki hobusetüüpe
või konto sulgemist need pildid ei tõenda. Minu konto navilink on nähtav, selle
lehe uut avamist pole piltidel; varasem vastuvõtt säilib ajaloolise tõendina.

Maci TAP/build’i toorlogid ja ehitatud failide baidid pole raportis. Nende
vastuvõtt põhineb muutumatu uuendaja parsitud tulemustel, väljumiskoodidel ning
logi- ja artefaktiräsidel. Kõigi 569 käsu protsessilõpud on kinnitatud. Vana
eduka käigu originaal oli ainult lugemise lukus ning säilis. Toorlogide uut
parsimist, uut build’i ega kordus-SQL-i siinsel vastuvõtul ei tehtud.

Raporti `READY_NOT_CHECKED` jääb muutmata. Deployment’i tõend on eraldi kasutaja
pilt `Screenshot 2026-11-23 at 22.22.57.png`. See ei sisalda deployment-ID/API
kontrolli. Portaali kaheksa pildi failinimed on 24.11.2026; kuupäevi käsitletakse
saadetud failinimedena, mitte sõltumatult kontrollitud salvestusajatemplitena.

## Jõudlus ja järgmine töö

Varasem eraldatud võrdlus kasutas 2400 avaldatavat hobust, 600 tavakuulutust ja
1920 pilti. Kõigi 12 juhu aktiivsed tulemused kattusid. Veel 20 000 kõrvalise
konto lisamisel viie valitud juhu sobivuskutsete arv säilis. Segatud laiotsingu
mediaan oli 2804,52 → 2954,86 ms (+5,36%; vahemikud kattusid). Ühe omaniku 1600
vaste korral oli 1600 kontrolli. Need pole tootmiskoormuse ega statistilise
samaväärsuse tõendid. Avaldamise kontrollid, kaartide koostamine enne lehekülge
ning hobuste FTS vajavad enne suuremat kasutusmahtu eraldi optimeerimist.

Üks järgmine moodul on avaliku profiili kuulutuste ja poerubriikide kolm
iseseisvat lugejat. Täpne allikapõhine audit on
`account-profile-marketplace-read-next-20261124.md`-s. Selle uue mooduli teostust,
teste ega paigaldajat pole selles vastuvõtus tehtud. Konto sulgemise tegevus
ootab ülejäänud vajalike serveriteede ja elutsükli lõpetamist.

Käesolevad dokumendid on ac5521a-järgne ettevalmistus. Maci/Giti faile pole
siit muudetud. Järgmine sisuline koodipakett võtab lisad kaasa. SMTP paus,
ühe eraisiku VÕI ettevõtte konto suund, suletud AI päringuteed ning konto tervik
→ esiletõstmine → reklaamid järjekord säilivad.
