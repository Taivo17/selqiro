# Praegune järgmine samm: ASUKOHT-1 kasutuselevõtt

27.11.2026. Metaandmete raport on vastu võetud. Ühine riigi ja koha valik
ning profiili põhiasukoha salvestus on ette valmistatud ja kohalikult kontrollitud.
Kasutaja Maci paigaldus ning uue versiooni tootmise kontroll on veel ootel.

1. Seadista Verceli Selqiro projekti Production-keskkonda **GEOAPIFY_API_KEY**.
   Täpne juhend: [Profiili asukohavaliku kasutuselevõtt](PROFILE_LOCATION_INSTALL_20261127.et.md).
2. Paki uus `selqiro-profiili-asukoht-20261127.zip` Downloads-kaustas lahti
   ja käivita üks kord:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-asukoht-20261127/uuenda.py" --publish
```

3. Saada lõpus näidatud uus JSON-raport. Pärast raporti kontrolli peab sama
   uus commit olema Vercelis **Ready / Production** ning profiilis tuleb
   proovida tegelikku kohavalikut, salvestamist ja lehe värskendamist.

Kui võti lisatakse pärast deployment'i loomist, on vaja uut deployment'i.
Võtit ei saadeta vestlusesse. Uuendaja ei loo teenusekontot ega muuda Verceli seadeid.

See pakett teeb ASUKOHT-1 profiili osa. Järgmine etapp on ASUKOHT-2: uue
kuulutuse, teenuse ja tööpakkumise asukoht ning algväärtus profiilist.
Seejärel ASUKOHT-3: lähimad pakkumised valitud riigi piires; viimaks
ASUKOHT-4: ajutine teenusekoht. Vanade pakkumiste asukohti automaatselt ei täideta.

Konto kustutamise tervik on pooleli ja pausil. Asukoha pakett ei aktiveeri
konto sulgemist, taastamist ega lõppkustutust.

Peatumisel säilib sama töö. Saada selle käigu raport ning lahenda konkreetne
põhjus. Vanu pakette, kinnitamata kirjutusi ega ajalooliste NEXT/CURRENT
pealkirjade käske uuesti ei käivitata. Tööseis on CURRENT_STATE.json ja
sellest genereeritud docs/99_V2_HANDOFF_NEXT_CHAT.md failis.
