# Töökuulutuse muutmise konto kontroll — vastu võetud

26.11.2026, Europe/Tallinn. Vastu võetud commit `2b3407fee17f4d19594ce45647a1739b26249835`,
puu `b6543039421cd86f4227d18f65edde1ca06e8a05`, 2398 faili.

Kasutaja kinnitas: „muudatuse salvestamine toimib”. Sama kasutaja Verceli pilt
näitab `2b3407f`, `main`, Ready / Production, 24 s. Need on eraldi kasutaja
tõendid; käesolev vastuvõtt ei teinud uut tootmise päringut.

Tagastatud raporti `selqiro-too-muutmise-konto-olek-20261125-raport-20261126-090543-58eb0a1b9f45.json` suurus on 1294791 baiti,
SHA-256 `89c223c0d700383a47e499b925b6f5fcf53eb037064113dc1d948aafd791a545`. Offline-võrdlus kontrollis väljastatud paki 115 faili,
38 muudetud/lisatud lähtefaili, 2398-faililist lõpppuud ning 519 käsu teekonda.
518 tavaväljundi ja kõigi veaväljundite räsid taastati. Inimesele mõeldud
git-commit'i kokkuvõtte toorbaite raport ei sisalda; neli järgnevat sõltumatut
kontrolli kinnitavad commiti vanemat, teemat, täpset puu- ja failiseisu.
Kolm push'i järgset remote-kontrolli näitavad sama uut commit'i.

Andmebaasi raportis on üks eelseisu kontroll, üks rakendus koos COMMIT-järgse
kinnitusega ning eraldi järelkontroll. Rakenduse faile see eelmine SQL/docs
muudatus ei puutunud; uut klienditestide või Next build'i läbimist sealt ei
järeldata. Varasemad 39 PostgreSQL kontrolli olid eraldatud ettevalmistus.

Eelmist paketti uuesti ei käivitata. Selle tõendi täpne vastuvõtt säilib uues
pakis `proof/accepted/job-owner-write/` all. Uue paketi kontrollid ja tootmise
kinnitus on eraldi. Kasutaja järgmine soov on tööotsingu selgem jaotus ning
V1 asukoha loogika taastamise kavand ühise ülemaailmse otsingu jaoks.
