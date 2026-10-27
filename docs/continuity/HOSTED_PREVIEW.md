> **Valik tehtud 26.10.2026:** kasutaja jätkab olemasolevas production-portaalis
> ja samas Supabase’i baasis. Aktiivne paigaldusjuhis on [HOSTED_PORTAL.md](HOSTED_PORTAL.md).
> Allolev on varasema eraldatud Preview-variandi tehniline juhis, mitte praegune NEXT.

# Kuulutuse veebieelvaate käivitamine

Seis: 26.10.2026. See on [hosted-arhitektuuri tööjärje](../architecture/hosted-publication-preview-v1.md)
jätk ja praktiline juhis järgmisele kasutuskäigule.

**Ühendav lähtekood on koostatud. Uut SQL-release'i, kasutajate lubamist ja
Verceli veebieelvaadet pole selle juhise koostamisega pilves rakendatud.**
Kohalik piltidega avaldamine on kasutaja poolt juba vastu võetud. Järgmine
tulemus on sama kuulutuse lisamine ja vaatamine veebis; kohalikku kasutuskäiku
ega varasemat metadata kogumist selleks uuesti ei alustata.

## 1. Üks veel vajalik otsus: millisesse Supabase'i avaldame?

Soovitatud siht on **eraldi Supabase'i eelvaateprojekt või sobiv eraldatud haru**,
mis kasutab olemasoleva rakendusega sama skeemialust. Release eeldab repo 23
senist migratsiooni ja olemasolevaid Authi, profiili, identiteedi ning
avaldamistingimuste lepinguid. Tühjale uuele andmebaasile ei ole see üksinda
rakenduse algpaigaldus. Valitud sihi ettevalmistus kuulub selle valiku teostusse.

Teine võimalik suund on kasutada olemasolevat production-Supabase'i ning teha
sinna päris avaldamisi. **Verceli Preview ei eralda sama Supabase'i avaldatud
kuulutuseridu productioni voost.** Uus kuulutus võib ilmuda praegusele avalikule
lehele, samal ajal kui selle `/api/v2/listing-media/...` pilditee pole
production-juurutuses avatud. See suund vajab ka productioni lugemise ja piltide
ühendamise otsust; käesolev konfiguratsioon lubab ainult Verceli Preview'd.
Eelvaate sulgemine ei peida juba avaldatud ridu.

Sihivalik on praegu lahtine. Varem loetud projekti `vyjletlmwoiwxsnsunlm` metadata
ei määra seda automaatselt uue eelvaate sihiks. Allolevad `<...>` väärtused
täidetakse alles valitud projekti tegelike andmetega.

## 2. Käivitamisjärjekord pärast sihivalikut

1. **Seo valitud siht ja paigaldus-ID.** Kasutame valitud Supabase'i projekti
   viidet, regiooni ja selle projekti võtmeid. Loome ühe uue paigalduse UUID ning
   talletame selle tööjärjes: sama väärtus läheb SQL-i ja Verceli
   `SELQIRO_V2_HOSTED_INSTANCE_ID` muutujasse. Olemasoleva kinnitatud sihi
   metadata kogumise ringi ei korrata. Sama paigalduse UUID jääb järgmistes
   Verceli deployment'ides samaks.
2. **Rakenda valmis SQL-release valitud sihile.** Täpne tehing ja
   aktiveerimisjuhis on [release'i README-s](../../supabase/releases/listing-publication-hosted-preview-v1/README.md).
   Usaldatud `postgres` ühendus seab samas tehingus projekti ja paigalduse UUID
   ning rakendab `release.sql` faili. Edukas paigaldus jätab avaldamise suletuks:
   `release_ready=true`, `enabled=false`, kasutajate lubamisloend tühi.
   Privaatne `listing-publication-private` bucket luuakse Storage API kaudu: `public=false`,
   `file_size_limit=26214400`, MIME-tüübid täpselt `application/octet-stream` ja `image/webp`.
   SQL-release ei loo bucket-ridu. Aktiveerimine ja iga valmisolekukontroll loevad päris bucket’i seadeid.
3. **Seadista Verceli Preview ja saada kogu valmis kandidaat GitHubi harule.**
   Allolevad muutujad lisatakse selle eelvaateharu Preview-keskkonda. Seejärel
   kasutame senist Mac → GitHub → Vercel tööviisi, säilitades kandidaadis oleva
   töö. Uue deployment'i aadress peab olema sama, mille Vercel annab muutujas
   `VERCEL_URL`. `NEXT_PUBLIC_...` muutujad peavad olemas olema juba build'i ajal;
   nende muutmine vajab uut deployment'i.
4. **Logi valitud konto kaudu sisse ja ava talle eelvaade.** Konto peab olema
   selle Supabase'i sihi Authis ning tal peab olema oma profiil ja kasutatav
   aktiivne identiteet. Release'i
   [activate.template.sql](../../supabase/releases/listing-publication-hosted-preview-v1/activate.template.sql)
   seob sama projekti, paigalduse ja ühe kinnitatud Auth-kasutaja UUID, lisab
   kasutaja lubamisloendisse ning seab `enabled=true`. Täpne SQL-käik jääb
   release'i README-sse; Verceli lipust üksi ei piisa.
5. **Ava kuulutusevorm ja avalda üks kuulutus.** Värskenda kanoonilise
   deployment'i `/v2/sell` lehte, vali aktiivne identiteet, täida vorm, lisa
   pildid ja nõustu kuvatavate avaldamistingimustega. Pärast avaldamist ava
   kuulutuse detail ja galerii ning `/v2/my-area` omanikuvaade. See on järgmine
   terviklik kasutuskäik veebis. Selle käigus ilmnevad vead parandame sama voo
   juures.

Puuduva või veel suletud release'i korral jäävad senised lugemisvaated kasutusse
ning eelvaade teatab, et kuulutuse lisamine on veel suletud. Rakendus ei lülita
puuduvate uute RPC-de peale ainult keskkonnalipu tõttu.

## 3. Verceli Preview keskkonnamuutujad

Kõik järgmised väärtused peavad kuuluma **samasse valitud Supabase'i sihti**.
Salajased väärtused sisestatakse Verceli serveri keskkonnamuutujatesse. Neid ei
panda lähtekoodi, üleandmisfaili ega vestlusesse.

| Muutuja | Väärtus | Nähtavus |
|---|---|---|
| `SELQIRO_V2_HOSTED_PREVIEW` | `v1` | Serveri lipp, pole saladus |
| `NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW` | `v1` | Avalik browseri lipp |
| `SELQIRO_V2_HOSTED_PROJECT_REF` | Valitud projekti 20 väikese tähega viide | Avalik sihitunnus |
| `SELQIRO_V2_HOSTED_INSTANCE_ID` | SQL-paigaldusse talletatud sama UUID | Avalik paigaldustunnus |
| `SELQIRO_V2_HOSTED_REGION` | Valitud projekti tegelik regioon, näiteks `eu-central-1` | Avalik sihitunnus |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co`, ilma lõpus oleva `/` märgita | Avalik API aadress |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sama projekti kehtiv **legacy `anon` JWT** | Avalik kliendivõti |
| `SUPABASE_SERVICE_ROLE_KEY` | Sama projekti kehtiv **legacy `service_role` JWT** | **Serverisaladus** |
| `SELQIRO_V2_S3_ACCESS_KEY_ID` | Sama projekti serveri S3 access key ID | **Ainult serveris; S3 võtmepaari osa** |
| `SELQIRO_V2_S3_SECRET_ACCESS_KEY` | Eelmisega paaris olev S3 secret access key | **Serverisaladus** |

Praegune adapter kasutab just legacy JWT-võtmeid. `sb_publishable_...` või
`sb_secret_...` ei asenda selles konfiguratsioonis ülaltoodud anon- ja
service-role-võtmeid. Serveri S3 võtmed ei ole brauserile antavad üleslaadimisvõtmed.

Need kümme on kuulutuse hosted-preview ühenduse muutujad. Projekti senised muud serverimuutujad,
sealhulgas olemasoleva AI-route’i `OPENAI_API_KEY`, jäävad vastavalt senisele seadistusele alles;
need ei kuulu avaldamise browseri konfiguratsiooni.

Verceli enda käituskeskkond peab andma `VERCEL=1`, `VERCEL_ENV=preview`,
`NODE_ENV=production` ja tegeliku `VERCEL_URL` väärtuse. Neid ei võltsita
kohaliku või production-keskkonna avamiseks.

`SELQIRO_V2_LOCAL_INTEGRATION` ja `NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION`
peavad selles Preview-keskkonnas **puuduma**; ka tühi defineeritud väärtus
sulgeb hosted-konfiguratsiooni. Kohaliku arenduse seadeid selleks ei muudeta.

`SELQIRO_V2_APP_ORIGIN` võib jätta seadistamata. Rakendus tuletab selle kujul
`https://${VERCEL_URL}`. Kui muutuja siiski määratakse, peab see täpselt võrduma
tuletatud originiga. Hosted-konfiguratsioon tuletab ka Storage-host'i ja S3
endpoint'i ise; nende jaoks uut avalikku env-muutujat pole.

## 4. Õige veebiaadress ja sisselogimine

Kasuta **konkreetse deployment'i kanoonilist URL-i**:

```text
https://<VERCEL_URL>/v2/sell
https://<VERCEL_URL>/v2/my-area
```

Näites asendatakse `<VERCEL_URL>` Verceli antud hostiga, ilma `https://`
eesliiteta. Haru alias, enda domeen või mõne varasema deployment'i host ei ole
selles versioonis sama origin. Päringu Host ja Origin peavad vastama valitud
deployment'ile.

Praegune Auth-leht kasutab **e-posti ja parooliga sisselogimist** ning suunab
kasutaja tagasi sama veebiaadressi V2 lehele. Otselink on:

```text
https://<VERCEL_URL>/auth?next=%2Fv2%2Fsell
```

See `next` on rakenduse tagasisuund. Koodis ei ole `/auth/callback` route'i,
OAuthi käivitamist ega PKCE koodi vahetust, seega sellist callback-URL-i ei ole
vaja selle sisselogimise jaoks lisada. Uue konto registreerimine ei määra
`emailRedirectTo` väärtust. Kui valitud projekti kontol on vaja e-posti kinnitust,
peab selle konto kinnitamine olema lõpetatud enne eelvaate lubamisloendisse
lisamist; olemasoleva productioni Auth-seadeid ei muudeta eelvaate oletuse põhjal.

Sisse logitakse valitud sihis oleva konto enda parooliga. Eraldi Supabase'i
projekt ei saa olemasoleva projekti kontot automaatselt kaasa. SQL-i lubamisloend
kasutab selle sihi päris Auth-kasutaja UUID-d; e-posti, aktiivse identiteedi UUID või browseri
lipu sisestamine selle asemele ei ava avaldamist.

## 5. Mida valmis ühendus teeb ja milline piir jääb

Release'i tunnus on `listing-publication-hosted-preview-v1`. Rakendus kontrollib
paigaldatud release'i, projekti, instance-UUID-d, Storage lepingut
`supabase-s3-session-v1` ja koristuse režiimi `held`. Iga hosted kirjutamispäring
kontrollib kasutajat Supabase Auth kaudu ning sama kasutaja lubamist andmebaasis.
Senine profiili, aktiivse identiteedi ja versioonitud tingimuste kontroll säilib.

Ühendatud on tavakuulutuse ettevalmistus, SOURCE-pildi üleslaadimine, native
pilditöötlus, kontrollitud WEB-pilt, avaldamine ning avalik ja omaniku lugemisrada.
Pildi vastuvõtmine üksi ei kinnita veel avaldamist; avaldatud seis tuleb
andmebaasi kviitungist.

**Hosted lõppkoristus on selles suletud eelvaates ootel.** Koristuse käsk loeb
olekut ning tagastab ootel seisu; see ei väida failide lõplikku kustutamist ega
vabasta nende reserve. Seetõttu võib avaldamise või kustutamise järel jääda
koristusteade nähtavaks ja kasutatav reserv väheneda. Seda ei lahendata samade
piltide korduva üleslaadimise või uute katsete tegemisega. Üldine avalik
väljalase vajab edaspidi ka hosted lõppkoristuse lõpetamist.

Tehniline paigaldus ja aktiveerimine on ühes kohas:
[SQL-release'i README](../../supabase/releases/listing-publication-hosted-preview-v1/README.md).
Jooksev tööjärg ja tegelikult lõpetatud toimingud säilivad
[CURRENT_STATE.json-is](CURRENT_STATE.json). See juhis ei märgi pilveetappe
tehtuks enne nende päris käivitamist.

Juhise koodiallikad: [hosted-konfiguratsioon](../../src/server/listing-publication/journey/hostedPreviewConfig.ts),
[readiness-kontroll](../../src/server/listing-publication/journey/hostedPreviewReadiness.ts),
[V2 käivitus](../../app/v2/layout.tsx), [sisselogimisleht](../../app/auth/page.tsx)
ja [hosted pilditöötluse voog](../../src/server/listing-publication/multipart/multipartPublicationImages.ts).
