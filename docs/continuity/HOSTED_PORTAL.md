# Praegune järgmine samm: ASUKOHT-1B avaliku profiili kaart

28.11.2026. ASUKOHT-1 asukohavalik ja salvestamine on vastu võetud:
commit `af78c7b`, uus paigaldusraport, sama versiooni Ready / Production
ning kasutaja toimimise kinnitus. Kasutaja palus nüüd avaliku profiili
kaardi tööle panna. Uue kaardimuudatuse tootmise vastuvõtt on veel ootel.

1. Paki uus `selqiro-profiili-kaart-20261128.zip` Downloads-kaustas lahti
   ja käivita üks kord:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-kaart-20261128/uuenda.py" --publish
```

2. Saada lõpus näidatud uus JSON-raport. Pärast raporti kontrolli peab sama
   uus commit olema Vercelis **Ready / Production** ning profiilis tuleb
   kontrollida kaardi laadimist, liigutamist/suumimist ning nähtavuse valikuid.

Täpne juhend: [Avaliku profiili kaardi kasutuselevõtt](PROFILE_MAP_INSTALL_20261128.et.md).
Uut API võtit ega asukoha uuesti salvestamist pole vaja. Kaart näitab
kinnitatud asulat või piirkonda; ettevõtte avaliku aadressi jaoks on
eraldi Google Mapsi aadressiotsingu link. Peidetud asukohal kaarti pole.

Pärast selle kaardi vastuvõttu algab ASUKOHT-2: uue
kuulutuse, teenuse ja tööpakkumise asukoht ning algväärtus profiilist.
Seejärel ASUKOHT-3: lähimad pakkumised valitud riigi piires; viimaks
ASUKOHT-4: ajutine teenusekoht. Vanade pakkumiste asukohti automaatselt ei täideta.

Konto kustutamise tervik on pooleli ja pausil. Asukoha pakett ei aktiveeri
konto sulgemist, taastamist ega lõppkustutust.

Peatumisel säilib sama töö. Saada selle käigu raport ning lahenda konkreetne
põhjus. Vanu pakette, kinnitamata kirjutusi ega ajalooliste NEXT/CURRENT
pealkirjade käske uuesti ei käivitata. Tööseis on CURRENT_STATE.json ja
sellest genereeritud docs/99_V2_HANDOFF_NEXT_CHAT.md failis.
