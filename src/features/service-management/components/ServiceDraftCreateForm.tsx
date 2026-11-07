"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  EMPTY_SERVICE_CATEGORY_SELECTION,
  type ServiceCategorySelection,
} from "../../../entities/service-category/model/types";
import {
  SERVICE_CITY_MAX_LENGTH,
  SERVICE_COUNTRY_MAX_LENGTH,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_LOCATION_MAX_LENGTH,
  SERVICE_PRICE_MAX,
  SERVICE_TITLE_MAX_LENGTH,
  SERVICE_TITLE_MIN_LENGTH,
  type SaveServiceInput,
  type Service,
  type ServicePriceType,
} from "../../../entities/service/model/types";
import ServiceCategorySelector from "../../service-category-selection/components/ServiceCategorySelector";

type ServiceDraftCreateFormProps = {
  activeIdentityId: string;
  service?: Service | null;
  saving: boolean;
  onSave: (
    input: SaveServiceInput
  ) => Promise<Service>;
  onClearError: () => void;
  onCancelEdit?: () => void;
  onEdited?: (
    service: Service
  ) => void;
};

type ServiceDraftForm = {
  title: string;
  description: string;
  categorySelection:
    ServiceCategorySelection;
  priceType: ServicePriceType;
  priceAmount: string;
  currency: string;
  country: string;
  city: string;
  location: string;
};

function createEmptyForm():
  ServiceDraftForm {
  return {
    title: "",
    description: "",
    categorySelection: {
      ...EMPTY_SERVICE_CATEGORY_SELECTION,
    },
    priceType: "contact",
    priceAmount: "",
    currency: "EUR",
    country: "Estonia",
    city: "",
    location: "",
  };
}

function createServiceForm(
  service?: Service | null
): ServiceDraftForm {
  if (!service) {
    return createEmptyForm();
  }

  return {
    title: service.title,
    description:
      service.description,
    categorySelection: {
      category:
        service.category || "",
      subcategory:
        service.subcategory || "",
    },
    priceType:
      service.priceType,
    priceAmount:
      service.priceAmount === null
        ? ""
        : String(
            service.priceAmount
          ),
    currency:
      service.currency || "EUR",
    country:
      service.country || "Estonia",
    city:
      service.city || "",
    location:
      service.location || "",
  };
}

function normalizeSingleLine(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function parsePriceAmount(
  value: string
): number | null {
  const cleanValue = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!cleanValue) {
    return null;
  }

  const parsedValue =
    Number(cleanValue);

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : null;
}

export default function ServiceDraftCreateForm({
  activeIdentityId,
  service = null,
  saving,
  onSave,
  onClearError,
  onCancelEdit,
  onEdited,
}: ServiceDraftCreateFormProps) {
  const { language, r } = useMarketplaceTranslation();
  const editing =
    service !== null;
  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<ServiceDraftForm>(
    () =>
      createServiceForm(
        service
      )
  );

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    setFormOpen(false);
    setForm(
      createServiceForm(
        service
      )
    );
    setFormError(null);
    setSuccessMessage(null);
  }, [
    activeIdentityId,
    service,
  ]);

  function openForm() {
    setForm(
      createEmptyForm()
    );
    setFormError(null);
    setSuccessMessage(null);
    onClearError();
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setForm(
      createServiceForm(
        service
      )
    );
    setFormError(null);
    onClearError();

    if (editing) {
      onCancelEdit?.();
    }
  }

  function updatePriceType(
    priceType: ServicePriceType
  ) {
    setForm((current) => ({
      ...current,
      priceType,
      priceAmount:
        priceType === "contact"
          ? ""
          : current.priceAmount,
    }));

    setFormError(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const title =
      normalizeSingleLine(
        form.title
      );

    const description =
      form.description.trim();

    const country =
      normalizeSingleLine(
        form.country
      );

    const city =
      normalizeSingleLine(
        form.city
      );

    const location =
      normalizeSingleLine(
        form.location
      );

    setFormError(null);
    setSuccessMessage(null);
    onClearError();

    if (
      title.length <
      SERVICE_TITLE_MIN_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_title_must_contain_at_least_value_characters.154417", { p0: String(SERVICE_TITLE_MIN_LENGTH) })
      );
      return;
    }

    if (
      title.length >
      SERVICE_TITLE_MAX_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_title_can_contain_up_to_value_characters.6b5ca7", { p0: String(SERVICE_TITLE_MAX_LENGTH) })
      );
      return;
    }

    if (
      description.length >
      SERVICE_DESCRIPTION_MAX_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_description_can_contain_up_to_value_characters.69b2ed", { p0: String(SERVICE_DESCRIPTION_MAX_LENGTH) })
      );
      return;
    }

    if (
      !form.categorySelection
        .category
    ) {
      setFormError(
        marketplaceMessage("service.select_the_service_s_parent_category.df0217")
      );
      return;
    }

    if (
      country.length >
      SERVICE_COUNTRY_MAX_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_country_can_contain_up_to_value_characters.0f4b08", { p0: String(SERVICE_COUNTRY_MAX_LENGTH) })
      );
      return;
    }

    if (
      city.length >
      SERVICE_CITY_MAX_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_town_or_region_can_contain_up_to.9ce5fd", { p0: String(SERVICE_CITY_MAX_LENGTH) })
      );
      return;
    }

    if (
      location.length >
      SERVICE_LOCATION_MAX_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_location_details_can_contain_up_to_value.1cbc6f", { p0: String(SERVICE_LOCATION_MAX_LENGTH) })
      );
      return;
    }

    const priceAmount =
      parsePriceAmount(
        form.priceAmount
      );

    if (
      form.priceType !==
        "contact" &&
      priceAmount === null
    ) {
      setFormError(
        marketplaceMessage("service.enter_a_numeric_amount_for_the_selected_price.683a69")
      );
      return;
    }

    if (
      priceAmount !== null &&
      (
        priceAmount < 0 ||
        priceAmount >
          SERVICE_PRICE_MAX
      )
    ) {
      setFormError(
        marketplaceMessage("service.the_service_price_is_invalid.ccff83")
      );
      return;
    }

    try {
      const savedService =
        await onSave({
          serviceId:
            service?.id || null,
          title,
          description,
          category:
            form.categorySelection
              .category,
          subcategory:
            form.categorySelection
              .subcategory,
          priceType:
            form.priceType,
          priceAmount,
          currency:
            form.currency,
          country:
            country || null,
          city:
            city || null,
          location:
            location || null,
        });

      if (editing) {
        onEdited?.(
          savedService
        );
        return;
      }

      setForm(
        createEmptyForm()
      );
      setFormOpen(false);
      setSuccessMessage(
        marketplaceMessage("service.service_value_added_as_a_draft.57ac9e", { p0: String(savedService.title) })
      );
    } catch (error) {
      setFormError(
        safeMarketplaceError(error, editing
            ? marketplaceMessage("service.the_service_draft_could_not_be_saved.1ed4de")
            : marketplaceMessage("service.the_service_could_not_be_added.6d48a9"))
      );
    }
  }

  if (!editing && !formOpen) {
    return (
      <section className="mt-5 rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              {r(marketplaceMessage("service.new_service.df89c6"))}</p>

            <h3 className="mt-2 break-words text-lg font-black">
              {r(marketplaceMessage("service.add_a_service_as_a_draft.734566"))}</h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              {r(marketplaceMessage("service.the_draft_is_visible_only_in_the_active.0048f6"))}</p>
          </div>

          <button
            type="button"
            onClick={openForm}
            disabled={saving}
            className="inline-flex w-full shrink-0 justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-wait disabled:opacity-50 sm:w-auto"
          >
            {r(marketplaceMessage("service.add_service.e84aa1"))}</button>
        </div>

        {r(successMessage ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
          >
            {r(successMessage)}
          </p>
        ) : null)}
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-5 rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {r(editing
              ? marketplaceMessage("service.service_draft.4d9581")
              : marketplaceMessage("service.new_service.df89c6"))}
          </p>

          <h3 className="mt-2 text-lg font-black">
            {r(editing
              ? marketplaceMessage("service.edit_service_draft.bd2b97")
              : marketplaceMessage("service.add_a_service_as_a_draft.734566"))}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("service.complete_the_basic_fields_after_saving_the_draft.ea83d8"))}</p>
        </div>

        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className="w-full shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm disabled:cursor-wait disabled:opacity-50 sm:w-auto"
        >
          {r(marketplaceMessage("service.close.16d9ad"))}</button>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="min-w-0 sm:col-span-2">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("service.title.6a1352"))}</span>

          <input
            value={form.title}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                title:
                  event.target.value,
              }));
              setFormError(null);
            }}
            minLength={SERVICE_TITLE_MIN_LENGTH}
            maxLength={SERVICE_TITLE_MAX_LENGTH}
            required
            disabled={saving}
            placeholder={r(marketplaceMessage("service.for_example_ride_on_mower_maintenance.ca6200"))}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />

          <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
            {r(form.title.length)}/
            {r(SERVICE_TITLE_MAX_LENGTH)}
          </span>
        </label>

        <label className="min-w-0 sm:col-span-2">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("horse.description.8dbc42"))}</span>

          <textarea
            value={form.description}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                description:
                  event.target.value,
              }));
              setFormError(null);
            }}
            maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
            rows={5}
            disabled={saving}
            placeholder={r(marketplaceMessage("service.describe_what_the_service_includes_and_who_it.904dea"))}
            className="w-full min-w-0 resize-y rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />

          <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
            {r(form.description.length)}/
            {r(SERVICE_DESCRIPTION_MAX_LENGTH)}
          </span>
        </label>

        <div className="min-w-0 sm:col-span-2">
          <ServiceCategorySelector
            value={form.categorySelection}
            onChange={(
              categorySelection
            ) => {
              setForm((current) => ({
                ...current,
                categorySelection,
              }));
              setFormError(null);
            }}
            disabled={saving}
            required
          />
        </div>

        <label className="min-w-0">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("service.price_type.d6f274"))}</span>

          <select
            value={form.priceType}
            onChange={(event) =>
              updatePriceType(
                event.target
                  .value as ServicePriceType
              )}
            disabled={saving}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          >
            <option value="contact">
              {r(marketplaceMessage("service.price_by_agreement.299166"))}</option>
            <option value="fixed">
              {r(marketplaceMessage("service.fixed_price.2286ec"))}</option>
            <option value="from">
              {r(marketplaceMessage("service.starting_price.92ca47"))}</option>
            <option value="hourly">
              {r(marketplaceMessage("service.hourly_rate.b315ed"))}</option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("service.price.ee7887"))}</span>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max={SERVICE_PRICE_MAX}
              step="0.01"
              value={form.priceAmount}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  priceAmount:
                    event.target.value,
                }));
                setFormError(null);
              }}
              required={form.priceType !==
                "contact"}
              disabled={saving ||
                form.priceType ===
                  "contact"}
              placeholder={r(form.priceType ===
                  "contact"
                  ? "—"
                  : "0.00")}
              className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            <select
              value={form.currency}
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    currency:
                      event.target.value,
                  })
                )}
              disabled={saving}
              aria-label={r(marketplaceMessage("service.currency.5946b1"))}
              className="min-h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black outline-none disabled:cursor-wait disabled:opacity-60"
            >
              <option value="EUR">
                EUR
              </option>
            </select>
          </div>
        </label>

        <label className="min-w-0">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("service.country.8d7336"))}</span>

          <select
            value={form.country}
            onChange={(event) =>
              setForm(
                (current) => ({
                  ...current,
                  country:
                    event.target.value,
                })
              )}
            disabled={saving}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black outline-none disabled:cursor-wait disabled:opacity-60"
          >
            <option value="Estonia">
              {r(marketplaceMessage("service.estonia.ed7477"))}</option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("service.town_or_region.a66ae4"))}</span>

          <input
            value={form.city}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                city:
                  event.target.value,
              }));
              setFormError(null);
            }}
            maxLength={SERVICE_CITY_MAX_LENGTH}
            disabled={saving}
            placeholder={r(marketplaceMessage("service.for_example_paide.e3ac08"))}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />
        </label>

        <label className="min-w-0 sm:col-span-2">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("service.location_details.6c4b64"))}<span className="normal-case tracking-normal text-neutral-400">
              {r(" ")}
              {r(marketplaceMessage("service.optional.c6075a"))}</span>
          </span>

          <input
            value={form.location}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                location:
                  event.target.value,
              }));
              setFormError(null);
            }}
            maxLength={SERVICE_LOCATION_MAX_LENGTH}
            disabled={saving}
            placeholder={r(marketplaceMessage("service.for_example_paide_area.e36e45"))}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {r(marketplaceMessage("service.as_a_private_person_enter_a_town_or.d6a3fa"))}</p>
        </label>
      </div>

      {r(formError ? (
        <p
          role="alert"
          className="mt-4 break-words rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
        >
          {r(formError)}
        </p>
      ) : null)}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saving ||
            !form.title.trim() ||
            !form.categorySelection
              .category}
          className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {r(saving
              ? marketplaceMessage("service.saving.cf92f2")
              : editing
                ? marketplaceMessage("horse.save_changes.10e8e6")
                : marketplaceMessage("service.add_draft.05d673"))}
        </button>

        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm disabled:cursor-wait disabled:opacity-50"
        >
          {r(marketplaceMessage("service.cancel.a6b940"))}</button>
      </div>
    </form>
  );
}
