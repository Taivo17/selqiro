# Foto lisamise viimase kuvamisetapi kiirendamine

Kuupäev: 07.11.2026, Europe/Tallinn.

## Kinnitatud tulemus enne seda parandust

Kasutaja on paigaldanud foto valiku ja lõpetatud algfailide reservi paranduse.
Verceli ekraanipildil on lähtecommit `f1745be` ja pealkiri
`Fix photo selection and release completed upload sources`.
Selle täielikku commit'i räsi ei ole ekraanipildist tuletatud. Uue paigaldaja
lähtealus on eelmise väljastatud paranduse täpne 1084-failine räside kogum;
Maci vastavuse kontrollib paigaldaja enne kirjutamist.

Kasutaja lisas kuulutusele 201 viis fotot ning kinnitas nähtavuse nii galeriis
kui ka avalikus vaates. Stopperiajad olid 22, 22, 19, 21 ja 18 s
(keskmine 20,4 s). Kümne foto piir rakendus ootuspäraselt.

Pärast Verceli funktsioonipiirkonna muutmist `iad1` → `fra1` tegi kasutaja
sama lähtekoodiga Production redeploy. See on Ready. Üks uus õnnestunud
foto lisamine võttis stopperiga 12 s. Uue päringu `X-Vercel-Id` algab
`arn1::fra1`; vana päringu algus oli `arn1::iad1`.

### Serveri kaks päris mõõtmist

Mõõdud pärinevad kasutaja `image-verify` vastuse `Server-Timing` päisest.
Need on kahe eri foto lisamiskatse vaatlused, mitte kontrollitud sama faili
koormuskatse. Veergude ajad on millisekundites.

| Etapp | Enne, 16:41:39 UTC | Pärast, 18:15:53 UTC |
| --- | ---: | ---: |
| gate | 422,2 | 98,7 |
| image_auth | 115,5 | 28,3 |
| source_session | 278,3 | 160,5 |
| source_finalize | 838,5 | 346,5 |
| source_read | 1173,9 | 1553,0 |
| sanitize | 781,1 | 867,9 |
| web_session | 1168,2 | 411,6 |
| web_write | 286,0 | 169,1 |
| web_finalize | 1022,8 | 423,5 |
| web_read | 1556,8 | 280,8 |
| total | 7647,2 | 4345,2 |

Serverietapi vähenemine on 3302,0 ms ehk umbes 43%. Kõik üksiketapid ei
kiirenenud: SOURCE lugemine ja native töötlus olid uues katses pikemad.
Üks 12 s katse on umbes 41% lühem varasemast viie katse 20,4 s keskmisest;
see pole uue püsiva keskmise kinnitus.

Varasem brauseri UserTiming näitas 14931,5 ms toimingut, sh `image_verify`
7901,1 ms, brauseri ettevalmistust 329,7 ms ja üleslaadimist 566,4 ms.
Seda katset ei saa ID abil konkreetse stopperiajaga siduda. Mõõdu `total`
lõpp ei hõlma kaitstud galerii pildi allalaadimist, dekodeerimist ega
ekraani lõplikku joonistamist. Tühjad ResourceTiming loendid ei ole
nullkestuse ega päringute puudumise tõend.

## Järgmise muudatuse põhjendus

Koodis toimus pärast kinnitatud `append` vastust kaks järjestikust
lugemist:

1. värske autoriseeritud galerii lugemine ja võrdlemine salvestuskviitungiga;
2. alles seejärel uue `ManagedOwnerImage` paigaldamine, kaitstud veebipildi
   päring ja brauseris dekodeerimine.

Pärast lisamise püsivat kviitungit on uue foto täpne meedia-URL teada.
Selle kaitstud lugemise saab alustada galerii lugemisega samal ajal.
Mõlemad kontrollid säilivad; nähtava foto ooteaeg võib lüheneda nende
kattuva osa võrra. Piirkonna valik ja serveri `image-verify` rada jäävad
selles paranduses samaks.

## Piiratud teostus

- `ManagedPhotoAdditionSession` annab pärast edukalt parsitud salvestuskviitungit
  olemasolevale omaniku toimingule ühe eellaaditava meedia-URL-i, kui see on
  salvestusvastuse galeriis. Tundmatu või vigane vastus seda ei tee.
- `useManagedListing` hoiab kõige rohkem üht ajutist eellaadimise URL-i selle
  konto, identiteedi, kuulutuse ja toimingu eluea jooksul. URL ei ole teine
  galerii ega püsiv järjekord.
- `ManagedListingImagePicker` kasutab sama `ManagedOwnerImage` komponenti
  peidetud loendikirjes. See ei lisa nähtavat fotot, galerii loendurit,
  põhipildi nuppu ega eemaldamistoimingut enne värsket galerii tõendit.
- Kui värske galerii sisaldab fotot, saab sama URL-võtmega komponent nähtavaks.
  Juba laaditud objekt ja käimasolev päring säilivad; teist pilti ei küsita
  üksnes peidetust nähtavaks muutumise tõttu.
- Lugemistõrke, eemaldatud foto, konto/identiteedi vahetuse või komponendi
  sulgumise korral ajutine eellaadimine kaob. Senine pildikomponent katkestab
  päringu ja vabastab oma Blob URL-i.
- Eellaadimise võrgutõrge kasutab senist pildi veavaadet ja käsitsi kordusnuppu.
  See ei lisa uut üleslaadimist ega automaatset kordust.

Kaitstud meediapäring teeb endiselt Auth/readiness kontrolli, täpse jooksva
omanikuseose lugemise, WEB-faili täieliku lugemise ja räsi kontrolli ning
seose korduskontrolli pärast faililugemist. Kohalikku algpilti ei kasutata
kinnitatud veebifoto asendusena. Serverit, SQL-i, pildivormingut, limiite,
SOURCE-koristust ega olemasolevat jätkamispäevikut ei muudeta.

## Kohalikud tulemused

- Kontrolleri ja mudeli sihitud Node-testid: **50/50 PASS**.
- Tegeliku integreeritud lehe Chromiumi juhud: **11/11 PASS**. Kinnitatud on
  peidetud laadimine, sama päringu/DOM-i/Blob URL-i säilimine ning vea,
  eemaldamise, identiteedivahetuse ja unmount'i järel koristamine.
- Kogu portaali Next 16.2.1 build koos TypeScripti kontrolliga: **PASS, 28,77 s**.
- Paigaldaja sihitud kontrollid: **6/6 PASS**, kõigi 1084 lähtefailiga ajutises
  Git-hoidlas ja kohaliku bare-remote'iga.
- Sünteetiliste 800 ms galerii ja 1000 ms meedia viidetega võrdlus:
  eelmine kood **2116,5 ms**, uus **1554,9 ms** append-vastusest nähtava fotoni.
  **561,6 ms** vahe tõendab selle kohaliku ajastuse paranemist. See pole päris
  üleslaadimise koguaeg ega uue tootmiskiiruse lubadus.

## Kohaliku kontrolli piir

Kontrollitakse selle muudatuse tegelikku brauserikomponenti, hook'i ja
lisamissessiooni. Auth/RPC/Storage vastused on kohalikus katses sünteetilised.
Olulised juhud on kattuv laadimine aeglase galerii korral, sama päringu
säilimine nähtavaks muutumisel, tühi galerii, lugemistõrge, vahepeal eemaldatud
foto, konto vahetus ja kaitstud meediapäringu tõrge.

Täpne lõplik testide, build'i ja tarne seis on
`CURRENT_STATE.json`-is ning paki `kontrollid` kaustas.
Kohalik viitekatse ei ole uue tootmiskiiruse lubadus.
Maci paigaldus ja järgmise commit'i Production Ready on pärast paki
väljastamist kasutaja tehtavad sammud.

## Üks järgmine kasutuskatse

Paigalda uus `selqiro-foto-kuvamine-20261107.zip` juhise
`HOSTED_PORTAL.md` järgi. Pärast uue commit'i Ready tulemust värskenda
portaali ning lisa üks foto testkuulutusele, kus on vaba fotokoht.
Mõõda aeg nupust `Lisa kuulutusele` kuni pildi nähtavale ilmumiseni
ning kontrolli avalikku vaadet. Kuulutus 201 oli viimati kümne fotoga täis;
olemasolevaid fotosid katse nimel ei eemaldata.
