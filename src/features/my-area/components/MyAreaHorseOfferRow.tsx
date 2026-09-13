import type {
  MyAreaHorseOfferMarketplaceItemRow,
} from "../model/myAreaMarketplaceItemRow";

type MyAreaHorseOfferRowProps = {
  item: MyAreaHorseOfferMarketplaceItemRow;
};

function getStatusClasses(
  lifecycleStatus:
    MyAreaHorseOfferMarketplaceItemRow["lifecycleStatus"]
): string {
  if (lifecycleStatus === "active") {
    return (
      "border-emerald-200 bg-emerald-50 "
      + "text-emerald-700"
    );
  }

  if (lifecycleStatus === "paused") {
    return (
      "border-amber-200 bg-amber-50 "
      + "text-amber-800"
    );
  }

  return (
    "border-zinc-200 bg-zinc-50 "
    + "text-zinc-600"
  );
}

export default function MyAreaHorseOfferRow({
  item,
}: MyAreaHorseOfferRowProps) {
  const meta = [
    item.subcategory,
    item.locationLabel,
  ].filter(Boolean).join(" · ");

  const title =
    item.title || "Pealkirjata hobusepakkumine";

  const readOnlyExplanation =
    "Detail, muutmine ja staatuse tegevused "
    + "lisanduvad eraldi.";

  return (
    <article
      className={[
        "grid gap-3 border-t border-zinc-200 py-3.5",
        "first:border-t-0",
        "md:grid-cols-[minmax(0,1fr)_90px_120px]",
        "md:items-center",
      ].join(" ")}
      data-content-id={item.contentId}
      data-content-type="horse_offer"
    >
      <div className="flex min-w-0 items-center gap-3 md:pl-2">
        {item.imageUrl ? (
          <img
            alt=""
            className={[
              "h-16 w-28 flex-none rounded-xl",
              "bg-zinc-100 object-cover",
            ].join(" ")}
            src={item.imageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className={[
              "flex h-16 w-28 flex-none items-center",
              "justify-center rounded-xl bg-zinc-100",
              "text-sm font-semibold text-zinc-500",
            ].join(" ")}
          >
            Hobune
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center">
            <span
              className={[
                "max-w-full truncate whitespace-nowrap",
                "rounded-full border border-amber-200",
                "bg-amber-50 px-2 py-0.5 text-[10px]",
                "font-semibold uppercase tracking-[0.08em]",
                "text-amber-900",
              ].join(" ")}
            >
              Hobusepakkumine
            </span>
          </div>

          <h3
            className="truncate text-base font-semibold text-zinc-950"
            title={title}
          >
            {title}
          </h3>

          {meta ? (
            <p
              className="mt-0.5 truncate text-sm text-zinc-500"
              title={meta}
            >
              {meta}
            </p>
          ) : null}

          {item.daysLeft !== null ? (
            <p className="mt-0.5 text-xs text-zinc-400">
              {item.daysLeft} päeva jäänud
            </p>
          ) : null}
        </div>
      </div>

      <p className="whitespace-nowrap text-sm font-semibold text-zinc-900 md:text-right">
        {item.priceLabel}
      </p>

      <div className="flex flex-col items-stretch gap-1 md:items-end">
        <span
          className={[
            "inline-flex min-w-24 justify-center rounded-full",
            "border px-3 py-1.5 text-xs font-semibold",
            getStatusClasses(item.lifecycleStatus),
          ].join(" ")}
        >
          {item.statusLabel}
        </span>
        <span
          className="text-center text-[11px] text-zinc-400 md:text-right"
          title={readOnlyExplanation}
        >
          Ainult vaade
        </span>
      </div>
    </article>
  );
}
