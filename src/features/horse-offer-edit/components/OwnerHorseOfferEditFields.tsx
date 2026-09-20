import HorseOfferBasicFields from "../../listing-create/components/HorseOfferBasicFields";
import HorseOfferDisclosureFields from "../../listing-create/components/HorseOfferDisclosureFields";
import HorseOfferLocationFields from "../../listing-create/components/HorseOfferLocationFields";
import HorseOfferPriceFields from "../../listing-create/components/HorseOfferPriceFields";
import HorseOfferUseFields from "../../listing-create/components/HorseOfferUseFields";
import { applyHorseOfferPriceFieldChange } from "../../listing-create/model/horseOfferPriceFields";
import { applyHorseOfferLocationFieldChange } from "../../listing-create/model/horseOfferLocationFields";
import type { OwnerHorseDraftForm } from "../model/ownerHorseDraftForm";

type Props = {
  form: OwnerHorseDraftForm;
  disabled: boolean;
  locationLocked: boolean;
  onChange: (edit: (form: OwnerHorseDraftForm) => OwnerHorseDraftForm) => void;
};
export default function OwnerHorseOfferEditFields({ form, disabled, locationLocked, onChange }: Props) {
  return (
    <fieldset disabled={disabled} aria-disabled={disabled} className="space-y-6 disabled:cursor-not-allowed [&_input]:disabled:opacity-100 [&_select]:disabled:opacity-100 [&_textarea]:disabled:opacity-100">
      <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-2xl font-black tracking-tight">Pealkiri ja kirjeldus</h2>
        <div className="mt-5 grid gap-4">
          <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">Pealkiri</span>
            <input type="text" value={form.title} maxLength={140} onChange={e => onChange(f => ({ ...f, title: e.target.value }))}
              className="mt-3 w-full bg-transparent text-base font-bold outline-none" />
          </label>
          <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">Kirjeldus</span>
            <textarea value={form.description} maxLength={5000} rows={6} onChange={e => onChange(f => ({ ...f, description: e.target.value }))}
              className="mt-3 w-full resize-y bg-transparent text-base leading-7 outline-none" />
          </label>
        </div>
      </section>
      <HorseOfferBasicFields offerType={form.offerType} value={form.basicFields}
        onChange={(field, value) => onChange(f => ({ ...f, basicFields: { ...f.basicFields, [field]: value } }))} />
      <HorseOfferUseFields offerType={form.offerType} value={form.useFields}
        onSpecificChange={(field, value) => onChange(f => ({ ...f, useFields: { ...f.useFields, specific: { ...f.useFields.specific, [field]: value } } }))}
        onWantedChange={(field, value) => onChange(f => ({ ...f, useFields: { ...f.useFields, wanted: { ...f.useFields.wanted, [field]: value } } }))} />
      <HorseOfferDisclosureFields offerType={form.offerType} value={form.disclosureFields}
        onSpecificChange={(field, value) => onChange(f => ({ ...f, disclosureFields: { ...f.disclosureFields, specific: { ...f.disclosureFields.specific, [field]: value } } }))}
        onWantedChange={(field, value) => onChange(f => ({ ...f, disclosureFields: { ...f.disclosureFields, wanted: { ...f.disclosureFields.wanted, [field]: value } } }))} />
      <HorseOfferPriceFields offerType={form.offerType} value={form.priceFields}
        onChange={change => onChange(f => ({ ...f, priceFields: applyHorseOfferPriceFieldChange(f.priceFields, change) }))} />
      <div>
        {locationLocked ? <p role="note" className="mb-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6">
          Pakkumisel on täpne privaatne asukoht. Linna ja piirkonna muutmine vajab eraldi asukohatööriista ning on siin lukus. Teisi lubatud välju saad muuta; privaatne asukoht säilib.
        </p> : null}
        <fieldset disabled={locationLocked} aria-disabled={locationLocked}>
          <HorseOfferLocationFields offerType={form.offerType} value={form.locationFields}
            onChange={change => onChange(f => ({ ...f, locationFields: applyHorseOfferLocationFieldChange(f.locationFields, change) }))} />
        </fieldset>
      </div>
    </fieldset>
  );
}
