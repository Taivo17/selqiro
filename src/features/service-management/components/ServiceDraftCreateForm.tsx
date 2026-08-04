"use client";

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
  saving: boolean;
  onCreate: (
    input: SaveServiceInput
  ) => Promise<Service>;
  onClearError: () => void;
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
  saving,
  onCreate,
  onClearError,
}: ServiceDraftCreateFormProps) {
  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<ServiceDraftForm>(
    createEmptyForm
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
      createEmptyForm()
    );
    setFormError(null);
    setSuccessMessage(null);
  }, [activeIdentityId]);

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
      createEmptyForm()
    );
    setFormError(null);
    onClearError();
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
        `Pealkiri peab olema vähemalt ${SERVICE_TITLE_MIN_LENGTH} tähemärki.`
      );
      return;
    }

    if (
      title.length >
      SERVICE_TITLE_MAX_LENGTH
    ) {
      setFormError(
        `Pealkiri võib olla kuni ${SERVICE_TITLE_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    if (
      description.length >
      SERVICE_DESCRIPTION_MAX_LENGTH
    ) {
      setFormError(
        `Kirjeldus võib olla kuni ${SERVICE_DESCRIPTION_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    if (
      !form.categorySelection
        .category
    ) {
      setFormError(
        "Vali teenuse ülemrubriik."
      );
      return;
    }

    if (
      country.length >
      SERVICE_COUNTRY_MAX_LENGTH
    ) {
      setFormError(
        `Riik võib olla kuni ${SERVICE_COUNTRY_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    if (
      city.length >
      SERVICE_CITY_MAX_LENGTH
    ) {
      setFormError(
        `Linn või piirkond võib olla kuni ${SERVICE_CITY_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    if (
      location.length >
      SERVICE_LOCATION_MAX_LENGTH
    ) {
      setFormError(
        `Asukoha täpsustus võib olla kuni ${SERVICE_LOCATION_MAX_LENGTH} tähemärki.`
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
        "Sisesta valitud hinnatüübi jaoks numbriline hind."
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
        "Teenuse hind ei ole korrektne."
      );
      return;
    }

    try {
      const createdService =
        await onCreate({
          serviceId: null,
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

      setForm(
        createEmptyForm()
      );
      setFormOpen(false);
      setSuccessMessage(
        `Teenus „${createdService.title}” lisati mustandina.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Teenust ei saanud lisada."
      );
    }
  }

  if (!formOpen) {
    return (
      <section className="mt-5 rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Uus teenus
            </p>

            <h3 className="mt-2 break-words text-lg font-black">
              Lisa teenus mustandina
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Mustand on nähtav ainult aktiivse identiteedi haldusvaates.
              Avaldamine lisatakse eraldi järgmises etapis.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            disabled={saving}
            className="inline-flex w-full shrink-0 justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-wait disabled:opacity-50 sm:w-auto"
          >
            Lisa teenus
          </button>
        </div>

        {successMessage ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
          >
            {successMessage}
          </p>
        ) : null}
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
            Uus teenus
          </p>

          <h3 className="mt-2 text-lg font-black">
            Lisa teenus mustandina
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Täida põhiväljad. Pildid, muutmine ja avaldamine tulevad eraldi sammudena.
          </p>
        </div>

        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className="w-full shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm disabled:cursor-wait disabled:opacity-50 sm:w-auto"
        >
          Sulge
        </button>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="min-w-0 sm:col-span-2">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Pealkiri *
          </span>

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
            minLength={
              SERVICE_TITLE_MIN_LENGTH
            }
            maxLength={
              SERVICE_TITLE_MAX_LENGTH
            }
            required
            disabled={saving}
            placeholder="Näiteks Murutraktori hooldus"
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />

          <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
            {form.title.length}/
            {SERVICE_TITLE_MAX_LENGTH}
          </span>
        </label>

        <label className="min-w-0 sm:col-span-2">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Kirjeldus
          </span>

          <textarea
            value={
              form.description
            }
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                description:
                  event.target.value,
              }));
              setFormError(null);
            }}
            maxLength={
              SERVICE_DESCRIPTION_MAX_LENGTH
            }
            rows={5}
            disabled={saving}
            placeholder="Kirjelda, mida teenus sisaldab ja kellele see sobib."
            className="w-full min-w-0 resize-y rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />

          <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
            {form.description.length}/
            {
              SERVICE_DESCRIPTION_MAX_LENGTH
            }
          </span>
        </label>

        <div className="min-w-0 sm:col-span-2">
          <ServiceCategorySelector
            value={
              form.categorySelection
            }
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
            Hinnatüüp
          </span>

          <select
            value={form.priceType}
            onChange={(event) =>
              updatePriceType(
                event.target
                  .value as ServicePriceType
              )
            }
            disabled={saving}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          >
            <option value="contact">
              Hind kokkuleppel
            </option>
            <option value="fixed">
              Fikseeritud hind
            </option>
            <option value="from">
              Alates hinnast
            </option>
            <option value="hourly">
              Tunnitasu
            </option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Hind
          </span>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max={
                SERVICE_PRICE_MAX
              }
              step="0.01"
              value={
                form.priceAmount
              }
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  priceAmount:
                    event.target.value,
                }));
                setFormError(null);
              }}
              required={
                form.priceType !==
                "contact"
              }
              disabled={
                saving ||
                form.priceType ===
                  "contact"
              }
              placeholder={
                form.priceType ===
                  "contact"
                  ? "—"
                  : "0.00"
              }
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
                )
              }
              disabled={saving}
              aria-label="Valuuta"
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
            Riik
          </span>

          <select
            value={form.country}
            onChange={(event) =>
              setForm(
                (current) => ({
                  ...current,
                  country:
                    event.target.value,
                })
              )
            }
            disabled={saving}
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black outline-none disabled:cursor-wait disabled:opacity-60"
          >
            <option value="Estonia">
              Eesti
            </option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Linn või piirkond
          </span>

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
            maxLength={
              SERVICE_CITY_MAX_LENGTH
            }
            disabled={saving}
            placeholder="Näiteks Paide"
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />
        </label>

        <label className="min-w-0 sm:col-span-2">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Asukoha täpsustus
            <span className="normal-case tracking-normal text-neutral-400">
              {" "}
              (valikuline)
            </span>
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
            maxLength={
              SERVICE_LOCATION_MAX_LENGTH
            }
            disabled={saving}
            placeholder="Näiteks Paide piirkond"
            className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Eraisikuna sisesta linn või piirkond, mitte kodu täpne aadress.
          </p>
        </label>
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-4 break-words rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={
            saving ||
            !form.title.trim() ||
            !form.categorySelection
              .category
          }
          className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Lisan..."
            : "Lisa mustand"}
        </button>

        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm disabled:cursor-wait disabled:opacity-50"
        >
          Tühista
        </button>
      </div>
    </form>
  );
}
