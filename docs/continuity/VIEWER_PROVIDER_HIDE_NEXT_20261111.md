> Ajalooline 11.11.2026 ettepanek. 13.11 kinnitas kasutaja 24 tundi ja eraldi püsiva blokeerimise. Kehtiv leping: VIEWER_PROVIDER_CONTROLS_20261113.md. Allolev algtekst säilib ajaloona.

# Järgmine soovitus — pakkuja ajutine peitmine otsingust

11.11.2026 Europe/Tallinn. Teenuse aastane kehtivus on vastu võetud.
See on järgmise soovitatud mooduli ulatus; lähtekoodi, SQL-i, teste ega
paigalduspakki selle jaoks veel ei ole.

Esimene ettepanek: „Peida see pakkuja 7 päevaks”, kohene „Võta tagasi”
ning Minu alas „Näita uuesti”. Seitse päeva on soovitus, mitte kasutaja
eraldi kinnitatud lõplik kestus või avaldatud seadistus.

Eelistus kuulub vaataja kontole ja sihib pakkuja identiteeti. See säilib
vaataja enda identiteedivahetusel ega peida pakkuja teisi identiteete.
Sõnumid, teadlikult avatud profiil ja detaili otseviide säilivad tavapäraste
õigustega. Pakkujale ei teki teadet ega karistust. Senist user_blocks-i
ei muudeta selleks otsingueelistuseks.

Esimene vajalik ülevaatus: 955c935 tegelikud otsingulugejad, kaardid,
koguarvud, leheküljed ja konto-eelistused; tava-, hobuse- ja teenusepäringute
ühised piirid ning tegelikult rakendatud esiletõstmine/reklaam.
Filtreerida serveris enne koguarvu ja lehekülge, indekseeritava kontoga
piiratud välistusega. Ära lisa päringut iga tulemuse kohta ega laadi
üldist tulemusloendit kliendis filtreerimiseks alla. Tähtaega otsustab server.
Kontrollida asjakohaseid päringuplaane: pikaajaline eesmärk on väga suur
samaaegsete otsingute maht.

Vaataja otsingueelistust ei lisata üldisesse is_public abifunktsiooni,
kui sama funktsioon kaitseb ka otse avatud profiili/detaili.
Esiletõstetud tulemused ja rakendatud reklaamid austavad otsingu kontekstis
eelistust; selle pärast uusi reklaamipindu ei looda.

Duplikaatide juhendamine, järjestuse üldine mitmekesistamine ja töökuulutused
jäävad eraldi sammudeks. Töökuulutuste kinnitatud suund: ettevõtte avalik
profiil/otseviide, üks kuu ja üldotsingu hilisem avamine. Energy/maksete,
piiratud AI ning seniste avaliku avamise piiride kokkulepped säilivad.
