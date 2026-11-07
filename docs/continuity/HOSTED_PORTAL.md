# Fotode kiirendus — olemasoleva portaali uuendus

Seis: 06.11.2026 Europe/Tallinn. Üks autoriteetne seis on
[CURRENT_STATE.json](CURRENT_STATE.json).

## Mida see samm teeb

Foto lisamine ja avalik nähtavus on kasutaja poolt vastu võetud. Uus hinnang
ühe foto lisamisele on 27–31 sekundit. See pakett vähendab suurte fotode
üleslaadimise mahtu brauseris ning lisab piiratud etappide ajamõõtmise.
Sama ettevalmistus teenindab uue kuulutuse loomist ja hilisemat foto lisamist.
Serveri õiguste, faili ja lõpptulemuse kontrollid säilivad.

Uus pakett on **selqiro-fotode-kiirendus-20261106.zip**. Varem väljastatud
foto lisamise paketti ega selle paigaldajat ei käivitata uuesti.

## Üks jätkamiskäsk

1. Laadi uus ZIP Maci Downloads-kausta ja paki lahti. Seal peab tekkima
   `selqiro-fotode-kiirendus-20261106` kaust, mille sees on `uuenda.py`.
2. Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-fotode-kiirendus-20261106/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevaid edukaid raporteid ja tegelikku Giti seisu,
sealhulgas täpset lähtepuud, haru, HEAD-i, tööpuud/indexit ja kinnitatud
remote'i. Raportist leitav commit kontrollitakse sõltumatult. Siht on senine
`/Users/taivo/selqiro`; uut hoidlat ega worktree'd ei looda.

See uuendaja rakendab ainult lähtekoodi, teeb vajaliku build'i ja loob ning
push'ib ühe kontrollitud commit'i. SQL-i, Supabase CLI-d ega Storage'i
paigaldamisel ei käivitata. Kasutaja päevikud ja kõrvalised muudatused säilivad.
`PEATATUD` korral saada täpne rida ja raport; ära muuda räsikaitset ega kustuta
päevikuid. Sama eduka sammu jätkamine ei korda kinnitatud build'i või push'i.

## Üks tootmise võrdlus

Pärast uuendaja edukat lõppu vaata Vercelis **sama uue commit'i Production
Ready** tulemust ja värskenda portaali. Lisa samal seadmel ning ühendusel
võimalusel sama algne foto, millega varasem 27–31 sekundi hinnang tekkis.
Võrdle aega nupuvajutusest foto nähtavale ilmumiseni. Märgi ka algfaili maht,
kui see on kohe näha; terve testiseeria kordamine pole vajalik.

Lokaalses katses vähenes ühe 7,14 MB JPEG-i saatmismaht ligikaudu 0,99 MB-ni.
See on sünteetilise võrdlusfaili tulemus. Tootmise kogukestust pole pärast
parandust mõõdetud ja kindlat sekundite arvu ei lubata.

Kui kogukestus jääb pikaks, aitavad brauseri piiratud `performance.measure`
ja vastuse `Server-Timing` eristada üleslaadimist, serveri lugemist/töötlust,
salvestamist ja kinnitamist. Mõõtmise jaoks ei lisandu kasutajale tehnilist
paneeli, uut telemeetriateenust ega fotode sisu logimist.

## Säiliv avaliku avamise töö

Koristuse testpaneelide nähtavus jääb selles sammus seniseks. Automaatne
lõpetamine ilma omaniku avatud leheta ja tehniliste koristusnuppude/loendurite
eemaldamine tavavaatest tuleb lõpetada enne avalikku avamist.
