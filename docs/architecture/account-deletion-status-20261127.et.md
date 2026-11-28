# Konto kustutamise seis — 27.11.2026

## Vastus kasutajale

Konto kustutamise tervik ei ole veel valmis ning kõik selle eeltingimused pole kaetud. Seni kokku lepitud kontooleku alus ja mitu kaitsemoodulit on vastu võetud. Konto sulgemine, taastamine ja lõplik andmete kustutamine on endiselt eraldi lõpetamata töö.

Asukoha etapiga saab kokkulepitud järjekorras jätkata. Aktiivseks jääb **ASUKOHT-1: ühine riigi/kohavalik ja aktiivse profiili põhiasukoht**. See audit ei ava konto kustutamise teostust uuesti.

## Mis on valmis

- Privaatne kontooleku alus olemasolevatele ja uutele Auth-kontodele ning Minu konto olekuvaade. Puuduv olekurida ei tähenda aktiivset kontot. Praegune leping lubab ainult olekut `active`. Allikad: `docs/architecture/account-state-accepted-20261123.md`; `src/entities/accountLifecycle/model/accountState.ts`.
- Kontooleku kontrollid avaliku profiili, tavakuulutuste, hobusekuulutuste, profiili kuulutuste, teenuste ja töö avalikel lugemistel. Vastuvõtud on vastavates `account-*-accepted-20261123/24.md` dokumentides; täpsed nimed ja räsid on kaasasolevas JSON-is.
- Kontakti, sõnumite, vestluste ja sõnumipiltide kirjutuste kontrollid. Allikad: `docs/architecture/account-contact-write-accepted-20261124.md`; `docs/architecture/account-message-media-accepted-20261124.md`.
- Töökuulutuse neli omaniku toimingut: salvestamine, avaldamine, seisundi muutmine ja aktiivsuse pikendamine. Vastuvõetud commit `2b3407fee17f4d19594ce45647a1739b26249835`; kasutaja kinnitas muudatuse salvestamise toimimist. Allikas: `docs/architecture/account-job-write-accepted-20261126.md`.

Need on tulevase sulgemise alused. Aktiivse konto edukas sõnumi- või pildisaatmine ega iseendale saatmise tõkestus ei tõenda konto sulgemise, taastamise või lõppkustutamise toimimist. Praegune `AccountSettingsPage.tsx` kuvab aktiivset kontot; seal ei ole sulgemise või taastamise tegevust.

## Mis jääb konto sulgemise ja taastamise eel teha

Viimane vastu võetud kirjutuskaitse dokument loetleb allesjäänud tööd: muud tegelikud kuulutuste, teenuste, hobuste ja profiili muutmisteed ning meedia lõppkinnitused; jälgimise, pakkuja valikute ja vana avastamisvoo ülevaatus; seejärel värske autentimine, vanade sessioonide tõkestamine ning teadlik sulgemis- ja taastamisvoog. Allikas: `docs/architecture/account-job-write-fence-v1.md`, lõpetamata kontoelutsükli töö lõik.

Lisaks tuleb siduda olekuüleminekud, pooleliolevad toimingud, korduskatsed ja taastamise tähtaeg ning kontrollida tegelikku tervikteekonda. Varasem 30-päevane taastamisaken on tooteplaan, mitte praegu käivitatud funktsioon. Allikad: `docs/architecture/account-lifecycle-server-contract-v1.md`; `docs/architecture/account-lifecycle-verification-plan-v1.md`; `docs/architecture/launch-profile-privacy-plan.md`.

## Lõplik kustutamine on eraldi etapp

Vaja on andmeliigipõhist otsust sõnumite, manuste, identifikaatorite, finants-/Energy-kirjete, auditijälgede ja varukoopiate kohta; selle otsuse järgi töötavat kustutamise protsessi; ning selget lõpetamise tõendit. Praegused kontrollid seda protsessi ei teosta. Authi, andmebaasi ja failisalvestuse kustutamine peab moodustama kontrollitud terviku. Allikas: `docs/architecture/account-lifecycle-verification-plan-v1.md`, „Separate gates before final erasure”.

## E-post ja autentimine

E-posti aktiveerimine ning ette valmistatud Auth-lahenduse kasutuselevõtt on kokkuleppel pausil kuni `selqiro.com` kasutuselevõtuni. Enne väliseid testijaid või avalikku registreerimist tuleb päriselt kontrollida saatmist, konto kinnitamist ja parooli taastamist. See kehtib ka siis, kui esmalt kasutatakse `vercel.app` aadressi.

SMTP ei takista asukoha arendamist ega sulgemislepingu ettevalmistamist. Sulgemise aktiveerimise eel on siiski vajalik serveris kontrollitud värske sama konto autentimine; kinnitatud e-posti märge üksi seda ei asenda. Allikas: `docs/architecture/account-model-lifecycle-20261122.md`, konto loomise ja SMTP sõltuvuste osa; praegune ette valmistatud `docs/continuity/CURRENT_STATE.json`, „boundaries”.

## Järjepidevus ja tõendipiir

- Üks aktiivne töö jääb ASUKOHT-1. Uus profiili asukoha kirjutus peab kontrollima tegelikku omanikku ja aktiivset kontot. Senine `profile_editor_private.lock_owner` kontrollib omanikku ning profiili/identiteedi olekut, kuid selle vaadatud teostuses ei ole konto `account_is_available` kontrolli. Seda konto kontrolli ei loeta juba tehtuks; uus tee peab selle saama. Juba kinnitatud kaitseid ei nõrgestata. Allikas: `supabase/repairs/20261120_profile_editor/apply.sql`, `profile_editor_private.lock_owner`.
- Kolm kasutaja kontot ja nende sisu säilivad; neid ei kasutata kustutamise katseandmetena.
- Alus on vastu võetud commit `7c53643012545c7dfa99ba976e6f2613e3c3a201`. Kõik 18 viidatud lähtefaili sobivad SHA256 järgi selle vastuvõtu inventuuriga.
- Tõendid on kohalik lähtekood ja varasemad vastuvõtudokumendid. Uut tootmise seisundit ei küsitud; rakenduse teste, buildi, Git-käske, SQL-i ega elutsükli toiminguid ei käivitatud.
- Vastu võetud lähtepuud ja kanoonilist üleandmist ei muudetud. Ette valmistatud CURRENT_STATE on kehtiv tööjärje juhis, kuid ei kuulu veel vastu võetud Git-puusse.
