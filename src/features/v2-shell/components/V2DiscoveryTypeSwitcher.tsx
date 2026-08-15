import Link from "next/link";

export type V2DiscoveryType =
  | "products"
  | "services";

type V2DiscoveryTypeSwitcherProps = {
  active: V2DiscoveryType;
};

const ITEM_BASE_CLASS =
  "flex min-h-14 min-w-0 items-center justify-center rounded-[18px] border px-2 py-2 text-center text-sm font-black transition focus-visible:outline-none focus-visible:ring-2";

export default function
V2DiscoveryTypeSwitcher({
  active,
}: V2DiscoveryTypeSwitcherProps) {
  return (
    <nav
      aria-label="Leia sisutüüp"
      className="rounded-[26px] border border-black/5 bg-white p-2 shadow-sm"
    >
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <Link
          href="/v2/products"
          aria-current={
            active === "products"
              ? "page"
              : undefined
          }
          className={[
            ITEM_BASE_CLASS,
            active === "products"
              ? "border-amber-300 bg-amber-100 text-amber-950 shadow-sm focus-visible:ring-amber-500/30"
              : "border-transparent text-neutral-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900 focus-visible:ring-amber-500/30",
          ].join(" ")}
        >
          Tooted
        </Link>

        <Link
          href="/v2/services"
          aria-current={
            active === "services"
              ? "page"
              : undefined
          }
          className={[
            ITEM_BASE_CLASS,
            active === "services"
              ? "border-teal-300 bg-teal-100 text-teal-950 shadow-sm focus-visible:ring-teal-500/30"
              : "border-transparent text-neutral-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 focus-visible:ring-teal-500/30",
          ].join(" ")}
        >
          Teenused
        </Link>

        <span
          aria-disabled="true"
          className="flex min-h-14 min-w-0 cursor-not-allowed items-center justify-center gap-1 rounded-[18px] border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-neutral-400"
        >
          <span className="text-sm font-black">
            Töö
          </span>

          <span className="rounded-full bg-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-neutral-400">
            Tulekul
          </span>
        </span>
      </div>
    </nav>
  );
}
