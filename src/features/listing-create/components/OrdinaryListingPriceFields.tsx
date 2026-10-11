"use client";
import { LISTING_CURRENCIES, getListingCurrency } from "../../../shared/currency/listingCurrencies.generated";
import { LISTING_PRICE_INPUT_HELP, normalizeListingPriceForm, type ListingPriceKind } from "../../../entities/listing/model/listingPriceInput";
import { selectOrdinaryPriceKind, type OrdinaryListingFieldState } from "../model/ordinaryListingFields";

const kinds: readonly { value: ListingPriceKind; label: string }[] = [
  { value: "fixed", label: "Kindel hind" }, { value: "free", label: "Tasuta" },
  { value: "negotiable", label: "Hind kokkuleppel" }, { value: "unspecified", label: "Hinda ei lisa" },
];
type Props = { value: OrdinaryListingFieldState; onChange: (value: OrdinaryListingFieldState) => void };
export default function OrdinaryListingPriceFields({ value, onChange }: Props) {
  const fixed = value.priceKind === "fixed";
  let preview = "", problem = "";
  try {
    const price = normalizeListingPriceForm(value.priceKind, value.amountInput, value.currencyInput);
    preview = price.kind === "fixed" ? `${price.amount.replace(".", ",")} ${price.currency}`
      : kinds.find(kind => kind.value === price.kind)?.label ?? "";
  } catch (error) {
    if (value.amountInput || value.currencyInput) problem = error instanceof Error ? error.message : "Kontrolli hinda.";
  }
  const currency = getListingCurrency(value.currencyInput);
  return (
    <section className="min-w-0 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-price-title">
      <h2 id="ordinary-price-title" className="text-2xl font-black tracking-tight">Hind ja valuuta</h2>
      <label className="mt-5 block text-sm font-bold" htmlFor="ordinary-price-kind">Hinna liik</label>
      <select id="ordinary-price-kind" value={value.priceKind}
        onChange={event => onChange(selectOrdinaryPriceKind(value, event.target.value as ListingPriceKind))}
        className="mt-2 w-full rounded-xl border border-neutral-200 bg-white p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2">
        {kinds.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
      </select>
      {fixed ? <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="block min-w-0 text-sm font-bold" htmlFor="ordinary-price-amount">Summa
          <input id="ordinary-price-amount" type="text" inputMode="decimal" maxLength={64}
            value={value.amountInput} onChange={event => onChange({ ...value, amountInput: event.target.value })}
            placeholder="Näiteks 25,50" aria-describedby="ordinary-price-help ordinary-price-preview"
            aria-invalid={Boolean(problem)}
            className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white p-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2" />
        </label>
        <label className="block min-w-0 text-sm font-bold" htmlFor="ordinary-price-currency">Valuuta
          <select id="ordinary-price-currency" value={value.currencyInput}
            onChange={event => onChange({ ...value, currencyInput: event.target.value })}
            aria-describedby="ordinary-price-help ordinary-price-preview"
            className="mt-2 block w-full min-w-0 rounded-xl border border-neutral-200 bg-white p-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2">
            <option value="">Vali valuuta</option>
            {LISTING_CURRENCIES.map(row => <option key={row.code} value={row.code}>{row.code} — {row.name}</option>)}
          </select>
        </label>
      </div> : null}
      <p id="ordinary-price-help" className="mt-3 text-sm leading-6 text-neutral-600">
        {fixed ? LISTING_PRICE_INPUT_HELP : "Selle hinnaliigi puhul summat ja valuutat ei lisata."}
        {fixed && currency ? ` Lubatud komakohti: ${currency.minorUnits}.` : ""}
      </p>
      <div id="ordinary-price-preview" className="mt-4 break-words rounded-2xl border border-neutral-200 bg-neutral-50 p-4" aria-live="polite">
        {problem ? <p className="text-sm text-amber-900" data-price-problem>{problem}</p>
          : preview ? <><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Sisestatud hind</p>
            <p className="mt-1 text-xl font-black" data-price-preview>{preview}</p></>
          : <p className="text-sm text-neutral-600">Sisesta summa ja vali selle valuuta.</p>}
      </div>
    </section>
  );
}
