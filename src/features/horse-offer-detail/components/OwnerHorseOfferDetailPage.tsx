"use client";

import Link from "next/link";
import { getOwnerHorsePresentation } from "../../../entities/horse-offer/model/ownerPresentation";
import { useOwnerHorseOfferDetail } from "../model/useOwnerHorseOfferDetail";
import { OWNER_HORSE_KIND_LABELS, OWNER_HORSE_STATUS_LABELS, formatOwnerHorseDate, getOwnerHorseStatusClassName } from "../model/ownerHorseDetailLabels";
import { OwnerHorseDetailCard as Card, OwnerHorseDetailValues as Values } from "./OwnerHorseDetailCard";

export default function OwnerHorseOfferDetailPage({ offerId }: { offerId: string }) {
  const { detail, errorMessage, isLoading, isNotFound, reload } = useOwnerHorseOfferDetail(offerId);
  if (isLoading) return <div className="mx-auto w-full max-w-6xl py-7" role="status">
    <p>Laen hobusepakkumist…</p>
    <div aria-hidden="true" className="mt-5 h-96 animate-pulse rounded-[28px] bg-zinc-200" />
  </div>;
  if (!detail) return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-6 text-center shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold">{isNotFound ? "Hobusepakkumist ei leitud" : "Hobusepakkumist ei saanud laadida"}</h1>
      <p className="mt-4 text-sm leading-6 text-zinc-600" role="status">
        {isNotFound ? "Pakkumist ei ole olemas või see ei kuulu praegu aktiivsele identiteedile." : errorMessage || "Laadimisel tekkis ootamatu viga."}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {!isNotFound ? <button type="button" onClick={reload} className="rounded-full border px-5 py-3 text-sm font-semibold">Proovi uuesti</button> : null}
        <Link href="/v2/my-area" className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">Tagasi Minu alasse</Link>
      </div>
    </div>
  );
  const view = getOwnerHorsePresentation(detail);
  const title = detail.title.trim() || (!view.isWanted && detail.horseName?.trim()) || "Pealkirjata hobusepakkumine";
  const kind = OWNER_HORSE_KIND_LABELS[detail.offerType] || detail.offerType;
  const status = OWNER_HORSE_STATUS_LABELS[detail.status] || detail.status;
  const isDraft = detail.status === "draft";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl pb-8" data-owner-horse-offer-id={detail.offerId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/v2/my-area" className="text-sm font-semibold text-zinc-600 hover:text-zinc-950">← Tagasi Minu alasse</Link>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">Omanikuvaade · ainult sulle</p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-zinc-600">{kind} · {view.isWanted ? `${view.locationHeading}: ` : ""}{view.locationLabel}</p>
        </div>
        <span className={`inline-flex h-fit w-fit shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${getOwnerHorseStatusClassName(detail.status)}`}>{status}</span>
      </div>
      <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        {isDraft ? "Siin näed salvestatud mustandit. Teksti ja lubatud andmeid saad muuta nupuga „Muuda mustandit”. Salvestamine ei avalda kuulutust."
          : "Siin näed salvestatud pakkumist. See ei ole mustand; sisu ja staatust selles vaates muuta ei saa."}
      </div>
      {view.warning ? <p role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">{view.warning}</p> : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <Card eyebrow="Hobusepakkumine" title="Põhiinfo">
            <div className="overflow-hidden rounded-[22px] border border-black/8 bg-zinc-100">
              {detail.imageUrl ? <img src={detail.imageUrl} alt={title} className="aspect-[4/3] w-full object-contain" />
                : <div className="flex aspect-[4/3] items-center justify-center text-sm text-zinc-500">Pilt puudub</div>}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-2xl font-semibold">{view.priceLabel}</p>
              <p className="text-xs text-zinc-500">{detail.images.length === 1 ? "1 pilt" : `${detail.images.length} pilti`}</p>
            </div>
            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-700">{detail.description.trim() || "Kirjeldus on lisamata."}</p>
          </Card>
          <Card eyebrow={view.isWanted ? "Otsija eelistused" : "Hobuse andmed"} title={view.isWanted ? "Soovitud hobune" : "Põhiomadused"}>
            <Values fields={view.basics} columns empty={view.isWanted ? "Eelistusi ei ole lisatud." : "Põhiandmeid ei ole lisatud."} />
          </Card>
          <Card eyebrow={view.isWanted ? "Otsija eelistused" : "Kasutus ja sobivus"} title={view.isWanted ? "Soovitud kasutus ja väljaõpe" : "Treening ja sobivus"}>
            <Values fields={view.use} empty={view.isWanted ? "Kasutuse ja väljaõppe eelistusi ei ole lisatud." : "Kasutuse ja väljaõppe infot ei ole lisatud."} />
          </Card>
          <Card eyebrow={view.isWanted ? "Otsija eelistused" : "Avaldaja kirjeldus"} title={view.isWanted ? "Tervise ja käitumise eelistused" : "Tervis ja käitumine"}>
            <Values fields={view.disclosures} empty={view.isWanted ? "Tervise ja käitumise eelistusi ei ole lisatud." : "Tervise- ja käitumisinfot ei ole lisatud."} />
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              {view.isWanted ? "Need on otsija eelistused, mitte konkreetse hobuse omadused ega Selqiro hinnang."
                : "Need on avaldaja sisestatud andmed, mitte Selqiro kontrollitud hinnang. Terviseinfo ei asenda sõltumatut veterinaarset hinnangut."}
            </p>
          </Card>
        </div>
        <aside className="min-w-0 space-y-6">
          <Card eyebrow="Kokkuvõte" title="Pakkumise seis">
            <Values empty="" fields={[
              { label: "Pakkumise liik", value: kind }, { label: "Staatus", value: status },
              { label: view.priceHeading, value: view.priceLabel }, { label: view.locationHeading, value: view.locationLabel },
              { label: "Aktiivne kuni", value: formatOwnerHorseDate(detail.activeUntil) },
            ]} />
          </Card>
          <Card eyebrow="Omaniku metaandmed" title="Ajalugu">
            <Values empty="" fields={[
              { label: "Loodud", value: formatOwnerHorseDate(detail.createdAt) },
              { label: "Viimati muudetud", value: formatOwnerHorseDate(detail.updatedAt) },
              { label: "Pakkumise ID", value: detail.offerId },
            ]} />
          </Card>
          <div className="rounded-[28px] border border-black/10 bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">{isDraft ? "Mustandi haldamine" : "Pakkumise andmed"}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {isDraft ? "Muuda mustandi teksti ja andmeid. Avaldamine, staatuse muutmine, rubriigid ja pildihaldus ei ole veel ühendatud."
                : "See pakkumine ei ole mustand. Selle andmed avanevad ainult vaatamiseks."}
            </p>
            <Link href={`/v2/my-area/horse-offers/${encodeURIComponent(detail.offerId)}/edit`}
              className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100">
              {isDraft ? "Muuda mustandit" : "Ava andmete vaade"}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
