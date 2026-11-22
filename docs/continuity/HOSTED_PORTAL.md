# Tööde laadimise ja kättesaadavuse parandus

22.11.2026. Vastu võetud alus on `8c2ee5c`. Eraisiku ja ettevõtte töökuulutused on avalikus otsingus nähtavad ning sulgemine säilitab andmed ja vestluse.

## Mida see pakett muudab

- Minu ala tööloendi ajutise lugemisvea järel tehakse automaatselt üks uus lugemiskatse. Profiili või konto vahetus katkestab vana päringu.
- Avalikult kättesaamatu töö lingil on selgitus sulgemise, peatamise või aegumise võimaluse kohta ning nupp Tagasi vestlustesse.
- Pakkumise salvestamise, sulgemise ja pikendamise toimingud säilivad.

Algse esmakatse tõrke täpne tehniline põhjus ei ole kinnitatud. Parandus katab testitud ajutiste lugemistõrgete taastumise; korduv või muu püsiv viga jätab nähtavaks Proovi uuesti.

## Käivitamine

Ava `selqiro-too-laadimise-parandus-20261122.zip` Downloads-kaustas ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-laadimise-parandus-20261122/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat lähtekoodi, indeksit, remote’i, eelmise eduka käigu originaalraportit ning sõltuvusi. Testide ja build’i järel teeb see commit’i **Recover transient owner job reads and clarify unavailable jobs** ning push’i.

Saada lõpus **SAADA SEE FAIL** juures näidatud raport. Oota Vercelis sama uue commit’i **Ready / Production** tulemust ja värskenda portaali.

## Pärast avaldamist

1. Ava Minu ala tööpakkumised ning vaheta oma eraisiku ja ettevõtte profiili vahel. Mõlema profiili loend peaks avanema oma andmetega.
2. Ava sõnumist olemasolev suletud lume lükkamise pakkumine. Uus selgitus peaks ütlema, et pakkumine ei ole praegu avalikult nähtav, ja pakkuma tagasiteed vestlustesse.
3. Suletud pakkumine peab jääma Minu alale Suletud olekuga ning puuduma aktiivsest avalikust otsingust. Selle kontrollimiseks ei ole vaja pakkumist uuesti avaldada.

Paketi kohalikud API-, React DOM-i ja build’i tõendid on kontrollid-kaustas. Need ei kinnita veel uut Maci käiku ega Verceli tulemust. Kui uuendaja peatub, saada näidatud raport või **PEATATUD** rida; säilita olemasolevad failid ja päevikud.
