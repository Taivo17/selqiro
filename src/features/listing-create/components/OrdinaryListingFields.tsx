"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { ORDINARY_CONDITIONS, type OrdinaryListingFieldState } from "../model/ordinaryListingFields";
import OrdinaryListingCategoryFields from "./OrdinaryListingCategoryFields";
import OrdinaryListingPriceFields from "./OrdinaryListingPriceFields";
import OrdinaryListingLocationFields from "./OrdinaryListingLocationFields";
import OrdinaryListingDetailFields from "./OrdinaryListingDetailFields";
import OrdinaryListingPreview from "./OrdinaryListingPreview";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";

type Props = { value: OrdinaryListingFieldState; onChange: (value: OrdinaryListingFieldState) => void;
  title: string; description: string };
export default function OrdinaryListingFields({ value, onChange, title, description }: Props) {
  const { language, t } = useV2Translation(listingCreateMessages);

  return (
    <div className="min-w-0 space-y-6" data-ordinary-listing-fields>
      <OrdinaryListingCategoryFields value={value} onChange={onChange} />
      <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-condition-title">
        <h2 id="ordinary-condition-title" className="text-2xl font-black tracking-tight">{t("condition")}</h2>
        <label htmlFor="ordinary-condition" className="mt-3 block text-sm text-neutral-600">{t("chooseItemCondition")}</label>
        <select id="ordinary-condition" value={value.condition}
          onChange={event => onChange({ ...value, condition: event.target.value as OrdinaryListingFieldState["condition"] })}
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-white p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2">
          <option value="">{t("chooseCondition")}</option>
          {ORDINARY_CONDITIONS.map(option => <option key={option.value} value={option.value}>{t(({ new: "conditionNew", used: "conditionUsed", damaged: "conditionDamaged" } as const)[option.value])}</option>)}
        </select>
      </section>
      <OrdinaryListingPriceFields value={value} onChange={onChange} />
      <OrdinaryListingLocationFields value={value} onChange={onChange} />
      <OrdinaryListingDetailFields value={value} onChange={onChange} />
      {!v2IntegrationEnabled() && <OrdinaryListingPreview value={value} title={title} description={description} />}
    </div>
  );
}
