# Järgmine samm: töökuulutuse omaniku toimingute konto kontroll

25.11.2026. Sõnumite muudatus `c66a39b` on vastu võetud; seda ei käivitata uuesti.
Uus pakett on `selqiro-too-muutmise-konto-olek-20261125.zip`. Laadi see alla ja paki Downloads-kaustas lahti.
Käivita olemasoleva Selqiro projekti terminalis üks käsk:

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-muutmise-konto-olek-20261125/uuenda.py" --publish
```

Pakett kontrollib täpset lähtealust, puhast tööpuud/indexit, remote main'i,
eelmist edukat originaalraportit ning olemasolevat Supabase CLI-d ja projekti.
Seejärel kontrollib andmebaasi eelseisu, rakendab töökuulutuste kirjutuskontrolli
ühe tehinguga ning teeb eraldi järelkontrolli. Ainult kinnitatud tulemuse järel
teeb see täpselt määratud failidest commit'i ja push'i.
Rakenduse ega sõltuvuste faile ei muudeta; uut Next build'i ei käivitata.

Lõpus saada siia uus JSON-raport, mille tee algab terminalis `SAADA SEE FAIL:`.
Käivitaja valib sama faili Finderis. Kui käik peatub, saada selle käigu raport
ja ära käivita paketti uuesti; kinnitamata andmebaasitoiming selgitatakse
vajadusel eraldi ainult lugemisega.

Pärast edukat käiku kontrolli **sama uut commit'i** Vercelis Ready / Production
seisus. Seejärel piisab olemasoleva töökuulutuse tavalisest muutmisteekonnast.
Uut eraisiku testkuulutust pole selle sammu jaoks vaja avaldada.

Praegune vastu võetud alus: `c66a39b96c8d204382413a7ab652e66898782f18`; puu `c6e2726a6d97d12731dc2d505a734164523b90e0`.
Uue muudatuse tootmise käiku pole ettevalmistus tõendanud.
Konto sulgemise/taastamise tervik jätkub pärast selle mooduli kinnitamist.
