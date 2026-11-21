# Uuendatud otsus — 21.11.2026

See sissekanne asendab allpool oleva algse plaani järgmiste tegevuste järjekorra.

- Turvauuendus `cd35d1878157a1730d489241b283881b28740a33` on Maci raporti ja Ready / Production ekraanipildi põhjal vastu võetud.
- Kasutaja kinnitas, et kõik kolm olemasolevat kontot on tema loodud ja teisi testijaid veel ei ole.
- E-posti kinnitamise aktiveerimine lükati teadlikult edasi `selqiro.com` kasutuselevõtuni, enne väliste kasutajate kaasamist. Ettevalmistatud registreerimise/kinnitamise/taastamise lahendus säilib eraldi; seda selles paketis ei avaldata. Selle delta tuleb hiljem sobitada siis kehtiva koodiga, mitte asendada portaali vana täieliku koopia abil. Site URL, täpsed tagasipöördumised, mallid ja SMTP tuleb koos seadistada.
- Kasutajale kuuluvad `selqiro.com/.app/.io` ning `selkiro.com/.app/.io`; põhidomeeniks valiti `selqiro.com`. Eraldi serveri ostmine pole selle otsuse eeltingimus. Domeene selles paketis ei muudeta.
- Kasutaja kinnitas eraisikute töökuulutuste vajaduse ja palus selle järgmisena teha. Mõlemad profiilitüübid saavad otsida konkreetse töö tegijat või töötajat. Rakenduse ja serveri terviklik muudatus on `docs/architecture/personal-jobs-20261121.md` all.

Allolev varasem uurimus ja algne plaan säilivad ajaloolise alusena. Nende vanad „järgmise töö” või „pole vaadatud” kirjeldused ei tühista ülalolevat uut otsust.

---

# Registreerimine, e-posti kinnitamine ja eraisikust tööandja

21.11.2026. Plaan põhineb kasutaja uuel juhisel ja vastu võetud fb36c3b lähtekoodil. Selles turvauuenduse paketis neid käitumismuudatusi veel ei tehta.

## Järjekord ja otsuse seis

1. Praegune Next/Sharp sõltuvuste turvauuendus, seejärel selle uue Maci raporti ja sama commit’i avaldamise kontroll.
2. Kasutaja on heaks kiitnud **e-posti kinnitamise lisamise**. Ühendame selle lihtsa registreerimise ja esimese eraisiku/ettevõtte profiili valikuga. Üks selge nähtav valik; olemasolevate kasutajate mitut profiili ega nende õigusi ei kustutata.
3. Soovitus on lubada töökuulutusi ka eraisikust tööandjale. Rakendada eraldi tervikliku õiguste muudatusena, säilitades ettevõtete praegused liikme- ja omanikupiirangud. See uurimus ei ole üldine luba avada kõiki riike.
4. Enne laiemat avamist tuleb lõpetada konto sulgemise/kustutamise, säilitamise ning avamiseelse turvaülevaatuse kokkulepped. Reklaami ja esiletõstmise iseteenindus jääb eraldi tulumudeli etapiks; riigiti muudetavad fikseeritud hinnad ja enne maksmist nähtav hinnakiri.

## Mida praegusest e-posti teekonnast teame

`app/auth/page.tsx` kutsub signUp funktsiooni email/password argumentidega, ei määra emailRedirectTo väärtust ega erista returned session olekut. See kuvab alati konto loodud teate. Projektist ei leitud terviklikku kinnitamise callback/verifyOtp/exchangeCodeForSession teekonda. See on lähtekoodi tähelepanek; see ei tõenda, et Supabase’i live Confirm email seadistus oleks väljas.

Järgmise paketi vajalikud osad:

- kontrollida tegelikku Auth seadistust ja olemasolevate kasutajate olekut, tundlikke väärtusi raportisse kopeerimata;
- usaldatud avaliku domeeni ja täpsete tagasipöördumislinkide seadistus, ilma vabalt kasutaja sisestatavasse välisaadressi suunamiseta;
- toimiv kirjade saatmise teenus, saatjadomeen ja kinnituskirja mall; Supabase’i vaikimisi SMTP ei ole mõeldud tootmiskirjade teenuseks;
- selge „Kontrolli oma e-posti” vaade, piiratud kordussaatmine, aegunud/kasutatud/vale lingi arusaadav tulemus ja õnnestunud kinnitamise järgne edasi liikumine;
- tegelikul serveri/Auth kontrollil põhinev kinnitamiskohustus avaldamise ja teiste kasutajatega kontakteerumise alustamiseks; lehitsemine ei vaja seda;
- parooli taastamise sidus teekond, et kinnitamine ei jätaks kasutajat kontole ligipääsuta;
- olemasolevate kasutajate teadlik üleminek. Varasema auto-confirm seadistuse ajal tekkinud kinnitamise ajamärki ei tõlgendata automaatselt päriselt vajutatud e-kirja tõendina. Kõiki kasutajaid korraga teadmata põhjusel välja ei lukustata;
- ühekordse lingi, avatud teise seadme, uuesti laadimise ja sessioonita signup-tulemuse kontrollid.

E-posti kinnitamine näitab postkastile ligipääsu. See ei kinnita inimese isikut, ettevõtte esindusõigust ega tehingu ausust. Uut „usaldusväärne kasutaja” märgist üksnes selle alusel ei lisata.

Allikad: https://supabase.com/docs/guides/auth/auth-smtp ; https://supabase.com/docs/guides/auth/passwords

## Miks lubada eraisikul tööd pakkuda

Eraisikust tööandja ei ole ainult mõne piirkonna mitteametlik erand. Maksu- ja tööõiguse allikad käsitlevad seda ka Eestis, USA-s ja Jaapanis. Eraisik võib vajada lapsehoidjat, koduabilist või hooldajat. Konto liik ei otsusta, kas konkreetne töö on töölepinguline või iseseisva teenuse tellimine. Ka lühiajaline töö võib tegelike tingimuste järgi olla töösuhe.

| Riik | Allikast tulenev kitsas järeldus |
| --- | --- |
| Eesti | MTA selgitab otseselt eraisikust tööandjat, ka ilma FIE staatuseta. |
| USA | IRS käsitleb household employee suhteid; määravaks võivad olla töö ja selle viisi üle kontrolli asjaolud. |
| Jaapan | Tervise-, töö- ja heaoluministeerium käsitleb otse kodumajapidamisega sõlmitud töölepinguid; erinevate tööseaduste ulatus ei ole ühetaoline. |
| Venemaa | Töökoodeksi artikkel 20 hõlmab füüsilisest isikust tööandjaid, sh isiklike/koduste vajaduste jaoks töötaja palkamist. |
| Brasiilia | Tööministeeriumi juhis nimetab kodutöötaja tööandjaks isikut või perekonda. |
| Lõuna-Aafrika | Ametlik juhis näeb kodutöötaja puhul ette tööandja UIF registreerimise. |
| India | Töökoha seksuaalse ahistamise vastase seaduse §2(g)(iv) hõlmab kodutöötaja tööandjana isikut või leibkonda. See ei tähenda kogu riigi kõigi tööõiguslike reeglite ühtlust. |
| Tai | Tööministeerium ja ILO käsitlevad kodumajapidamise töötajaid ja nende kaitset. |
| Hiina | Shanghai kohtu selgitus eristab koduteenuste tsiviilõiguslikku suhet tavapärasest tööõiguslikust suhtest. Sama lepingumudelit ei tohi automaatselt kõigile riikidele üle kanda. |

Need on valitud riikide näited, mitte tervete maailmajagude reeglid ega riikide täielik turulepääsu kontroll. Eristada tuleb töö tegemise riiki, konto asukohariiki ja seda, kus teenus tegelikult turule tuuakse.

## Selqiro lihtne kasutuskogemus

Üks töökuulutuse lisamise koht eraisikule ja ettevõttele. Kuvada tegelik avaldaja profiil ja märgis „Eraisik” või „Ettevõte”; eraisikult ei nõuta ettevõtte nime väljamõtlemist ega tarbetut uut kontot. Kuulutuses peavad olema arusaadavad töö sisu, töö tegemise riik/piirkond, tasu ja kavandatud suhte liik. Töölepingu ning teenuse tellimise eristamiseks sobiv väli või suunamine tuleb sobitada olemasoleva töökuulutuse vormiga. Uut keerulist tööbörsi ega igale riigile eraldi kontot ei ole vaja.

Suhte õiguslik liigitus sõltub tegelikest tingimustest ja kohalikest reeglitest, mitte üksnes rippmenüüst. Riigipõhine nõutavate väljade loogika tuleb hoida eraldi avaldaja omandimudelist. Eraisiku täpset koduaadressi avalikult ei nõuta; avalik asukoht on linn/piirkond. Kinnitatud e-post, olemasolev kaebamine/blokeerimine ja kuulutuse selged tingimused moodustavad baaslahenduse. Täiendav kontroll olgu riskipõhine, mitte kõigilt vaikimisi dokumendikoopiate kogumine.

## Olemasolev backend — miks ainult nupust ei piisa

Praegu on `JobEditorPage` ja `useJobEditor` ettevõttepõhised. `MyJobsSection` ja avaliku profiili tööjaotis eeldavad ettevõtte identiteeti. `supabase/repairs/20261116_jobs_public` all nõuavad require_actor, is_public, public_fields, profile jobs lugemine ja contact_snapshot ettevõtte kontot või selle omanikku. Brauseri otsekirjutused on suletud, kasutusel on RPC käsud.

Laienduses tuleb ühe tervikuna katta eraisiku enda identiteedi omand, avaldamine/muutmine/lõpetamine, oma kuulutuste lugemine, avalik nime/profiili sidumine, blokeerimise ja peitmise kontrollid, kontakti/vestluse vastaspoole sidumine, samuti olemasolevad CAS ja idempotentsuse piirid. Ettevõtte liikmeõigused peavad säilima. Kontotüübist või kliendi saadetud owner ID-st ei tohi saada autoriseerimise tõendit.

Praeguse riigivaliku kahe tähega kood ja „Muu riik” ei ole õiguslik lubatud turgude nimekiri. Olemasolev riigipõhiste poliitikate lahendamata kontroll ei tohi uue UI tõttu möödutavaks muutuda. Käesolev pakett jätab need kõik kehtima.

## Ametlikud allikad, kontrollitud 21.11.2026

- Eesti MTA: https://emta.ee/eraklient/eraisikust-tooandja
- USA IRS: https://www.irs.gov/businesses/small-businesses-self-employed/hiring-household-employees
- Jaapan MHLW: https://www.mhlw.go.jp/stf/newpage_37762.html
- Venemaa ametlikul ministeeriumi lehel avaldatud töökoodeks, art 20: https://mchs.gov.ru/uploads/document/2026-01-14/506f16e41342be54537ba16886ab2084.pdf
- Brasiilia tööministeerium: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/fiscalizacao-do-trabalho/trabalho_domestico
- Lõuna-Aafrika valitsus: https://www.gov.za/faq/government-services/how-do-i-register-my-domestic-worker-uif
- India seaduse tekst, §2(g)(iv): https://www.indiacode.nic.in/bitstream/123456789/2104/1/A2013-14.pdf
- India ILO ülevaade: https://www.ilo.org/resource/article/fifteen-years-advancing-decent-work-domestic-workers-india
- Tai tööministeerium: https://www.mol.go.th/en/news/household-workers-celebrate-as-labour-minister-successfully-pushes-ministerial-regulations-into-effect-on-april-30-allowing-98-days-of-maternity-leave
- Hiina, Shanghai esimese vaheastme rahvakohtu selgitus: https://spjf.a-court.gov.cn/xxfb/no1court_412/docs/202310/d_3981512.html
